// Pruebas de lo nuevo de `/servidor` en 0.14.0 (16-10-2026, «todo canónico»
// también en SaluFile y SaluFirst).
//
// El censo de las escrituras de SaluFile y SaluFirst en Identity encontró que
// escribían a mano, con su cuenta de servicio: el personal (alta, vínculo,
// edición, baja), las cuentas de Auth de las invitaciones, las fotos de carnet,
// el acelerador, los complementos de la suscripción en `appsActivas`, la
// desvinculación de un paciente y su número de historia. Aquí:
//
//   - Los CLIENTES de los endpoints de servidor nuevos de Identity (misma
//     puerta que las altas: ID token del servidor de metadatos, sin claves).
//   - `ErrorDeIdentity`: un rechazo de Identity lleva su estado, su código y
//     sus detalles (una app necesita saber que es un 409 y de qué ficha).
//   - Tres REGLAS compartidas (como la de vincular): la de los complementos
//     (`cambiosDeComplementos`, pura: la usan el endpoint de Identity y la
//     simulación de SaluFile), desvincular un paciente de una clínica y
//     asegurar su número de historia.
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

// ── Clientes de los endpoints de servidor nuevos ────────────────────────────

const CASOS = [
  {
    nombre: 'publicarAceleradorDesdeServidor', endpoint: 'publicarAceleradorServidor',
    llamar: () => S().publicarAceleradorDesdeServidor('salufile', 'c1', { ips: ['10.0.0.2'], ipsExternas: [], version: '2.1.0' }),
    cuerpo: { app: 'salufile', clinicaId: 'c1', acelerador: { ips: ['10.0.0.2'], ipsExternas: [], version: '2.1.0' } },
  },
  {
    nombre: 'sincronizarComplementosDesdeServidor', endpoint: 'complementosServidor',
    llamar: () => S().sincronizarComplementosDesdeServidor('salufile', 'c1', { activos: ['saluFirst'], revisar: ['saluFirst'] }),
    cuerpo: { app: 'salufile', clinicaId: 'c1', activos: ['saluFirst'], revisar: ['saluFirst'] },
  },
  {
    nombre: 'sincronizarComplementosDesdeServidor (todos)', funcion: 'sincronizarComplementosDesdeServidor', endpoint: 'complementosServidor',
    llamar: () => S().sincronizarComplementosDesdeServidor('salufile', 'c1', { activos: [] }),
    cuerpo: { app: 'salufile', clinicaId: 'c1', activos: [], revisar: null },
  },
  {
    nombre: 'altaProfesionalDesdeServidor', endpoint: 'altaProfesionalServidor',
    llamar: () => S().altaProfesionalDesdeServidor('salufirst', 'c1', { nif: '12345678Z', nombre: 'Ana', apellidos: 'Pérez', email: 'ana@c1.es' }, { actuaPor: 'pAdmin', idLocal: 'SC-P-1' }),
    cuerpo: { app: 'salufirst', clinicaId: 'c1', actuaPor: 'pAdmin', idLocal: 'SC-P-1', datos: { nif: '12345678Z', nombre: 'Ana', apellidos: 'Pérez', email: 'ana@c1.es' } },
  },
  {
    nombre: 'vincularProfesionalDesdeServidor', endpoint: 'vincularProfesionalServidor',
    llamar: () => S().vincularProfesionalDesdeServidor('salufile', 'c1', 'p1', { actuaPor: 'pAdmin' }),
    cuerpo: { app: 'salufile', clinicaId: 'c1', profesionalId: 'p1', actuaPor: 'pAdmin', idLocal: null },
  },
  {
    nombre: 'desvincularProfesionalDesdeServidor', endpoint: 'desvincularProfesionalServidor',
    llamar: () => S().desvincularProfesionalDesdeServidor('salufirst', 'c1', 'p1', { actuaPor: 'pAdmin' }),
    cuerpo: { app: 'salufirst', clinicaId: 'c1', profesionalId: 'p1', actuaPor: 'pAdmin' },
  },
  {
    nombre: 'actualizarProfesionalDesdeServidor', endpoint: 'actualizarProfesionalServidor',
    llamar: () => S().actualizarProfesionalDesdeServidor('salufile', 'c1', 'p1', { telefono: '600' }, { actuaPor: 'pAdmin' }),
    cuerpo: { app: 'salufile', clinicaId: 'c1', profesionalId: 'p1', actuaPor: 'pAdmin', datos: { telefono: '600' } },
  },
  {
    nombre: 'eliminarProfesionalDesdeServidor', endpoint: 'eliminarProfesionalServidor',
    llamar: () => S().eliminarProfesionalDesdeServidor('salufile', 'p1', { actuaPor: 'pSuper' }),
    cuerpo: { app: 'salufile', profesionalId: 'p1', actuaPor: 'pSuper' },
  },
  {
    nombre: 'cuentaDeInvitacionDesdeServidor', endpoint: 'cuentaInvitacionServidor',
    llamar: () => S().cuentaDeInvitacionDesdeServidor('salufirst', 'c1', { email: 'nueva@c1.es', nombre: 'Nueva' }, { actuaPor: 'pAdmin' }),
    cuerpo: { app: 'salufirst', clinicaId: 'c1', actuaPor: 'pAdmin', email: 'nueva@c1.es', nombre: 'Nueva' },
  },
  {
    nombre: 'enlaceDeContrasenaDesdeServidor', endpoint: 'enlaceContrasenaServidor',
    llamar: () => S().enlaceDeContrasenaDesdeServidor('salufile', 'c1', 'nueva@c1.es'),
    cuerpo: { app: 'salufile', clinicaId: 'c1', email: 'nueva@c1.es' },
  },
  {
    nombre: 'activarCuentaDesdeServidor', endpoint: 'activarCuentaServidor',
    llamar: () => S().activarCuentaDesdeServidor('salufirst', 'c1', 'uid1', { password: 'una-clave-larga' }),
    cuerpo: { app: 'salufirst', clinicaId: 'c1', uid: 'uid1', password: 'una-clave-larga' },
  },
  {
    nombre: 'activarCuentaDesdeServidor (solo el correo)', funcion: 'activarCuentaDesdeServidor', endpoint: 'activarCuentaServidor',
    llamar: () => S().activarCuentaDesdeServidor('salufirst', 'c1', 'uid1'),
    cuerpo: { app: 'salufirst', clinicaId: 'c1', uid: 'uid1', password: null },
  },
  {
    nombre: 'suspenderCuentaDesdeServidor', endpoint: 'suspenderCuentaServidor',
    llamar: () => S().suspenderCuentaDesdeServidor('salufile', 'uid1', true, { actuaPor: 'pSuper' }),
    cuerpo: { app: 'salufile', uid: 'uid1', suspendida: true, actuaPor: 'pSuper' },
  },
  {
    nombre: 'subirFotoDesdeServidor', endpoint: 'subirFotoServidor',
    llamar: () => S().subirFotoDesdeServidor('salufile', 'paciente', 'pa1', '/9j/4AAQ', { actuaPor: 'pAdmin', clinicaId: 'c1' }),
    cuerpo: { app: 'salufile', entidad: 'paciente', id: 'pa1', imagenBase64: '/9j/4AAQ', actuaPor: 'pAdmin', clinicaId: 'c1' },
  },
  {
    nombre: 'subirFotoDesdeServidor (la propia, quitar)', funcion: 'subirFotoDesdeServidor', endpoint: 'subirFotoServidor',
    llamar: () => S().subirFotoDesdeServidor('salufirst', 'profesional', 'p1', null, { actuaPor: 'p1' }),
    cuerpo: { app: 'salufirst', entidad: 'profesional', id: 'p1', imagenBase64: null, actuaPor: 'p1', clinicaId: null },
  },
  {
    nombre: 'actualizarPacienteDesdeServidor', endpoint: 'actualizarPacienteServidor',
    llamar: () => S().actualizarPacienteDesdeServidor('salufile', 'c1', 'pa1', { aseguradora: 'Sanitas' }),
    cuerpo: { app: 'salufile', clinicaId: 'c1', pacienteId: 'pa1', datos: { aseguradora: 'Sanitas' }, borrar: [] },
  },
  // Los de 0.12.0, ahora también para SaluFile y SaluFirst.
  {
    nombre: 'actualizarTenantDesdeServidor (SaluFile)', funcion: 'actualizarTenantDesdeServidor', endpoint: 'actualizarTenantServidor',
    llamar: () => S().actualizarTenantDesdeServidor('salufile', 't1', { nombreComercial: 'Clínica' }, { actuaPor: 'pAdmin' }),
    cuerpo: { app: 'salufile', tenantId: 't1', actuaPor: 'pAdmin', datos: { nombreComercial: 'Clínica' } },
  },
  {
    nombre: 'actualizarTenantDesdeServidor (SaluFirst, su plan)', funcion: 'actualizarTenantDesdeServidor', endpoint: 'actualizarTenantServidor',
    llamar: () => S().actualizarTenantDesdeServidor('salufirst', 't1', { planApp: { plan: 'PRO', pruebaPro: false } }),
    cuerpo: { app: 'salufirst', tenantId: 't1', actuaPor: null, datos: { planApp: { plan: 'PRO', pruebaPro: false } } },
  },
  {
    nombre: 'crearTenantDesdeServidor (SaluFile)', funcion: 'crearTenantDesdeServidor', endpoint: 'crearTenantServidor',
    llamar: () => S().crearTenantDesdeServidor('salufile', { nombre: 'Clínica SL', cif: 'B12345674', plan: 'FREE' }, { actuaPor: 'pSuper' }),
    cuerpo: { app: 'salufile', tenantId: null, actuaPor: 'pSuper', datos: { nombre: 'Clínica SL', cif: 'B12345674', plan: 'FREE' } },
  },
  {
    nombre: 'accesoAppDesdeServidor (SaluFile, su app)', funcion: 'accesoAppDesdeServidor', endpoint: 'accesoAppServidor',
    llamar: () => S().accesoAppDesdeServidor('salufile', { profesionalId: 'p1', appId: 'saluFile', activo: false }),
    cuerpo: { app: 'salufile', profesionalId: 'p1', appId: 'saluFile', activo: false },
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
    const f = conFetch(metadatosY({ error: 'Quien lo hace no trabaja en esta empresa con esta app.' }, 403));
    try {
      await assert.rejects(c.llamar(), /no trabaja en esta empresa/);
    } finally { f.restaurar(); }
  });
}

test('ErrorDeIdentity: el rechazo lleva el estado, el código y los detalles de Identity (un 409 dice de qué ficha)', async () => {
  const f = conFetch(metadatosY({
    error: 'Ya existe un profesional con ese documento.', codigo: 'already-exists',
    detalles: { profesionalId: 'p9', enLaClinica: false },
  }, 409));
  try {
    const e = await S().altaProfesionalDesdeServidor('salufile', 'c1', { nif: '1', nombre: 'A', apellidos: 'B', email: 'a@b.es' }, { actuaPor: 'pAdmin' })
      .then(() => null, (x) => x);
    assert.ok(e instanceof Error);
    assert.ok(e instanceof S().ErrorDeIdentity);
    assert.equal(e.status, 409);
    assert.equal(e.codigo, 'already-exists');
    assert.deepEqual(e.detalles, { profesionalId: 'p9', enLaClinica: false });
    assert.equal(e.message, 'Ya existe un profesional con ese documento.');
  } finally { f.restaurar(); }
});

test('ErrorDeIdentity: sin cuerpo, un mensaje que dice qué se intentaba y el código según el estado', async () => {
  const f = conFetch(metadatosY('no es json', 500));
  try {
    const e = await S().publicarAceleradorDesdeServidor('salufile', 'c1', { version: '1' }).then(() => null, (x) => x);
    assert.ok(e instanceof S().ErrorDeIdentity);
    assert.equal(e.status, 500);
    assert.equal(e.codigo, 'internal');
    assert.match(e.message, /Identity respondió 500/);
  } finally { f.restaurar(); }
  for (const [status, codigo] of [[400, 'invalid-argument'], [403, 'permission-denied'], [404, 'not-found'], [409, 'already-exists'], [412, 'failed-precondition'], [429, 'resource-exhausted'], [503, 'unavailable']]) {
    assert.equal(S().codigoDeEstadoIdentity(status), codigo, String(status));
  }
});

// ── Regla de los complementos ───────────────────────────────────────────────
//
// Decisión de Diego (2026-09-26): el complemento solo CONCEDE el acceso y nunca
// lo retira a quien ya lo tenía por su cuenta. Es la regla que había en
// `functions/utils/complementos-identity.js` de SaluFile, caso por caso.

const prof = (id, datos) => ({ id, datos: { activo: true, clinicaIds: ['c1'], appsActivas: { saluFile: true }, ...datos } });
const sinOrigenes = async () => [];

test('cambiosDeComplementos: activo → concede la app y marca la clínica; quien ya la tenía por su cuenta no se toca', async () => {
  const r = await S().cambiosDeComplementos({
    clinicaId: 'c1',
    profesionales: [
      prof('pNuevo', {}),
      prof('pPropia', { appsActivas: { saluFile: true, saluFact: true } }),
      prof('pInactivo', { activo: false }),
      prof('pSinFile', { appsActivas: { saluFile: false } }),
    ],
    origenesDe: sinOrigenes,
    activos: ['saluFact'],
  });
  assert.deepEqual(r.parches, [{ profesionalId: 'pNuevo', apps: { saluFact: true }, marcar: ['saluFact'], desmarcar: [] }]);
  assert.deepEqual(r.cambios.map((c) => [c.accion, c.app, c.profesionalId]), [['conceder', 'saluFact', 'pNuevo']]);
  assert.ok(r.cambios.every((c) => !('nombre' in c)), 'nada personal en lo que se devuelve (acaba en un log)');
});

test('cambiosDeComplementos: concedida por el complemento de OTRO centro → este también la sostiene (solo marca)', async () => {
  const r = await S().cambiosDeComplementos({
    clinicaId: 'c1',
    profesionales: [prof('p1', { appsActivas: { saluFile: true, saluFirst: true }, appsPorComplemento: { saluFirst: ['c2'] } })],
    origenesDe: sinOrigenes, activos: ['saluFirst'], revisar: ['saluFirst'],
  });
  assert.deepEqual(r.parches, [{ profesionalId: 'p1', apps: {}, marcar: ['saluFirst'], desmarcar: [] }]);
  assert.equal(r.cambios[0].accion, 'marcar');
});

test('cambiosDeComplementos: retirada a mano después de concederla → se respeta, no se vuelve a conceder', async () => {
  const r = await S().cambiosDeComplementos({
    clinicaId: 'c1',
    profesionales: [prof('p1', { appsActivas: { saluFile: true, saluFact: false }, appsPorComplemento: { saluFact: ['c1'] } })],
    origenesDe: sinOrigenes, activos: ['saluFact'],
  });
  assert.deepEqual(r.parches, []);
  assert.equal(r.cambios[0].accion, 'respetar');
});

test('cambiosDeComplementos: cancelado → desmarca; retira SOLO si no la sostiene otro centro ni la usa un centro suyo por su cuenta', async () => {
  const origenes = { c3: ['salufact'], c1: ['salufile'] };
  const r = await S().cambiosDeComplementos({
    clinicaId: 'c1',
    profesionales: [
      prof('pRetirar', { appsActivas: { saluFile: true, saluFact: true }, appsPorComplemento: { saluFact: ['c1'] } }),
      prof('pOtroCentro', { appsActivas: { saluFile: true, saluFact: true }, appsPorComplemento: { saluFact: ['c1', 'c2'] } }),
      prof('pUsoPropio', { clinicaIds: ['c1', 'c3'], appsActivas: { saluFile: true, saluFact: true }, appsPorComplemento: { saluFact: ['c1'] } }),
      prof('pYaSinApp', { appsActivas: { saluFile: true, saluFact: false }, appsPorComplemento: { saluFact: ['c1'] } }),
      prof('pPorSuCuenta', { appsActivas: { saluFile: true, saluFact: true } }),
    ],
    origenesDe: async (t) => origenes[t] || [],
    activos: [],
    revisar: ['saluFact'],
  });
  const por = Object.fromEntries(r.parches.map((p) => [p.profesionalId, p]));
  assert.deepEqual(por.pRetirar, { profesionalId: 'pRetirar', apps: { saluFact: false }, marcar: [], desmarcar: ['saluFact'] });
  assert.deepEqual(por.pOtroCentro, { profesionalId: 'pOtroCentro', apps: {}, marcar: [], desmarcar: ['saluFact'] });
  assert.deepEqual(por.pUsoPropio, { profesionalId: 'pUsoPropio', apps: {}, marcar: [], desmarcar: ['saluFact'] });
  assert.deepEqual(por.pYaSinApp, { profesionalId: 'pYaSinApp', apps: {}, marcar: [], desmarcar: ['saluFact'] });
  assert.equal(por.pPorSuCuenta, undefined, 'quien la tenía sin la marca de este centro no se toca');
  assert.deepEqual(r.cambios.find((c) => c.profesionalId === 'pRetirar').accion, 'retirar');
});

test('cambiosDeComplementos: `revisar` acota (la prueba de SaluFirst no toca SaluFact) y solo admite las apps de complemento', async () => {
  const r = await S().cambiosDeComplementos({
    clinicaId: 'c1',
    profesionales: [prof('p1', { appsActivas: { saluFile: true, saluFact: true }, appsPorComplemento: { saluFact: ['c1'] } })],
    origenesDe: sinOrigenes, activos: [], revisar: ['saluFirst'],
  });
  assert.deepEqual(r.parches, []);
  await assert.rejects(S().cambiosDeComplementos({ clinicaId: 'c1', profesionales: [], origenesDe: sinOrigenes, activos: ['saluFile'] }), /complemento/);
  assert.deepEqual(S().APPS_DE_COMPLEMENTO, ['saluFact', 'saluFirst']);
});

// ── Desvincular un paciente y su número de historia ─────────────────────────

/** Firestore mínimo con update de rutas puntuadas, centinelas de quien llama y transacciones. */
function dobleDb(inicial) {
  const docs = new Map(Object.entries(inicial).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]));
  const escrituras = [];
  const aplicar = (ruta, parche) => {
    escrituras.push({ ruta, parche });
    const d = JSON.parse(JSON.stringify(docs.get(ruta)));
    for (const [k, v] of Object.entries(parche)) {
      const partes = k.split('.');
      let o = d;
      for (const p of partes.slice(0, -1)) o = (o[p] = o[p] || {});
      const u = partes[partes.length - 1];
      if (v && v.__quitar) o[u] = (o[u] || []).filter((x) => !v.__quitar.includes(x));
      else if (v && v.__borrar) delete o[u];
      else o[u] = v;
    }
    docs.set(ruta, d);
  };
  const ref = (ruta) => ({
    ruta,
    async get() { const d = docs.get(ruta); return { exists: !!d, data: () => d && JSON.parse(JSON.stringify(d)) }; },
    async update(parche) { aplicar(ruta, parche); },
  });
  return {
    docs, escrituras,
    collection: (col) => ({ doc: (id) => ref(`${col}/${id}`) }),
    async runTransaction(fn) {
      const pendientes = [];
      const r = await fn({ get: (x) => x.get(), update: (x, p) => { pendientes.push(() => aplicar(x.ruta, p)); } });
      for (const p of pendientes) p();
      return r;
    },
  };
}
const CAMPOS = { arrayRemove: (...v) => ({ __quitar: v }), borrar: () => ({ __borrar: true }) };

test('desvincularPacienteEnIdentity: quita la clínica y su número, sube updatedAt; idempotente; un paciente que no existe es error', async () => {
  const db = dobleDb({ 'pacientes/pa1': { clinicaIds: ['c1', 'c2'], idsLocales: { c1: 'SC-1', c2: 'SC-1' } } });
  const r = await S().desvincularPacienteEnIdentity(db, CAMPOS, 'pa1', 'c1');
  assert.deepEqual(r, { yaDesvinculado: false });
  const d = db.docs.get('pacientes/pa1');
  assert.deepEqual(d.clinicaIds, ['c2']);
  assert.deepEqual(d.idsLocales, { c2: 'SC-1' });
  assert.ok(typeof d.updatedAt === 'string' || d.updatedAt, 'sin updatedAt el paciente no sale del buscador de las copias por delta');
  assert.deepEqual(Object.keys(db.escrituras[0].parche).sort(), ['clinicaIds', 'idsLocales.c1', 'updatedAt']);
  assert.deepEqual(await S().desvincularPacienteEnIdentity(db, CAMPOS, 'pa1', 'c1'), { yaDesvinculado: true });
  assert.equal(db.escrituras.length, 1);
  await assert.rejects(S().desvincularPacienteEnIdentity(db, CAMPOS, 'nadie', 'c1'), /no existe/i);
});

test('asegurarNumeroHistoriaEnIdentity: reutiliza el de otra clínica, acuña con el prefijo si no tiene, y no toca al que ya lo tiene', async () => {
  const db = dobleDb({
    'pacientes/conOtro': { idsLocales: { c2: 'SF-ABC' } },
    'pacientes/sinNinguno': { idsLocales: {} },
    'pacientes/yaTiene': { idsLocales: { c1: 'SC-YA' } },
  });
  assert.deepEqual(await S().asegurarNumeroHistoriaEnIdentity(db, 'conOtro', 'c1', { prefijo: 'SC' }), { asignado: true, numero: 'SF-ABC' });
  const n = await S().asegurarNumeroHistoriaEnIdentity(db, 'sinNinguno', 'c1', { prefijo: 'SC' });
  assert.equal(n.asignado, true);
  assert.match(n.numero, /^SC-[0-9A-Z]{10,}$/);
  assert.equal(db.docs.get('pacientes/sinNinguno').idsLocales.c1, n.numero);
  assert.ok(db.escrituras.every((e) => 'updatedAt' in e.parche), 'el número sin updatedAt no llega a los buscadores');
  assert.deepEqual(await S().asegurarNumeroHistoriaEnIdentity(db, 'yaTiene', 'c1', { prefijo: 'SC' }), { asignado: false, motivo: 'ya-tenia', numero: 'SC-YA' });
  assert.deepEqual(await S().asegurarNumeroHistoriaEnIdentity(db, 'nadie', 'c1'), { asignado: false, motivo: 'paciente-no-existe-en-identity' });
  assert.equal(db.escrituras.length, 2);
});
