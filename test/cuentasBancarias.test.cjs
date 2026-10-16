// Pruebas de las CUENTAS BANCARIAS de las fichas de Identity (0.12.0).
//
// La regla vivía triplicada (Identity, las functions de SaluFact y su
// frontend) y el canónico de Identity guardaba las cuentas TAL CUAL. Aquí queda
// en UN sitio, el núcleo del paquete (navegador y servidor), y es la que
// aplican los canónicos de Identity:
//
//   - el IBAN se guarda normalizado y con su dígito de control (mod-97)
//     comprobado: el OCR de una factura falla un dígito y un IBAN casi bueno
//     es una transferencia perdida;
//   - sin duplicados y con UNA predeterminada;
//   - al EDITAR la lista se conserva lo que la ficha ya sabía de cada cuenta
//     (de qué factura salió, cuándo se dio de alta, si alguien la verificó);
//   - y la defensa antifraude de las cuentas que llegan de una factura: a un
//     proveedor que YA tiene cuentas no se le añade otra sin que una persona
//     lo confirme (es la señal nº 1 del fraude de cambio de IBAN).
//
//   npm test   (compila y ejecuta)

const test = require('node:test');
const assert = require('node:assert/strict');

const C = () => require('../dist-cjs/index.js');

const BUENO = 'ES9121000418450200051332';
const OTRO = 'DE89370400440532013000';
const MALO = 'ES9121000418450200051333'; // un dígito cambiado

test('se exporta desde el núcleo (navegador y servidor)', () => {
  for (const f of ['normalizarIban', 'esIbanValido', 'formatearIban', 'crearCuenta', 'normalizarCuentas', 'anadirCuenta', 'evaluarIban', 'decidirRegistroDeCuenta']) {
    assert.equal(typeof C()[f], 'function', `falta ${f}`);
  }
});

test('IBAN: se normaliza (mayúsculas, sin separadores) y se valida con el dígito de control y la longitud del país', () => {
  const { normalizarIban, esIbanValido, formatearIban } = C();
  assert.equal(normalizarIban(' es91 2100-0418 4502 0005 1332 '), BUENO);
  assert.equal(esIbanValido('es91 2100 0418 4502 0005 1332'), true);
  assert.equal(esIbanValido(OTRO), true);
  assert.equal(esIbanValido(MALO), false, 'un dígito cambiado pasa');
  assert.equal(esIbanValido('ES91210004184502000513'), false, 'longitud de España');
  assert.equal(esIbanValido(''), false);
  assert.equal(esIbanValido(null), false);
  assert.equal(formatearIban(BUENO), 'ES91 2100 0418 4502 0005 1332');
});

test('normalizarCuentas: descarta vacías, rechaza las inválidas (las devuelve para avisar), deduplica y deja UNA predeterminada', () => {
  const { normalizarCuentas } = C();
  const r = normalizarCuentas([
    { iban: '' },
    { iban: MALO },
    { iban: BUENO.toLowerCase(), alias: ' Principal ' },
    { iban: BUENO },
    { iban: OTRO, predeterminada: true },
  ]);
  assert.deepEqual(r.rechazados, [MALO]);
  assert.deepEqual(r.cuentas.map((c) => c.iban), [BUENO, OTRO]);
  assert.equal(r.cuentas.filter((c) => c.predeterminada).length, 1);
  assert.equal(r.cuentas[1].predeterminada, true);
  assert.equal(r.cuentas[0].alias, 'Principal');
  for (const c of r.cuentas) {
    for (const [k, v] of Object.entries(c)) assert.notEqual(v, undefined, `${k} undefined`);
    assert.equal(typeof c.id, 'string');
    assert.ok(c.id.length > 0);
  }
  assert.deepEqual(normalizarCuentas('no es una lista'), { cuentas: [], rechazados: [] });
});

test('normalizarCuentas con la lista guardada: una cuenta que ya estaba conserva su id, su origen, su factura, su alta y su verificación', () => {
  const { normalizarCuentas } = C();
  const guardada = {
    id: 'k1', iban: BUENO, alias: 'Viejo', titular: null, predeterminada: true, origen: 'ia', verificada: true,
    facturaOrigen: { id: 'f1', numero: 'A-1', fecha: '2026-01-01' }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
  // El formulario la reenvía sin los metadatos (y sin marcarla verificada).
  const r = normalizarCuentas([{ iban: BUENO, alias: 'Nuevo' }, { iban: OTRO }], [guardada]);
  const k1 = r.cuentas.find((c) => c.iban === BUENO);
  assert.equal(k1.id, 'k1');
  assert.equal(k1.origen, 'ia');
  assert.deepEqual(k1.facturaOrigen, guardada.facturaOrigen);
  assert.equal(k1.createdAt, guardada.createdAt);
  assert.equal(k1.verificada, true, 'reenviar la cuenta desde un formulario le quitaba la verificación');
  assert.equal(k1.alias, 'Nuevo');
  const nueva = r.cuentas.find((c) => c.iban === OTRO);
  assert.equal(nueva.origen, 'manual');
  assert.equal(nueva.verificada, false);
  // Y una que no cambia no mueve su updatedAt.
  const igual = normalizarCuentas([{ iban: BUENO, alias: 'Viejo' }], [guardada]).cuentas[0];
  assert.equal(igual.updatedAt, guardada.updatedAt);
});

test('anadirCuenta: añade sin sustituir; el mismo IBAN no se duplica; la primera queda predeterminada', () => {
  const { anadirCuenta } = C();
  const a = anadirCuenta([], { iban: BUENO });
  assert.equal(a.resultado, 'anadida');
  assert.equal(a.cuentas[0].predeterminada, true);
  const b = anadirCuenta(a.cuentas, { iban: OTRO });
  assert.equal(b.resultado, 'anadida');
  assert.deepEqual(b.cuentas.map((c) => c.iban), [BUENO, OTRO]);
  assert.equal(b.cuentas[0].predeterminada, true);
  assert.equal(anadirCuenta(b.cuentas, { iban: BUENO }).resultado, 'ya_existia');
  assert.equal(anadirCuenta(b.cuentas, { iban: MALO }).resultado, 'iban_invalido');
  // No muta la lista que recibe.
  assert.equal(a.cuentas.length, 1);
});

test('evaluarIban: sin IBAN, primera cuenta, conocida o DISCREPANTE', () => {
  const { evaluarIban } = C();
  const conocidas = [{ iban: BUENO }];
  assert.equal(evaluarIban('', conocidas), 'sin_iban');
  assert.equal(evaluarIban(BUENO, []), 'primera');
  assert.equal(evaluarIban(BUENO.toLowerCase(), conocidas), 'conocido');
  assert.equal(evaluarIban(OTRO, conocidas), 'discrepante');
});

test('antifraude (decidirRegistroDeCuenta): proveedor sin cuentas → se añade sola, sin verificar y con su factura', () => {
  const { decidirRegistroDeCuenta } = C();
  const f = { id: 'f9', numero: 'B-9', fecha: '2026-10-01' };
  const r = decidirRegistroDeCuenta([], { iban: BUENO, facturaOrigen: f });
  assert.equal(r.resultado, 'anadida');
  assert.equal(r.escribir, true);
  assert.equal(r.cuentas[0].origen, 'ia');
  assert.equal(r.cuentas[0].verificada, false);
  assert.deepEqual(r.cuentas[0].facturaOrigen, f);
});

test('antifraude: proveedor CON otras cuentas y un IBAN nuevo → NO se escribe sin confirmación de una persona', () => {
  const { decidirRegistroDeCuenta, anadirCuenta } = C();
  const actuales = anadirCuenta([], { iban: BUENO }).cuentas;
  const r = decidirRegistroDeCuenta(actuales, { iban: OTRO, facturaOrigen: { id: 'f', numero: 'n', fecha: 'd' } });
  assert.equal(r.resultado, 'requiere_confirmacion');
  assert.equal(r.escribir, false);
  assert.deepEqual(r.cuentas.map((c) => c.iban), [BUENO]);
  // Confirmada: se añade, verificada, sin tocar la que había.
  const c = decidirRegistroDeCuenta(actuales, { iban: OTRO, confirmada: true });
  assert.equal(c.resultado, 'anadida');
  assert.equal(c.escribir, true);
  assert.deepEqual(c.cuentas.map((x) => x.iban), [BUENO, OTRO]);
  assert.equal(c.cuentas[1].verificada, true);
  assert.equal(c.cuentas[0].predeterminada, true);
});

test('antifraude: IBAN ya registrado → no duplica (sin escribir); confirmado → se marca verificado', () => {
  const { decidirRegistroDeCuenta, anadirCuenta } = C();
  const actuales = anadirCuenta([], { iban: BUENO }).cuentas;
  const r = decidirRegistroDeCuenta(actuales, { iban: BUENO });
  assert.equal(r.resultado, 'ya_existia');
  assert.equal(r.escribir, false);
  const c = decidirRegistroDeCuenta(actuales, { iban: BUENO, confirmada: true });
  assert.equal(c.resultado, 'ya_existia');
  assert.equal(c.escribir, true);
  assert.equal(c.cuentas[0].verificada, true);
  assert.equal(actuales[0].verificada, false, 'mutó la lista recibida');
});

test('antifraude: un IBAN que no pasa el dígito de control no se escribe nunca, ni confirmado', () => {
  const { decidirRegistroDeCuenta } = C();
  for (const confirmada of [false, true]) {
    const r = decidirRegistroDeCuenta([], { iban: MALO, confirmada });
    assert.equal(r.resultado, 'iban_invalido');
    assert.equal(r.escribir, false);
  }
});
