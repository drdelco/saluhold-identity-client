// Pruebas del módulo único de sellos de tiempo RFC 3161 (`/sello`).
//
//   - Vectores REALES de FreeTSA (test/vectores/freetsa): verifican, y cada
//     manipulación (otra huella, otro nonce, firma tocada, raíz equivocada,
//     instante fuera de validez…) da ok:false con su motivo.
//   - Contraste con `openssl ts -verify` si OpenSSL está en el PATH (Git Bash
//     lo trae); si no, esas pruebas se saltan y lo dicen.
//   - Una TSA DE MENTIRA en memoria (RSA, PKI de usar y tirar en
//     test/vectores/pki-prueba) para `pedirSello`, `sellar` y la cola con un
//     Firestore de mentira: fallo, reintento, respaldo a las 24 h, lotes.
//   - Merkle contra la definición recursiva de la RFC 6962.
//   - Imprime el SHA-256 del fichero fuente, para la paridad de eXCausis.
//
// Sin red: `fetch` es un doble. Sin datos personales: huellas aleatorias.
//
//   npm test   (compila y ejecuta)

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Readable } = require('node:stream');

const S = require('../dist-cjs/sello/selloTiempo.js');

const VEC = path.join(__dirname, 'vectores');
const FREETSA = path.join(VEC, 'freetsa');
const PKI = path.join(VEC, 'pki-prueba');
const leer = (...p) => fs.readFileSync(path.join(...p));
const texto = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const VECTORES = JSON.parse(texto(FREETSA, 'vectores.json')).vectores;
const RAIZ_FREETSA = texto(FREETSA, 'cacert.pem');
const RAIZ_PRUEBA = texto(PKI, 'ca.pem');
const OTRA_RAIZ = texto(PKI, 'otra-ca.pem');
const aleatoria = () => crypto.randomBytes(32).toString('hex');

const OPENSSL = (() => {
  const r = spawnSync('openssl', ['version'], { encoding: 'utf8' });
  return r.status === 0 ? 'openssl' : null;
})();
function openssl(args, cwd) {
  return spawnSync(OPENSSL, args, { encoding: 'utf8', cwd, env: Object.assign({}, process.env, { MSYS_NO_PATHCONV: '1' }) });
}

/** Sin `undefined` en ningún nivel (lo que Firestore rechaza). */
function sinUndefined(v, ruta = '') {
  if (v === undefined) throw new Error('undefined en ' + (ruta || '(raíz)'));
  if (Array.isArray(v)) v.forEach((x, i) => sinUndefined(x, ruta + '[' + i + ']'));
  else if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    for (const k of Object.keys(v)) sinUndefined(v[k], ruta + '.' + k);
  }
  return true;
}

// ── DER mínimo para las pruebas (la TSA de mentira y las manipulaciones) ────

function len(n) {
  if (n < 0x80) return Buffer.from([n]);
  const b = [];
  while (n > 0) { b.unshift(n & 0xff); n = Math.floor(n / 256); }
  return Buffer.from([0x80 | b.length, ...b]);
}
const tlv = (tag, ...v) => { const c = Buffer.concat(v); return Buffer.concat([Buffer.from([tag]), len(c.length), c]); };
const seq = (...v) => tlv(0x30, ...v);
const set = (...v) => tlv(0x31, ...v);
const oct = (b) => tlv(0x04, b);
function int(b) {
  let i = 0; while (i < b.length - 1 && b[i] === 0) i++;
  let x = b.subarray(i); if (x[0] & 0x80) x = Buffer.concat([Buffer.from([0]), x]);
  return tlv(0x02, x);
}
function oid(s) {
  const p = s.split('.').map(Number); const out = [p[0] * 40 + p[1]];
  for (const n0 of p.slice(2)) { let n = n0; const g = [n & 0x7f]; n = Math.floor(n / 128); while (n) { g.unshift((n & 0x7f) | 0x80); n = Math.floor(n / 128); } out.push(...g); }
  return tlv(0x06, Buffer.from(out));
}
const NULO = Buffer.from([0x05, 0x00]);
function gtime(d) { return tlv(0x18, Buffer.from(d.toISOString().replace(/[-:T]/g, '').replace(/\.\d+Z$/, 'Z'), 'latin1')); }
function nodo(buf, off = 0) {
  const tag = buf[off]; let l = buf[off + 1]; let h = 2;
  if (l & 0x80) { const n = l & 0x7f; l = 0; for (let i = 0; i < n; i++) l = l * 256 + buf[off + 2 + i]; h = 2 + n; }
  return { tag, off, h, fin: off + h + l, valor: buf.subarray(off + h, off + h + l), todo: buf.subarray(off, off + h + l) };
}
function hijosDe(buf, n) { const r = []; let p = n.off + n.h; while (p < n.fin) { const c = nodo(buf, p); r.push(c); p = c.fin; } return r; }
const pemADer = (pem) => Buffer.from(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), 'base64');

// ── TSA de mentira (RSA, con la PKI de pruebas) ─────────────────────────────

const PKI_TSA = { cert: pemADer(texto(PKI, 'tsa.pem')), clave: texto(PKI, 'tsa.key'), ca: pemADer(RAIZ_PRUEBA) };
const PKI_TSA_NC = { cert: pemADer(texto(PKI, 'tsa-eku-no-critica.pem')), clave: texto(PKI, 'tsa.key'), ca: pemADer(RAIZ_PRUEBA) };

function emisorYSerie(der) {
  const tbs = hijosDe(der, hijosDe(der, nodo(der))[0]);
  const i = tbs[0].tag === 0xa0 ? 1 : 0;
  return seq(Buffer.from(tbs[i + 2].todo), Buffer.from(tbs[i].todo));
}

function skiDeCert(der) {
  const cert = nodo(der); const tbs = hijosDe(der, hijosDe(der, cert)[0]);
  const ext = tbs.find((n) => n.tag === 0xa3);
  for (const e of hijosDe(der, hijosDe(der, ext)[0])) {
    const c = hijosDe(der, e);
    if (c[0].valor.equals(oid('2.5.29.14').subarray(2))) return nodo(Buffer.from(c[c.length - 1].valor)).valor;
  }
  throw new Error('sin SKI');
}

/** Respuesta firmada por la TSA de pruebas para una petición DER. */
function responderTsa(peticion, pki = PKI_TSA, opciones = {}) {
  const raiz = nodo(peticion); const p = hijosDe(peticion, raiz);
  const imprint = hijosDe(peticion, p[1]);
  const huella = Buffer.from(imprint[1].valor);
  const nonce = p[2] && p[2].tag === 0x02 ? Buffer.from(p[2].valor) : null;
  const tst = seq(
    int(Buffer.from([1])), oid('1.2.3.4.1'),
    seq(seq(oid('2.16.840.1.101.3.4.2.1'), NULO), oct(huella)),
    int(crypto.randomBytes(6)), gtime(opciones.genTime || new Date()),
    seq(tlv(0x80, Buffer.from([0x01, 0xf4]))), // precisión: 500 ms
    ...(nonce ? [int(nonce)] : []),
  );
  const atributos = [
    seq(oid('1.2.840.113549.1.9.3'), set(oid('1.2.840.113549.1.9.16.1.4'))),
    seq(oid('1.2.840.113549.1.9.4'), set(oct(crypto.createHash('sha256').update(tst).digest()))),
    seq(oid('1.2.840.113549.1.9.16.2.47'), set(seq(seq(seq(oct(crypto.createHash('sha256').update(pki.cert).digest())))))),
  ].sort(Buffer.compare);
  const firmados = set(...atributos);
  const firma = crypto.sign('sha256', firmados, pki.clave);
  // openssl (PKCS7) solo entiende issuerAndSerialNumber; por SKI se prueba aparte.
  const sid = opciones.porSki ? [int(Buffer.from([3])), tlv(0x80, skiDeCert(pki.cert))] : [int(Buffer.from([1])), emisorYSerie(pki.cert)];
  const signerInfo = seq(
    ...sid,
    seq(oid('2.16.840.1.101.3.4.2.1'), NULO),
    Buffer.concat([Buffer.from([0xa0]), firmados.subarray(1)]),
    seq(oid('1.2.840.113549.1.1.11'), NULO), oct(firma),
  );
  const signedData = seq(
    int(Buffer.from([3])), set(seq(oid('2.16.840.1.101.3.4.2.1'), NULO)),
    seq(oid('1.2.840.113549.1.9.16.1.4'), tlv(0xa0, oct(tst))),
    tlv(0xa0, pki.cert, pki.ca), set(signerInfo),
  );
  return seq(seq(int(Buffer.from([0]))), seq(oid('1.2.840.113549.1.7.2'), tlv(0xa0, signedData)));
}

const URL_A = 'https://tsa-a.prueba.invalid/tsr';
const URL_B = 'https://tsa-b.prueba.invalid/tsr';

/** `fetch` de mentira: por URL, una función que decide qué responde. */
function conFetch(rutas) {
  const original = globalThis.fetch;
  const llamadas = [];
  globalThis.fetch = async (url, op = {}) => {
    llamadas.push({ url: String(url), op, at: Date.now() });
    const r = rutas[String(url)];
    if (!r) throw new Error('red caída');
    const salida = await r(Buffer.from(op.body), op);
    if (salida instanceof Error) throw salida;
    if (typeof salida === 'number') return { ok: false, status: salida, arrayBuffer: async () => new ArrayBuffer(0) };
    const ab = salida.buffer.slice(salida.byteOffset, salida.byteOffset + salida.length);
    return { ok: true, status: 200, arrayBuffer: async () => ab };
  };
  return { llamadas, restaurar: () => { globalThis.fetch = original; } };
}

const tsaA = (extra = {}) => Object.assign({ id: 'prueba-a', url: URL_A, cualificada: false, autenticacion: { tipo: 'ninguna' }, raicesPem: [RAIZ_PRUEBA] }, extra);
const tsaB = (extra = {}) => Object.assign({ id: 'prueba-b', url: URL_B, cualificada: false, autenticacion: { tipo: 'ninguna' }, raicesPem: [RAIZ_PRUEBA] }, extra);

// ── Firestore de mentira ────────────────────────────────────────────────────

function firestoreFalso() {
  const datos = new Map(); // 'col/id' → objeto
  let n = 0;
  const clonar = (v) => structuredClone(v);
  function ref(col, id) {
    const clave = col + '/' + id;
    return {
      id,
      async get() { return snap(id, datos.get(clave)); },
      async set(d) { sinUndefined(d); datos.set(clave, clonar(d)); },
      async update(d) {
        sinUndefined(d);
        if (!datos.has(clave)) throw new Error('NOT_FOUND ' + clave);
        datos.set(clave, Object.assign(datos.get(clave), clonar(d)));
      },
    };
  }
  function snap(id, d) { return { id, exists: d !== undefined, data: () => (d === undefined ? undefined : clonar(d)) }; }
  function consulta(col, filtros) {
    return {
      where(c, op, v) { assert.equal(op, '=='); return consulta(col, filtros.concat([[c, v]])); },
      async get() {
        const docs = [];
        for (const [k, d] of datos) {
          const [c, id] = k.split('/');
          if (c !== col) continue;
          if (filtros.every(([campo, v]) => campo in d && d[campo] === v)) docs.push(snap(id, d));
        }
        return { docs };
      },
    };
  }
  const db = {
    datos,
    collection(col) {
      return Object.assign(consulta(col, []), { doc: (id) => ref(col, id || 'auto' + (++n)) });
    },
    async runTransaction(f) {
      return f({ get: (r) => r.get(), set: (r, d) => r.set(d), update: (r, d) => r.update(d) });
    },
    batch() {
      const ops = [];
      return { update: (r, d) => ops.push(() => r.update(d)), async commit() { for (const o of ops) await o(); } };
    },
    leer: (col, id) => datos.get(col + '/' + id),
  };
  return db;
}

// ═══════════════════════════════════════════════════════════════════════════
// Huellas y JSON canónico
// ═══════════════════════════════════════════════════════════════════════════

test('huellaDeBytes, huellaDeFlujo y huellaCanonica', async () => {
  assert.equal(S.huellaDeBytes(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(S.huellaDeBytes('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const bytes = crypto.randomBytes(100000);
  const trozos = []; for (let i = 0; i < bytes.length; i += 7777) trozos.push(bytes.subarray(i, i + 7777));
  const f = await S.huellaDeFlujo(Readable.from(trozos));
  assert.deepEqual(f, { huella: S.huellaDeBytes(bytes), bytes: bytes.length });

  assert.equal(S.jsonCanonico({ b: 1, a: [true, null, 'x'], c: { z: 1.5, y: undefined } }), '{"a":[true,null,"x"],"b":1,"c":{"z":1.5}}');
  assert.equal(S.jsonCanonico([undefined, -0, 1e21, 'ñ ']), '[null,0,1e+21,"ñ "]');
  // Orden RFC 8785: por unidades UTF-16 (el emoji, por sus sustitutos, va antes de ﬁ).
  assert.equal(S.jsonCanonico({ 'ﬁ': 1, '😀': 2, a: 3 }), '{"a":3,"😀":2,"ﬁ":1}');
  assert.equal(S.jsonCanonico({ d: new Date('2026-10-20T10:00:00Z') }), '{"d":"2026-10-20T10:00:00.000Z"}');
  assert.throws(() => S.jsonCanonico({ x: NaN }));
  assert.throws(() => S.jsonCanonico({ x: BigInt(1) }));
  assert.equal(S.huellaCanonica({ b: 2, a: 1 }), S.huellaCanonica({ a: 1, b: 2 }));
  assert.equal(S.huellaCanonica({ a: 1 }), S.huellaDeBytes('{"a":1}'));
});

// ═══════════════════════════════════════════════════════════════════════════
// Petición y vectores reales de FreeTSA
// ═══════════════════════════════════════════════════════════════════════════

test('peticionRfc3161 es byte a byte la de `openssl ts -query -sha256 -cert`', () => {
  for (const v of VECTORES) {
    assert.ok(S.peticionRfc3161(v.huella, { nonce: v.nonce }).equals(leer(FREETSA, v.tsq)), v.tsq);
  }
  assert.throws(() => S.peticionRfc3161('abc'));
  const nonce = S.nuevoNonce();
  assert.match(nonce, /^[0-7][0-9a-f]{15}$/);
});

test('leerRespuesta: campos del TSTInfo de FreeTSA', () => {
  const v = VECTORES[0];
  const r = S.leerRespuesta(leer(FREETSA, v.tsr));
  assert.equal(r.pkiStatus, 0);
  assert.equal(r.tstInfo.huella, v.huella);
  assert.equal(r.tstInfo.serie, v.serie);
  assert.equal(r.tstInfo.nonce, v.nonce);
  assert.equal(r.tstInfo.genTimeIso, v.genTimeIso);
  assert.equal(r.tstInfo.politica, '1.2.3.4.1');
  assert.equal(r.tstInfo.algoritmoHuella, '2.16.840.1.101.3.4.2.1');
  assert.equal(r.tstInfo.precisionMs, null);
  assert.equal(r.certs.length, 2);
  assert.ok(r.signerInfo.atributosFirmados);
  // Un token suelto (ContentInfo) también se lee.
  const t = S.leerRespuesta(r.token);
  assert.equal(t.tstInfo.serie, v.serie);
});

test('verificarSello: los tres vectores reales de FreeTSA verifican', () => {
  for (const v of VECTORES) {
    const r = S.verificarSello(leer(FREETSA, v.tsr), { huella: v.huella, nonce: v.nonce, raices: [RAIZ_FREETSA] });
    assert.deepEqual(r.motivos, [], v.tsr);
    assert.equal(r.ok, true);
    assert.equal(r.genTime.toISOString(), v.genTimeIso);
    assert.match(r.firmante.sujeto, /CN=www\.freetsa\.org/);
    assert.match(r.firmante.emisor, /OU=Root CA/);
    assert.match(r.firmante.sha256Cert, /^[0-9a-f]{64}$/);
    // Sin nonce también (no se exige), y con la huella en mayúsculas.
    assert.equal(S.verificarSello(leer(FREETSA, v.tsr), { huella: v.huella.toUpperCase(), raices: [RAIZ_FREETSA] }).ok, true);
  }
});

function conMotivo(r, motivo) {
  assert.equal(r.ok, false);
  assert.ok(r.motivos.includes(motivo), 'esperaba «' + motivo + '», llegó ' + JSON.stringify(r.motivos));
}

test('verificarSello: cada manipulación da ok:false con su motivo', () => {
  const v = VECTORES[1];
  const der = leer(FREETSA, v.tsr);
  const base = { huella: v.huella, nonce: v.nonce, raices: [RAIZ_FREETSA] };

  conMotivo(S.verificarSello(der, Object.assign({}, base, { huella: aleatoria() })), 'huella_distinta');
  conMotivo(S.verificarSello(der, Object.assign({}, base, { nonce: '1234' })), 'nonce_distinto');
  conMotivo(S.verificarSello(der, Object.assign({}, base, { raices: [OTRA_RAIZ] })), 'cadena_sin_raiz_de_confianza');
  conMotivo(S.verificarSello(der, Object.assign({}, base, { raices: [] })), 'sin_raices');
  conMotivo(S.verificarSello(der, Object.assign({}, base, { instante: new Date('2050-01-01T00:00:00Z') })), 'firmante_fuera_de_validez');
  conMotivo(S.verificarSello(der, Object.assign({}, base, { instante: new Date('2001-01-01T00:00:00Z') })), 'firmante_fuera_de_validez');

  // Un byte de la firma cambiado.
  const si = S.leerRespuesta(der).signerInfo;
  const pos = der.indexOf(si.firma);
  assert.ok(pos > 0);
  const rota = Buffer.from(der); rota[pos + Math.floor(si.firma.length / 2)] ^= 0x01;
  conMotivo(S.verificarSello(rota, base), 'firma_invalida');

  // Un byte del TSTInfo (dentro de la huella sellada) cambiado: no cuadra el messageDigest.
  const posHuella = der.indexOf(Buffer.from(v.huella, 'hex'));
  const tocada = Buffer.from(der); tocada[posHuella] ^= 0x01;
  const r = S.verificarSello(tocada, base);
  conMotivo(r, 'message_digest_distinto');
  conMotivo(r, 'huella_distinta');

  conMotivo(S.verificarSello(Buffer.from('basura'), base), 'respuesta_ilegible');
  conMotivo(S.verificarSello(der.subarray(0, der.length - 10), base), 'respuesta_ilegible');
});

test('openssl ts -verify confirma los vectores de FreeTSA', { skip: OPENSSL ? false : 'OpenSSL no está en el PATH' }, () => {
  for (const v of VECTORES) {
    const r = openssl(['ts', '-verify', '-digest', v.huella, '-in', v.tsr, '-CAfile', 'cacert.pem', '-untrusted', 'tsa.crt'], FREETSA);
    assert.match(r.stdout, /Verification: OK/, r.stderr);
    const malo = openssl(['ts', '-verify', '-digest', aleatoria(), '-in', v.tsr, '-CAfile', 'cacert.pem', '-untrusted', 'tsa.crt'], FREETSA);
    assert.doesNotMatch(malo.stdout, /Verification: OK/);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TSA de mentira: pedirSello y sellar
// ═══════════════════════════════════════════════════════════════════════════

test('la TSA de mentira produce sellos que openssl también da por buenos', { skip: OPENSSL ? false : 'OpenSSL no está en el PATH' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sello-'));
  try {
    const huella = aleatoria();
    const peticion = S.peticionRfc3161(huella, { nonce: S.nuevoNonce() });
    fs.writeFileSync(path.join(dir, 'q.tsq'), peticion);
    fs.writeFileSync(path.join(dir, 'r.tsr'), responderTsa(peticion));
    fs.copyFileSync(path.join(PKI, 'ca.pem'), path.join(dir, 'ca.pem'));
    const r = openssl(['ts', '-verify', '-queryfile', 'q.tsq', '-in', 'r.tsr', '-CAfile', 'ca.pem'], dir);
    assert.match(r.stdout, /Verification: OK/, r.stderr);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('pedirSello: concedido y verificado (RSA, firmante por SKI, precisión)', async () => {
  const f = conFetch({ [URL_A]: (q) => responderTsa(q, PKI_TSA, { porSki: true }) });
  try {
    const huella = aleatoria();
    const s = await S.pedirSello(huella, tsaA());
    sinUndefined(s);
    assert.equal(s.estado, 'concedido', s.ultimoError);
    assert.equal(s.v, 1);
    assert.equal(s.huella, huella);
    assert.equal(s.verificacion.ok, true);
    assert.equal(s.precisionMs, 500);
    assert.equal(s.politica, '1.2.3.4.1');
    assert.ok(s.genTime instanceof Date && s.genTimeIso === s.genTime.toISOString());
    assert.match(s.firmante.sujeto, /TSA de pruebas/);
    assert.equal(s.intentos, 1);
    assert.equal(s.ultimoError, null);
    assert.equal(S.comprobarSello(s, { raices: [RAIZ_PRUEBA] }).ok, true);
    conMotivo(S.comprobarSello(s, { raices: [OTRA_RAIZ] }), 'cadena_sin_raiz_de_confianza');
    const h = f.llamadas[0].op.headers;
    assert.equal(h['Content-Type'], 'application/timestamp-query');
    assert.equal(h.Authorization, undefined);
  } finally { f.restaurar(); }
});

test('pedirSello: nunca lanza; fallos y tokens que no verifican', async () => {
  const huella = aleatoria();
  let f = conFetch({ [URL_A]: () => 503 });
  try {
    const s = await S.pedirSello(huella, tsaA());
    assert.equal(s.estado, 'fallido'); assert.equal(s.ultimoError, 'http_503'); sinUndefined(s);
  } finally { f.restaurar(); }

  f = conFetch({});
  try { assert.match((await S.pedirSello(huella, tsaA())).ultimoError, /^red: /); } finally { f.restaurar(); }

  f = conFetch({ [URL_A]: () => new Promise(() => {}) });
  try { assert.equal((await S.pedirSello(huella, tsaA(), { timeoutMs: 50 })).ultimoError, 'tiempo_agotado'); } finally { f.restaurar(); }

  // Rechazo de la TSA (PKIStatus 2).
  f = conFetch({ [URL_A]: () => seq(seq(int(Buffer.from([2])), seq(tlv(0x0c, Buffer.from('badAlg'))))) });
  try { assert.match((await S.pedirSello(huella, tsaA())).ultimoError, /^tsa_rechaza: estado 2 \(badAlg\)/); } finally { f.restaurar(); }

  // Responde «concedido» con un sello de OTRA huella → invalido, sin fecha.
  f = conFetch({ [URL_A]: () => responderTsa(S.peticionRfc3161(aleatoria())) });
  try {
    const s = await S.pedirSello(huella, tsaA());
    assert.equal(s.estado, 'invalido');
    assert.match(s.ultimoError, /huella_distinta/);
    assert.equal(s.genTime, null); assert.ok(s.token); sinUndefined(s);
  } finally { f.restaurar(); }

  // EKU no crítica → invalido.
  f = conFetch({ [URL_A]: (q) => responderTsa(q, PKI_TSA_NC) });
  try {
    const s = await S.pedirSello(huella, tsaA());
    assert.equal(s.estado, 'invalido'); assert.match(s.ultimoError, /eku_no_critica/);
  } finally { f.restaurar(); }

  assert.equal((await S.pedirSello('zz', tsaA())).ultimoError, 'huella_no_valida');
  assert.equal((await S.pedirSello(huella, tsaA({ url: 'https://u:p@x.invalid/tsr' }))).ultimoError, 'tsa_url_con_credenciales');
  assert.equal((await S.pedirSello(huella, tsaA({ autenticacion: { tipo: 'basica', secreto: 'TSA_X' } }))).ultimoError, 'falta_credencial');
});

test('pedirSello: autenticación básica por parámetro, sin que la credencial quede en el sello', async () => {
  const f = conFetch({ [URL_A]: (q) => responderTsa(q) });
  try {
    const cred = { usuario: 'usuario-prueba', contrasena: 'no-es-real-' + crypto.randomBytes(4).toString('hex') };
    const config = { activo: true, principal: tsaA({ autenticacion: { tipo: 'basica', secreto: 'TSA_CUALIFICADA' } }), respaldo: null };
    const s = await S.sellar(aleatoria(), config, { credenciales: { TSA_CUALIFICADA: cred } });
    assert.equal(s.estado, 'concedido');
    assert.equal(f.llamadas[0].op.headers.Authorization, 'Basic ' + Buffer.from(cred.usuario + ':' + cred.contrasena).toString('base64'));
    assert.ok(!JSON.stringify(s).includes(cred.contrasena));
  } finally { f.restaurar(); }
});

test('sellar: principal → respaldo, y espaciado entre peticiones a la misma TSA', async () => {
  const f = conFetch({ [URL_A]: () => 500, [URL_B]: (q) => responderTsa(q) });
  try {
    const config = { activo: true, principal: tsaA({ cualificada: true }), respaldo: tsaB() };
    const s = await S.sellar(aleatoria(), config);
    assert.equal(s.estado, 'concedido'); assert.equal(s.tsa.id, 'prueba-b');
    const sinRespaldo = await S.sellar(aleatoria(), { activo: true, principal: tsaA(), respaldo: null });
    assert.equal(sinRespaldo.estado, 'fallido'); assert.equal(sinRespaldo.tsa.id, 'prueba-a');
    const apagado = await S.sellar(aleatoria(), { activo: false, principal: tsaA() });
    assert.equal(apagado.ultimoError, 'sellado_inactivo');
  } finally { f.restaurar(); }

  const g = conFetch({ [URL_B]: (q) => responderTsa(q) });
  try {
    await Promise.all([1, 2, 3].map(() => S.pedirSello(aleatoria(), tsaB(), { espaciadoMs: 150 })));
    const t = g.llamadas.map((l) => l.at).sort((a, b) => a - b);
    // Los turnos se reservan cada 150 ms; un fetch puede salir algo tarde de su turno con la
    // máquina cargada, así que se mira el conjunto (≥ 2 turnos) y que ninguno vaya pegado.
    assert.ok(t[2] - t[0] >= 290 && t[1] - t[0] >= 75 && t[2] - t[1] >= 75, 'espaciado: ' + JSON.stringify(t));
  } finally { g.restaurar(); }
});

// ═══════════════════════════════════════════════════════════════════════════
// Merkle
// ═══════════════════════════════════════════════════════════════════════════

function mthRfc(hojas) {
  const H = (...b) => crypto.createHash('sha256').update(Buffer.concat(b)).digest();
  if (hojas.length === 0) return H();
  if (hojas.length === 1) return H(Buffer.from([0]), Buffer.from(hojas[0], 'hex'));
  let k = 1; while (k * 2 < hojas.length) k *= 2;
  return H(Buffer.from([1]), mthRfc(hojas.slice(0, k)), mthRfc(hojas.slice(k)));
}

test('Merkle RFC 6962: raíz, ruta y verificación de cada hoja (1 … 2^n+1 hojas)', () => {
  assert.equal(S.raizMerkle([]), S.huellaDeBytes(''));
  for (const n of [1, 2, 3, 4, 5, 7, 8, 9, 16, 17, 33]) {
    const hojas = Array.from({ length: n }, aleatoria);
    const raiz = S.raizMerkle(hojas);
    assert.equal(raiz, mthRfc(hojas).toString('hex'), 'n=' + n);
    for (let i = 0; i < n; i++) {
      const ruta = S.rutaMerkle(hojas, i);
      assert.ok(ruta.length <= Math.ceil(Math.log2(n)));
      assert.ok(S.verificarRutaMerkle(hojas[i], ruta, raiz), 'n=' + n + ' i=' + i);
      if (n > 1) {
        assert.ok(!S.verificarRutaMerkle(hojas[(i + 1) % n], ruta, raiz));
        const mala = ruta.map((p, j) => (j === 0 ? Object.assign({}, p, { lado: p.lado === 'i' ? 'd' : 'i' }) : p));
        assert.ok(!S.verificarRutaMerkle(hojas[i], mala, raiz));
      }
    }
  }
  assert.deepEqual(S.rutaMerkle([aleatoria()], 0), []);
  assert.throws(() => S.rutaMerkle([aleatoria()], 1));
  assert.equal(S.merkle.raiz, S.raizMerkle);
});

// ═══════════════════════════════════════════════════════════════════════════
// Cola con un Firestore de mentira
// ═══════════════════════════════════════════════════════════════════════════

function reloj(inicio) {
  let t = inicio.getTime();
  return { ahora: () => new Date(t), avanzar: (ms) => { t += ms; } };
}
const MIN = 60 * 1000;
const HORA = 60 * MIN;

test('cola: fallo, espera, reintento y concedido; nada undefined', async () => {
  const db = firestoreFalso();
  const r = reloj(new Date());
  const config = { activo: true, principal: tsaA(), respaldo: null };
  const huella = aleatoria();

  assert.equal(await S.encolarSello(db, { tipo: 'x', huella, objeto: { tipo: 'x', ruta: null, id: null }, config: { activo: false, principal: tsaA() } }), null);
  await assert.rejects(S.encolarSello(db, { tipo: 'x', huella, objeto: { tipo: 'x' }, ambito: { estado: 'z' }, config }));

  const id = await S.encolarSello(db, { tipo: 'consentimiento', huella, objeto: { tipo: 'consentimiento', ruta: 'clinics/c1/x/y', id: 'y' }, ambito: { clinicId: 'c1' }, config, ahora: r.ahora });
  const d0 = db.leer('sellos_tiempo', id);
  assert.equal(d0.estado, 'pendiente'); assert.equal(d0.clinicId, 'c1'); assert.equal(d0.modo, 'individual');
  assert.equal(d0.intentos, 0); assert.equal(d0.token, null); assert.equal(d0.loteId, null);
  assert.deepEqual(d0.objeto, { tipo: 'consentimiento', ruta: 'clinics/c1/x/y', id: 'y' });

  // Idempotencia por id.
  assert.equal(await S.encolarSello(db, { tipo: 'consentimiento', huella: aleatoria(), objeto: { tipo: 'c' }, config, id: 'fijo', ahora: r.ahora }), 'fijo');
  const h1 = db.leer('sellos_tiempo', 'fijo').huella;
  await S.encolarSello(db, { tipo: 'consentimiento', huella: aleatoria(), objeto: { tipo: 'c' }, config, id: 'fijo', ahora: r.ahora });
  assert.equal(db.leer('sellos_tiempo', 'fijo').huella, h1);

  let caida = true;
  const f = conFetch({ [URL_A]: (q) => (caida ? 503 : responderTsa(q)) });
  try {
    let p = await S.procesarSello(db, id, { config, ahora: r.ahora });
    assert.equal(p.accion, 'reintento');
    let d = db.leer('sellos_tiempo', id);
    assert.equal(d.intentos, 1); assert.equal(d.ultimoError, 'http_503'); assert.equal(d.estado, 'pendiente');
    assert.equal(d.proximoIntentoAt.getTime() - r.ahora().getTime(), 1 * MIN);
    assert.equal(d.procesandoHasta, null);

    p = await S.procesarSello(db, id, { config, ahora: r.ahora });
    assert.deepEqual([p.accion, p.motivo], ['omitido', 'espera']);

    r.avanzar(2 * MIN);
    await S.procesarSello(db, id, { config, ahora: r.ahora });
    d = db.leer('sellos_tiempo', id);
    assert.equal(d.intentos, 2);
    assert.equal(d.proximoIntentoAt.getTime() - r.ahora().getTime(), 5 * MIN);

    // Sin respaldo: pasadas 24 h se sigue con la principal y no se marca faltaCualificado.
    r.avanzar(25 * HORA);
    await S.procesarSello(db, id, { config, ahora: r.ahora });
    d = db.leer('sellos_tiempo', id);
    assert.equal(d.faltaCualificado, false); assert.equal(d.estado, 'pendiente');
    assert.equal(d.proximoIntentoAt.getTime() - r.ahora().getTime(), 15 * MIN);

    caida = false;
    r.avanzar(20 * MIN);
    const res = await S.procesarPendientes(db, { config, ahora: r.ahora, espaciadoMs: 0 });
    assert.equal(res.concedidos, 2); // el del id fijo también estaba pendiente
    d = db.leer('sellos_tiempo', id);
    assert.equal(d.estado, 'concedido'); assert.equal(d.intentos, 4);
    assert.equal(d.proximoIntentoAt, null); assert.equal(d.faltaCualificado, false);
    assert.equal(d.solicitadoAt.getTime(), d0.solicitadoAt.getTime());
    assert.equal(S.comprobarSello(d, { raices: [RAIZ_PRUEBA] }).ok, true);

    p = await S.procesarSello(db, id, { config, ahora: r.ahora });
    assert.deepEqual([p.accion, p.motivo], ['omitido', 'hecho']);
    for (const v of db.datos.values()) sinUndefined(v);
  } finally { f.restaurar(); }
});

test('cola: respaldo a las 24 h con faltaCualificado y, al volver la principal, el cualificado', async () => {
  const db = firestoreFalso();
  const r = reloj(new Date());
  const config = { activo: true, principal: tsaA({ cualificada: true }), respaldo: tsaB() };
  let principalCaida = true;
  const f = conFetch({ [URL_A]: (q) => (principalCaida ? 503 : responderTsa(q)), [URL_B]: (q) => responderTsa(q) });
  try {
    const id = await S.encolarSello(db, { tipo: 'informe_envio', huella: aleatoria(), objeto: { tipo: 'informe_envio', ruta: 'c/1', id: '1' }, ambito: { tenantId: 't1' }, config, ahora: r.ahora });
    await S.procesarSello(db, id, { config, ahora: r.ahora });
    r.avanzar(23 * HORA);
    await S.procesarSello(db, id, { config, ahora: r.ahora });
    assert.equal(db.leer('sellos_tiempo', id).estado, 'pendiente'); // aún no: la principal tiene 24 h

    r.avanzar(2 * HORA);
    const p = await S.procesarSello(db, id, { config, ahora: r.ahora });
    assert.deepEqual([p.accion, p.motivo], ['respaldo', 'falta_cualificado']);
    let d = db.leer('sellos_tiempo', id);
    assert.equal(d.estado, 'concedido'); assert.equal(d.tsa.id, 'prueba-b');
    assert.equal(d.faltaCualificado, true);
    assert.equal(d.proximoIntentoAt.getTime() - r.ahora().getTime(), 6 * HORA);
    assert.match(d.ultimoError, /^principal: http_503/);

    principalCaida = false;
    r.avanzar(6 * HORA);
    const res = await S.procesarPendientes(db, { config, ahora: r.ahora, espaciadoMs: 0 });
    assert.equal(res.concedidos, 1);
    d = db.leer('sellos_tiempo', id);
    assert.equal(d.tsa.id, 'prueba-a'); assert.equal(d.tsa.cualificada, true);
    assert.equal(d.faltaCualificado, false); assert.equal(d.proximoIntentoAt, null);
    assert.equal(d.adicionales.length, 1); assert.equal(d.adicionales[0].tsa.id, 'prueba-b');
    assert.equal(d.tenantId, 't1');
    assert.equal(S.comprobarSello(d.adicionales[0], { raices: [RAIZ_PRUEBA] }).ok, true);
    for (const v of db.datos.values()) sinUndefined(v);
  } finally { f.restaurar(); }
});

test('cola: lote diario (Merkle), un solo sello para todas las hojas', async () => {
  const db = firestoreFalso();
  const r = reloj(new Date());
  const config = { activo: true, principal: tsaA(), respaldo: null, porTipo: { episodio_version: 'lote' } };
  const f = conFetch({ [URL_A]: (q) => responderTsa(q) });
  try {
    const ids = [];
    for (let i = 0; i < 5; i++) {
      ids.push(await S.encolarSello(db, { tipo: 'episodio_version', huella: aleatoria(), objeto: { tipo: 'episodio_version', ruta: 'e/' + i, id: String(i) }, ambito: { clinicId: 'c' + (i % 2) }, config, ahora: r.ahora }));
      r.avanzar(MIN);
    }
    assert.equal(db.leer('sellos_tiempo', ids[0]).modo, 'lote');
    assert.equal(db.leer('sellos_tiempo', ids[0]).proximoIntentoAt, null);
    const nada = await S.procesarSello(db, ids[0], { config, ahora: r.ahora });
    assert.equal(nada.motivo, 'en_lote');

    let guardadas = null;
    const hasta = new Date(r.ahora().getTime() - 90 * 1000); // deja fuera la última hoja
    const res = await S.cerrarLote(db, { config, tipo: 'episodio_version', hasta, ahora: r.ahora, guardarHojas: async (loteId, hojas) => { guardadas = hojas; return 'system/lotes/' + loteId + '.json'; } });
    assert.equal(res.n, 4); assert.equal(res.estado, 'concedido');
    assert.equal(guardadas.length, 4);
    const lote = db.leer('sellos_tiempo_lotes', res.loteId);
    assert.equal(lote.raiz, res.raiz); assert.equal(lote.estado, 'concedido'); assert.equal(lote.hojasPath, 'system/lotes/' + res.loteId + '.json');
    assert.equal(lote.sello.id, res.selloId);
    const raizDoc = db.leer('sellos_tiempo', res.selloId);
    assert.equal(raizDoc.huella, res.raiz); assert.equal(raizDoc.loteDe, 'episodio_version');
    assert.equal(S.comprobarSello(raizDoc, { raices: [RAIZ_PRUEBA] }).ok, true);
    for (let i = 0; i < 4; i++) {
      const h = db.leer('sellos_tiempo', ids[i]);
      assert.equal(h.estado, 'concedido'); assert.equal(h.loteId, res.loteId); assert.equal(h.token, null);
      assert.equal(h.lote.indice, i);
      assert.ok(S.verificarRutaMerkle(h.huella, h.lote.ruta, h.lote.raiz));
      assert.equal(h.genTimeIso, raizDoc.genTimeIso);
    }
    assert.equal(db.leer('sellos_tiempo', ids[4]).loteId, null);
    assert.equal(await S.cerrarLote(db, { config, tipo: 'otro', hasta: r.ahora(), ahora: r.ahora }), null);

    // Paquete de verificación de una hoja: lote.json + verificar-lote.js, y openssl con -digest de la raíz.
    const hoja = db.leer('sellos_tiempo', ids[2]);
    const paquete = S.paqueteVerificacion({ documentoNombre: 'version-3.json', sello: raizDoc, hoja: { huella: hoja.huella, lote: hoja.lote }, raicesPem: [RAIZ_PRUEBA] });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paquete-'));
    try {
      for (const [n, b] of Object.entries(paquete)) fs.writeFileSync(path.join(dir, n), b);
      const nodeRes = spawnSync(process.execPath, [path.join(dir, 'verificar-lote.js')], { encoding: 'utf8' });
      assert.equal(nodeRes.status, 0, nodeRes.stdout + nodeRes.stderr);
      assert.match(nodeRes.stdout, /Coincide/);
      const leeme = paquete['LEEME.txt'].toString('utf8');
      assert.match(leeme, new RegExp('-digest ' + res.raiz));
      if (OPENSSL) {
        const o = openssl(['ts', '-verify', '-digest', res.raiz, '-in', 'version-3.tsr', '-CAfile', 'raiz.pem', '-untrusted', 'tsa.pem'], dir);
        assert.match(o.stdout, /Verification: OK/, o.stderr);
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    for (const v of db.datos.values()) sinUndefined(v);
  } finally { f.restaurar(); }
});

// ═══════════════════════════════════════════════════════════════════════════
// Paquete de verificación (individual) y huella del fuente
// ═══════════════════════════════════════════════════════════════════════════

test('paqueteVerificacion: el comando del LEEME verifica con openssl', async () => {
  const documento = crypto.randomBytes(2048);
  const f = conFetch({ [URL_A]: (q) => responderTsa(q) });
  let sello;
  try { sello = await S.pedirSello(S.huellaDeBytes(documento), tsaA()); } finally { f.restaurar(); }
  const paquete = S.paqueteVerificacion({ documentoNombre: 'consentimiento.pdf', sello, raicesPem: [RAIZ_PRUEBA] });
  assert.deepEqual(Object.keys(paquete).sort(), ['LEEME.txt', 'consentimiento.tsr', 'raiz.pem', 'tsa.pem']);
  const leeme = paquete['LEEME.txt'].toString('utf8');
  const linea = leeme.split('\n').find((l) => l.includes('-data "consentimiento.pdf"'));
  assert.ok(linea, leeme);
  assert.match(leeme, /-attime \d+/);

  // Con manifiesto: se sella el JSON canónico.
  const manifiesto = { tipo: 'informe_envio', ficheros: [{ nombre: 'a.pdf', sha256: aleatoria(), bytes: 10 }], sal: crypto.randomBytes(16).toString('hex') };
  const g = conFetch({ [URL_A]: (q) => responderTsa(q) });
  let selloM;
  try { selloM = await S.pedirSello(S.huellaCanonica(manifiesto), tsaA()); } finally { g.restaurar(); }
  const pm = S.paqueteVerificacion({ sello: selloM, manifiesto, raicesPem: [RAIZ_PRUEBA] });
  assert.equal(S.huellaDeBytes(pm['manifiesto.json']), selloM.huella);

  if (!OPENSSL) return;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paquete-'));
  try {
    for (const [n, b] of Object.entries(paquete)) fs.writeFileSync(path.join(dir, n), b);
    fs.writeFileSync(path.join(dir, 'consentimiento.pdf'), documento);
    const args = linea.trim().split(/\s+/).slice(1).map((a) => a.replace(/^"|"$/g, ''));
    assert.match(openssl(args, dir).stdout, /Verification: OK/);
    for (const [n, b] of Object.entries(pm)) fs.writeFileSync(path.join(dir, n), b);
    assert.match(openssl(['ts', '-verify', '-data', 'manifiesto.json', '-in', 'sello.tsr', '-CAfile', 'raiz.pem', '-untrusted', 'tsa.pem'], dir).stdout, /Verification: OK/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('huella del fichero fuente (para la paridad de la copia de eXCausis)', () => {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'src', 'sello', 'selloTiempo.ts'));
  const huella = crypto.createHash('sha256').update(fuente).digest('hex');
  console.log('[sello] SHA-256 de src/sello/selloTiempo.ts: ' + huella);
  assert.match(huella, /^[0-9a-f]{64}$/);
});
