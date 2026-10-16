// Pruebas de lo nuevo de `/servidor` en 0.12.0 (16-10-2026, «todo canónico»):
//
//   - `vincularEmpresaEnIdentity`: QUÉ significa vincular una EMPRESA a una
//     clínica. La usan los endpoints de Identity (`vincularEmpresaCanonica` y
//     `vincularEmpresaServidor`). Como la de pacientes: la clínica y las que
//     heredan de ella, `updatedAt`, idempotente.
//   - Los clientes de los endpoints de servidor de Identity para los backends
//     sin sesión de usuario (SaluFact): vincular y actualizar una empresa,
//     crear y actualizar un tenant, y conceder o retirar el acceso a una app.
//     Misma puerta que las altas de servidor: ID token del servidor de
//     metadatos (sin claves) con audiencia = la URL.
//
// Sin red: `fetch` es un doble; Firestore, un doble en memoria.
//
//   npm test   (compila y ejecuta)

const test = require('node:test');
const assert = require('node:assert/strict');

const S = () => require('../dist-cjs/servidor/index.js');
const BASE = 'https://europe-west1-identity-44874.cloudfunctions.net';

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

const metadatosY = (cuerpo, status = 200) => (url) => (url.startsWith('http://metadata.google.internal')
  ? { status: 200, cuerpo: 'tok.en.firma' }
  : { status, cuerpo });

/** Firestore mínimo en memoria (doc/get/update con rutas planas y arrayUnion de quien llama). */
function dobleDb(inicial) {
  const docs = new Map(Object.entries(inicial));
  const escrituras = [];
  return {
    docs, escrituras,
    collection: (col) => ({
      doc: (id) => ({
        async get() { const d = docs.get(`${col}/${id}`); return { exists: !!d, data: () => d }; },
        async update(parche) {
          escrituras.push({ ruta: `${col}/${id}`, parche });
          const d = { ...docs.get(`${col}/${id}`) };
          for (const [k, v] of Object.entries(parche)) {
            d[k] = v && v.__union ? [...new Set([...(d[k] || []), ...v.__union])] : v;
          }
          docs.set(`${col}/${id}`, d);
        },
      }),
    }),
  };
}
const arrayUnion = (...v) => ({ __union: v });

// ── vincularEmpresaEnIdentity ───────────────────────────────────────────────

test('vincularEmpresaEnIdentity: añade la clínica y sus heredadas, sube updatedAt y no toca lo demás', async () => {
  const db = dobleDb({
    'empresas/e1': { nombre: 'Proveedor SL', clinicaIds: ['otra'], cuentasBancarias: [{ iban: 'X' }] },
    'tenants/c1': { tenantsHeredados: ['c2'] },
  });
  const r = await S().vincularEmpresaEnIdentity(db, arrayUnion, 'e1', 'c1');
  assert.deepEqual(r, { yaVinculada: false, clinicas: ['c1', 'c2'] });
  const d = db.docs.get('empresas/e1');
  assert.deepEqual(d.clinicaIds, ['otra', 'c1', 'c2']);
  assert.ok(d.updatedAt instanceof Date, 'sin updatedAt la empresa se cae del delta de los buscadores');
  assert.deepEqual(Object.keys(db.escrituras[0].parche).sort(), ['clinicaIds', 'updatedAt']);
});

test('vincularEmpresaEnIdentity: idempotente (ya vinculada → no escribe) y una empresa que no existe es error', async () => {
  const db = dobleDb({ 'empresas/e1': { clinicaIds: ['c1'] } });
  const r = await S().vincularEmpresaEnIdentity(db, arrayUnion, 'e1', 'c1');
  assert.equal(r.yaVinculada, true);
  assert.equal(db.escrituras.length, 0);
  await assert.rejects(S().vincularEmpresaEnIdentity(db, arrayUnion, 'nada', 'c1'), /no existe/i);
});

// ── Clientes de los endpoints de servidor ───────────────────────────────────

const CASOS = [
  {
    nombre: 'vincularEmpresaDesdeServidor', endpoint: 'vincularEmpresaServidor',
    llamar: () => S().vincularEmpresaDesdeServidor('salufact', 'c1', 'e1'),
    cuerpo: { app: 'salufact', clinicaId: 'c1', empresaId: 'e1' },
  },
  {
    nombre: 'actualizarEmpresaDesdeServidor', endpoint: 'actualizarEmpresaServidor',
    llamar: () => S().actualizarEmpresaDesdeServidor('salufirst-comisiones', 'c1', 'e1', { direccion: { calle: 'Mayor 1', pais: 'España' } }),
    cuerpo: { app: 'salufirst-comisiones', clinicaId: 'c1', empresaId: 'e1', datos: { direccion: { calle: 'Mayor 1', pais: 'España' } } },
  },
  {
    nombre: 'crearTenantDesdeServidor', endpoint: 'crearTenantServidor',
    llamar: () => S().crearTenantDesdeServidor('salufact', { nombre: 'Empresa SL', cif: 'B12345674' }, { tenantId: 't1', actuaPor: 'pSuper' }),
    cuerpo: { app: 'salufact', tenantId: 't1', actuaPor: 'pSuper', datos: { nombre: 'Empresa SL', cif: 'B12345674' } },
  },
  {
    nombre: 'actualizarTenantDesdeServidor', endpoint: 'actualizarTenantServidor',
    llamar: () => S().actualizarTenantDesdeServidor('factronia', 't1', { telefono: '600000000' }),
    cuerpo: { app: 'factronia', tenantId: 't1', actuaPor: null, datos: { telefono: '600000000' } },
  },
  {
    // 0.13.0: el logo del tenant se sube por Identity (objeto nuevo, tipo por los bytes).
    nombre: 'subirLogoDeTenantDesdeServidor', endpoint: 'subirLogoTenantServidor',
    llamar: () => S().subirLogoDeTenantDesdeServidor('salufile', 't1', 'iVBORw0KGgo=', { actuaPor: 'pAdmin' }),
    cuerpo: { app: 'salufile', tenantId: 't1', imagenBase64: 'iVBORw0KGgo=', actuaPor: 'pAdmin' },
  },
  {
    nombre: 'subirLogoDeTenantDesdeServidor (quitar)', endpoint: 'subirLogoTenantServidor', funcion: 'subirLogoDeTenantDesdeServidor',
    llamar: () => S().subirLogoDeTenantDesdeServidor('salufirst', 't1', null, { actuaPor: 'pAdmin' }),
    cuerpo: { app: 'salufirst', tenantId: 't1', imagenBase64: null, actuaPor: 'pAdmin' },
  },
  {
    nombre: 'accesoAppDesdeServidor', endpoint: 'accesoAppServidor',
    llamar: () => S().accesoAppDesdeServidor('salufact', { profesionalId: 'p1', appId: 'asesoria', activo: true, clinicaId: 'c1' }),
    cuerpo: { app: 'salufact', profesionalId: 'p1', appId: 'asesoria', activo: true, clinicaId: 'c1' },
  },
];

for (const c of CASOS) {
  test(`${c.nombre}: ID token del servidor de metadatos con audiencia = ${c.endpoint}, Bearer y POST con el cuerpo`, async () => {
    assert.equal(typeof S()[c.funcion || c.nombre], 'function', `falta ${c.funcion || c.nombre} en /servidor`);
    const f = conFetch(metadatosY({ ok: true }));
    try {
      const r = await c.llamar();
      assert.deepEqual(r, { ok: true });
      assert.equal(f.llamadas.length, 2);
      const url = `${BASE}/${c.endpoint}`;
      assert.ok(f.llamadas[0].url.includes(`audience=${encodeURIComponent(url)}`), f.llamadas[0].url);
      assert.equal(f.llamadas[0].opciones.headers['Metadata-Flavor'], 'Google');
      assert.equal(f.llamadas[1].url, url);
      assert.equal(f.llamadas[1].opciones.method, 'POST');
      assert.equal(f.llamadas[1].opciones.headers.Authorization, 'Bearer tok.en.firma');
      assert.deepEqual(JSON.parse(f.llamadas[1].opciones.body), c.cuerpo);
    } finally { f.restaurar(); }
  });

  test(`${c.nombre}: si Identity lo rechaza, lanza con SU motivo`, async () => {
    const f = conFetch(metadatosY({ error: 'La empresa no está vinculada a esa clínica.' }, 403));
    try {
      await assert.rejects(c.llamar(), /no está vinculada a esa clínica/);
    } finally { f.restaurar(); }
  });
}
