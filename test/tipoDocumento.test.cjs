// Pruebas del vocabulario del tipo de documento (`tipoIdentificador`) y del
// traductor de país, con el runner de Node y sin dependencias.
//
//   npm test   (compila y ejecuta)

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TIPOS_IDENTIFICADOR, OPCIONES_TIPO_IDENTIFICADOR, PREFIJOS_NIF_IVA,
  esTipoIdentificador, etiquetaTipoIdentificador, idTypeAeatDe, esNifEspanol, opcionesTipoIdentificador,
  paisDeNifIva, normalizarDocumento, validarDocumento, tipoPorForma, resolverDocumento,
  PAISES_ISO, codigoPaisDe, nombrePaisDe, esCodigoPais,
} = require('../dist-cjs/index.js');

// ── Vocabulario ─────────────────────────────────────────────────────────────

test('el vocabulario conserva los valores de siempre y cubre la lista L7', () => {
  for (const v of ['DNI', 'NIE', 'PASAPORTE', 'OTRO']) assert.ok(TIPOS_IDENTIFICADOR.includes(v), v);
  const l7 = OPCIONES_TIPO_IDENTIFICADOR.map((o) => o.idTypeAeat).filter(Boolean).sort();
  assert.deepEqual(l7, ['02', '03', '04', '05', '06', '07']);
  // Los nombres que espera SaluFact (verifactu/destinatario-registro.ts).
  const saluFact = { NIF_IVA: '02', PASAPORTE: '03', DOCUMENTO_PAIS: '04', CERTIFICADO_RESIDENCIA: '05', OTRO_DOCUMENTO: '06', NO_CENSADO: '07' };
  for (const [v, id] of Object.entries(saluFact)) assert.equal(idTypeAeatDe(v), id, v);
  for (const v of ['DNI', 'NIE', 'NIF']) { assert.equal(idTypeAeatDe(v), null); assert.ok(esNifEspanol(v)); }
  assert.equal(esNifEspanol('NO_CENSADO'), false);
});

test('una opción por valor, con etiqueta y ayuda en castellano', () => {
  assert.deepEqual(OPCIONES_TIPO_IDENTIFICADOR.map((o) => o.valor), [...TIPOS_IDENTIFICADOR]);
  for (const o of OPCIONES_TIPO_IDENTIFICADOR) {
    assert.ok(o.etiqueta.length > 2 && o.ayuda.length > 10, o.valor);
  }
  assert.equal(etiquetaTipoIdentificador('NIF_IVA'), 'NIF-IVA de otro país de la UE');
  assert.equal(etiquetaTipoIdentificador('RARO'), 'RARO');
  assert.equal(etiquetaTipoIdentificador(null), '');
  assert.ok(esTipoIdentificador('PASAPORTE'));
  assert.ok(!esTipoIdentificador('pasaporte'));
  assert.ok(esTipoIdentificador('PENDIENTE'));
  assert.ok(!esTipoIdentificador('PROVISIONAL'));
});

test('el selector no ofrece OTRO ni PENDIENTE, pero enseña el que ya está', () => {
  const valores = (xs) => xs.map((x) => x.value);
  assert.ok(!valores(opcionesTipoIdentificador('paciente')).includes('OTRO'));
  assert.ok(!valores(opcionesTipoIdentificador('paciente')).includes('PENDIENTE'));
  assert.ok(valores(opcionesTipoIdentificador('paciente', 'OTRO')).includes('OTRO'));
  assert.ok(valores(opcionesTipoIdentificador('paciente', 'PENDIENTE')).includes('PENDIENTE'));
  assert.ok(valores(opcionesTipoIdentificador('empresa', 'PENDIENTE')).includes('PENDIENTE'));
  // «Sin identificador» se ofrece a una empresa y nunca a un paciente.
  assert.ok(valores(opcionesTipoIdentificador('empresa')).includes('SIN_IDENTIFICADOR'));
  assert.ok(!valores(opcionesTipoIdentificador('paciente', 'SIN_IDENTIFICADOR')).includes('SIN_IDENTIFICADOR'));
  assert.equal(opcionesTipoIdentificador('empresa')[0].value, 'DNI');
  assert.ok(opcionesTipoIdentificador('empresa').every((o) => o.label && o.description));
});

// ── Validación por tipo ─────────────────────────────────────────────────────

const valido = (tipo, v) => validarDocumento(tipo, v).valido;

test('DNI y NIE: letra de control, con el cero inicial añadido', () => {
  assert.ok(valido('DNI', '12345678Z'));
  assert.equal(validarDocumento('DNI', '5004388w').normalizado, '05004388W');
  assert.ok(!valido('DNI', '12345678A'));
  assert.match(validarDocumento('DNI', '12345678A').mensaje, /termina en Z/);
  assert.ok(!valido('DNI', 'X1234567L'));
  assert.ok(!valido('NIE', 'X1234567M'));
});

test('NIF de entidad (CIF): carácter de control según la letra; K/L/M con letra', () => {
  assert.ok(valido('NIF', 'B12345674'));
  assert.ok(!valido('NIF', 'B1234567D'));     // B lleva cifra
  assert.ok(valido('NIF', 'Q2826000H'));
  assert.ok(!valido('NIF', 'Q28260008'));     // Q lleva letra
  assert.ok(valido('NIF', 'G12345674'));      // G admite cifra…
  assert.ok(valido('NIF', 'G1234567D'));      // …o letra
  assert.ok(!valido('NIF', 'B12345675'));
  assert.ok(valido('NIF', 'K1234567L'));
  assert.ok(!valido('NIF', 'K1234567M'));
  assert.match(validarDocumento('NIF', '12345678Z').mensaje, /elija «DNI»/);
  assert.match(validarDocumento('NIF', 'X1234567L').mensaje, /elija «NIE»/);
  assert.ok(!valido('NIF', 'I1234567'));
});

test('NIF-IVA: prefijo de un Estado de la UE y su estructura; ni ES ni GB', () => {
  assert.ok(valido('NIF_IVA', 'FR12345678901'));
  assert.equal(normalizarDocumento('NIF_IVA', 'fr 123.456.789-01'), 'FR12345678901');
  assert.ok(valido('NIF_IVA', 'fr 123.456.789-01'));
  assert.ok(valido('NIF_IVA', 'DE123456789'));
  assert.ok(valido('NIF_IVA', 'EL123456789'));
  assert.ok(valido('NIF_IVA', 'XI123456789'));
  assert.ok(valido('NIF_IVA', 'ATU12345678'));
  assert.ok(!valido('NIF_IVA', 'DE12345678'));
  assert.ok(!valido('NIF_IVA', 'IT1234'));
  assert.ok(!valido('NIF_IVA', 'RO0123'));
  assert.match(validarDocumento('NIF_IVA', 'ESB12345674').mensaje, /NIF español/);
  assert.match(validarDocumento('NIF_IVA', 'GB123456789').mensaje, /Irlanda del Norte/);
  assert.match(validarDocumento('NIF_IVA', 'US123456789').mensaje, /código del país/);
  assert.match(validarDocumento('NIF_IVA', '123456789').mensaje, /código del país/);
  assert.equal(PREFIJOS_NIF_IVA.length, 27);
  assert.ok(!PREFIJOS_NIF_IVA.includes('ES') && !PREFIJOS_NIF_IVA.includes('GB') && !PREFIJOS_NIF_IVA.includes('GR'));
  assert.equal(paisDeNifIva('EL123456789'), 'GR');
  assert.equal(paisDeNifIva('XI123456789'), 'GB');
  assert.equal(paisDeNifIva('pt123456789'), 'PT');
  assert.equal(paisDeNifIva('US1'), null);
});

test('no censado: el NIF de una persona física', () => {
  assert.ok(valido('NO_CENSADO', '12345678Z'));
  assert.ok(valido('NO_CENSADO', 'X1234567L'));
  assert.ok(valido('NO_CENSADO', 'K1234567L'));
  assert.ok(!valido('NO_CENSADO', '12345678A'));
  assert.ok(!valido('NO_CENSADO', 'B12345674'));
  assert.ok(!valido('NO_CENSADO', 'AB123456'));
});

test('documentos extranjeros: libres, de 3 a 20 letras o cifras', () => {
  for (const t of ['PASAPORTE', 'DOCUMENTO_PAIS', 'CERTIFICADO_RESIDENCIA', 'OTRO_DOCUMENTO', 'OTRO']) {
    assert.ok(valido(t, 'AB 123 456'), t);
    assert.equal(validarDocumento(t, 'ab 123 456').normalizado, 'AB123456');
    assert.ok(!valido(t, 'A1'), t);
    assert.ok(!valido(t, 'A'.repeat(21)), t);
    assert.ok(valido(t, 'A'.repeat(20)), t);
    assert.ok(!valido(t, ''), t);
    assert.ok(!valido(t, 'PEND-9001'), t);
  }
});

test('pendiente: PEND-n o el número que hay que corregir', () => {
  assert.ok(valido('PENDIENTE', 'PEND-9001'));
  assert.ok(valido('PENDIENTE', '12345678A'));
  assert.ok(!valido('PENDIENTE', ''));
  assert.ok(!valido('PENDIENTE', 'A'.repeat(21)));
});

test('sin identificador: vacío o una referencia interna, nunca un documento declarable', () => {
  assert.ok(valido('SIN_IDENTIFICADOR', ''));
  assert.ok(valido('SIN_IDENTIFICADOR', null));
  assert.ok(valido('SIN_IDENTIFICADOR', 'ACME INC'));
  assert.ok(!valido('SIN_IDENTIFICADOR', 'A'.repeat(21)));
  assert.equal(idTypeAeatDe('SIN_IDENTIFICADOR'), null);
  assert.equal(esNifEspanol('SIN_IDENTIFICADOR'), false);
});

test('el tipo por la forma: solo lo español; lo demás no se adivina', () => {
  assert.equal(tipoPorForma('12345678Z'), 'DNI');
  assert.equal(tipoPorForma('5004388W'), 'DNI');
  assert.equal(tipoPorForma('X1234567L'), 'NIE');
  assert.equal(tipoPorForma('B12345674'), 'NIF');
  assert.equal(tipoPorForma('K1234567L'), 'NIF');
  assert.equal(tipoPorForma('PEND-9001'), 'PENDIENTE');
  assert.equal(tipoPorForma('FR12345678901'), null);
  assert.equal(tipoPorForma('AB123456'), null);
  assert.equal(tipoPorForma(''), null);
});

// ── Resolución (lo que usan el alta y la edición de Identity) ────────────────

test('resolver con tipo elegido: valida contra ese tipo', () => {
  assert.deepEqual(resolverDocumento({ entidad: 'paciente', valor: 'ab123456', tipo: 'DOCUMENTO_PAIS' }),
    { ok: true, tipo: 'DOCUMENTO_PAIS', normalizado: 'AB123456' });
  // Un pasaporte que parece un DNI con la letra mal: elegido a mano, vale.
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: '12345678A', tipo: 'PASAPORTE' }).ok, true);
  assert.equal(resolverDocumento({ entidad: 'empresa', valor: 'FR12345678901', tipo: 'nif_iva' }).tipo, 'NIF_IVA');
  assert.equal(resolverDocumento({ entidad: 'empresa', valor: 'B12345675', tipo: 'NIF' }).ok, false);
  assert.match(resolverDocumento({ entidad: 'paciente', valor: 'AB123', tipo: 'CIF' }).mensaje, /no es válido/);
  assert.match(resolverDocumento({ entidad: 'paciente', valor: 'AB123', tipo: 'PROVISIONAL' }).mensaje, /no es válido/);
  assert.equal(resolverDocumento({ entidad: 'empresa', valor: 'PEND-1', tipo: 'PENDIENTE' }).ok, false);
  assert.match(resolverDocumento({ entidad: 'paciente', valor: 'AB123', tipo: 'SIN_IDENTIFICADOR' }).mensaje, /no es un tipo de documento/);
  assert.deepEqual(resolverDocumento({ entidad: 'empresa', valor: '', tipo: 'SIN_IDENTIFICADOR' }), { ok: true, tipo: 'SIN_IDENTIFICADOR', normalizado: '' });
  assert.equal(resolverDocumento({ entidad: 'empresa', valor: '', tipoActual: 'SIN_IDENTIFICADOR' }).tipo, 'SIN_IDENTIFICADOR');
});

test('OTRO no se elige: solo se conserva si ya estaba', () => {
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: 'AB123456', tipo: 'OTRO' }).ok, false);
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: 'AB123456', tipo: 'OTRO', tipoActual: 'OTRO' }).ok, true);
});

test('PENDIENTE no se elige: se conserva con el número a corregir y sale en cuanto el número es bueno', () => {
  // Ficha con un DNI que no cuadra: se puede guardar el teléfono sin tocar el documento.
  assert.deepEqual(resolverDocumento({ entidad: 'paciente', valor: '12345678A', tipo: 'PENDIENTE', tipoActual: 'PENDIENTE' }),
    { ok: true, tipo: 'PENDIENTE', normalizado: '12345678A' });
  // Se corrige el número sin cambiar el selector: pasa a su tipo.
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: '12345678Z', tipo: 'PENDIENTE', tipoActual: 'PENDIENTE' }).tipo, 'DNI');
  assert.equal(resolverDocumento({ entidad: 'empresa', valor: 'B12345674', tipo: 'PENDIENTE', tipoActual: 'PENDIENTE' }).tipo, 'NIF');
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: 'PEND-9001', tipo: 'PENDIENTE' }).tipo, 'PENDIENTE');
  // No se elige para un número de verdad.
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: 'AB123456', tipo: 'PENDIENTE', tipoActual: 'PASAPORTE' }).ok, false);
});

test('resolver sin tipo: la forma española manda', () => {
  assert.deepEqual(resolverDocumento({ entidad: 'paciente', valor: '5004388w', tipoActual: 'PASAPORTE' }),
    { ok: true, tipo: 'DNI', normalizado: '05004388W' });
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: '12345678A' }).ok, false);
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: 'PEND-9001' }).tipo, 'PENDIENTE');
  assert.equal(resolverDocumento({ entidad: 'empresa', valor: 'PEND-9001' }).ok, false);
  assert.equal(resolverDocumento({ entidad: 'empresa', valor: 'b12345674' }).tipo, 'NIF');
});

test('resolver sin tipo y forma extranjera: se conserva el guardado; si no, pasaporte o se pregunta', () => {
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: 'ZZ998877', tipoActual: 'DOCUMENTO_PAIS' }).tipo, 'DOCUMENTO_PAIS');
  assert.equal(resolverDocumento({ entidad: 'empresa', valor: 'DE999999999', tipoActual: 'NIF_IVA' }).tipo, 'NIF_IVA');
  // El guardado era NIF-IVA y el nuevo número no lo es: paciente → pasaporte.
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: 'ZZ998877', tipoActual: 'NIF_IVA' }).tipo, 'PASAPORTE');
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: 'ZZ998877', tipoActual: 'DNI' }).tipo, 'PASAPORTE');
  assert.equal(resolverDocumento({ entidad: 'paciente', valor: 'ZZ998877' }).tipo, 'PASAPORTE');
  const empresa = resolverDocumento({ entidad: 'empresa', valor: 'ZZ998877' });
  assert.equal(empresa.ok, false);
  assert.match(empresa.mensaje, /Indique el tipo de documento/);
});

// ── País ────────────────────────────────────────────────────────────────────

test('país: los 249 de la ISO más Kosovo, cada nombre vuelve a su código', () => {
  assert.equal(PAISES_ISO.length, 250);
  assert.equal(new Set(PAISES_ISO.map((p) => p.codigo)).size, 250);
  for (const p of PAISES_ISO) {
    assert.match(p.codigo, /^[A-Z]{2}$/);
    assert.equal(codigoPaisDe(p.nombre), p.codigo, p.nombre);
    assert.equal(codigoPaisDe(p.codigo), p.codigo);
    assert.equal(nombrePaisDe(p.codigo), p.nombre);
    assert.ok(esCodigoPais(p.codigo));
  }
  // Ni reservas ni códigos retirados.
  for (const c of ['EU', 'UN', 'ZZ', 'UK', 'YU', 'AN', 'SU']) assert.ok(!esCodigoPais(c), c);
});

test('país: castellano con y sin tildes, inglés, alias y códigos', () => {
  const casos = {
    'España': 'ES', 'ESPAÑA': 'ES', 'espana': 'ES', 'Spain': 'ES', 'es': 'ES', 'Canarias': 'ES', 'Reino de España': 'ES',
    'Países Bajos': 'NL', 'paises bajos': 'NL', 'Holanda': 'NL', 'Netherlands': 'NL',
    'Estados Unidos': 'US', 'Estados Unidos de América': 'US', 'United States': 'US', 'EEUU': 'US', 'EE. UU.': 'US', 'USA': 'US',
    'Reino Unido': 'GB', 'United Kingdom': 'GB', 'UK': 'GB', 'Inglaterra': 'GB',
    'Arabia Saudí': 'SA', 'Arabia Saudita': 'SA', 'Côte d’Ivoire': 'CI', 'Costa de Marfil': 'CI',
    'Türkiye': 'TR', 'Turquia': 'TR', 'Chequia': 'CZ', 'República Checa': 'CZ',
    'Luxemburgo': 'LU', 'Andorra': 'AD', 'Ireland': 'IE', 'Irlanda': 'IE', 'Singapur': 'SG', 'Malta': 'MT',
    'Rumanía': 'RO', 'Rumania': 'RO', 'Bélgica': 'BE', 'Suiza': 'CH', 'México': 'MX', 'Kenia': 'KE',
    'Hong Kong': 'HK', 'Kosovo': 'XK', 'Gibraltar': 'GI', 'Puerto Rico': 'PR',
  };
  for (const [texto, codigo] of Object.entries(casos)) assert.equal(codigoPaisDe(texto), codigo, texto);
});

test('país: lo que no se reconoce es null, nunca España', () => {
  for (const t of ['', '   ', null, undefined, 'Narnia', 'XX', 'Corea', 'Europa', 'EU']) assert.equal(codigoPaisDe(t), null, String(t));
  assert.equal(nombrePaisDe('fr'), 'Francia');
  assert.equal(nombrePaisDe('ZZ'), null);
  assert.equal(nombrePaisDe(null), null);
});
