// Pruebas de `darDeAltaEmpresaDesdeServidor` (0.11.0): el cliente del endpoint
// `altaEmpresaServidor` de Identity, para los backends de la suite que dan de
// alta una empresa sin sesión de usuario (hoy, el generador de comisiones de
// SaluFirst en SaluFact). Misma forma que `darDeAltaPacienteDesdeServidor`:
// ID token del servidor de metadatos (sin claves) con audiencia = la URL, POST
// con `{app, clinicaId, datos}`, y una empresa que ya existe NO es error.
//
// Sin red: `fetch` es un doble.
//
//   npm test   (compila y ejecuta)

const test = require('node:test');
const assert = require('node:assert/strict');

const URL_ALTA = 'https://europe-west1-identity-44874.cloudfunctions.net/altaEmpresaServidor';

function conFetch(respuestas) {
  const llamadas = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), opciones });
    const r = respuestas(String(url), opciones);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => (typeof r.cuerpo === 'string' ? r.cuerpo : JSON.stringify(r.cuerpo)),
      json: async () => (typeof r.cuerpo === 'string' ? JSON.parse(r.cuerpo) : r.cuerpo),
    };
  };
  return { llamadas, restaurar: () => { globalThis.fetch = original; } };
}

const servidor = () => require('../dist-cjs/servidor/index.js');

test('se exporta desde la entrada de servidor (CommonJS)', () => {
  assert.equal(typeof servidor().darDeAltaEmpresaDesdeServidor, 'function');
});

test('pide un ID token al servidor de metadatos con audiencia = la URL de Identity y lo manda como Bearer, con {app, clinicaId, datos}', async () => {
  const f = conFetch((url) => (url.startsWith('http://metadata.google.internal')
    ? { status: 200, cuerpo: 'tok.en.firma' }
    : { status: 200, cuerpo: { creada: true, empresaId: 'e1', cif: 'B12345674', tipoIdentificador: 'NIF' } }));
  try {
    const datos = { cif: 'B12345674', nombre: 'Centro SL', direccion: { pais: 'España' } };
    const r = await servidor().darDeAltaEmpresaDesdeServidor('salufirst-comisiones', 'emisor1', datos);
    assert.deepEqual(r, { creada: true, empresaId: 'e1', cif: 'B12345674', tipoIdentificador: 'NIF' });
    assert.equal(f.llamadas.length, 2);
    const meta = f.llamadas[0];
    assert.ok(meta.url.includes(`audience=${encodeURIComponent(URL_ALTA)}`), meta.url);
    assert.equal(meta.opciones.headers['Metadata-Flavor'], 'Google');
    const post = f.llamadas[1];
    assert.equal(post.url, URL_ALTA);
    assert.equal(post.opciones.method, 'POST');
    assert.equal(post.opciones.headers.Authorization, 'Bearer tok.en.firma');
    assert.deepEqual(JSON.parse(post.opciones.body), { app: 'salufirst-comisiones', clinicaId: 'emisor1', datos });
  } finally { f.restaurar(); }
});

test('una empresa que ya existe NO es error: devuelve {creada:false, empresaId, enSuClinica} para que quien llama la vincule', async () => {
  const f = conFetch((url) => (url.startsWith('http://metadata')
    ? { status: 200, cuerpo: 't' }
    : { status: 200, cuerpo: { creada: false, empresaId: 'e9', enSuClinica: false } }));
  try {
    const r = await servidor().darDeAltaEmpresaDesdeServidor('salufact', 'c1', { cif: 'B12345674', nombre: 'X' });
    assert.deepEqual(r, { creada: false, empresaId: 'e9', enSuClinica: false });
  } finally { f.restaurar(); }
});

test('si Identity rechaza los datos, lanza con SU motivo (frase para el usuario)', async () => {
  const f = conFetch((url) => (url.startsWith('http://metadata')
    ? { status: 200, cuerpo: 't' }
    : { status: 400, cuerpo: { error: 'El carácter de control del NIF no corresponde: debería terminar en 4, no en 8.' } }));
  try {
    await assert.rejects(
      servidor().darDeAltaEmpresaDesdeServidor('salufact', 'c1', { cif: 'B12345678', nombre: 'X' }),
      /carácter de control/,
    );
  } finally { f.restaurar(); }
});

test('sin servidor de metadatos (fuera de Google Cloud) falla con un mensaje claro y no llama a Identity', async () => {
  const f = conFetch(() => ({ status: 404, cuerpo: '' }));
  try {
    await assert.rejects(servidor().darDeAltaEmpresaDesdeServidor('salufact', 'c1', { cif: 'B12345674', nombre: 'X' }), /identidad del servidor/);
    assert.equal(f.llamadas.length, 1);
  } finally { f.restaurar(); }
});
