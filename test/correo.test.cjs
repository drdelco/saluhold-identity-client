// Pruebas de @saluhold/identity-client/correo con el runner de Node
// (`node --test`), sin dependencias: el paquete se instala desde git en las
// Cloud Functions y cada devDependency de más se descargaría en cada build.
//
//   npm test   (compila y ejecuta)

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  renderCorreo, MARCAS, TONOS, NEUTROS, TEXTOS_MARCO, IDIOMAS_SUITE, contraste, resolverAcento,
} = require('../dist-cjs/correo');

const TENANT = {
  nombre: 'Clínica Olivar',
  logoUrl: 'https://logos.ejemplo.es/olivar.png',
  colorPrimario: '#2f6f62',
  direccion: 'Calle del Olivar 14, 03001 Alicante',
  telefono: '965 12 34 56',
  email: 'hola@olivar.es',
};

const BLOQUES = [
  { tipo: 'parrafo', texto: 'Hola, **Carmen**:\nsegunda línea' },
  { tipo: 'tabla', filas: [{ etiqueta: 'Fecha', valor: '29/09/2026', detalle: 'martes' }, { etiqueta: 'Importe', valor: '120,00 €', destacado: true }] },
  { tipo: 'rejilla', columnas: ['Hora', 'Paciente'], filas: [['09:00', { texto: 'Ana', detalle: '600 111 222' }]] },
  { tipo: 'boton', texto: 'Confirmar', url: 'https://salufile.com/c?t=1' },
  { tipo: 'lista', titulo: 'Adjuntos', items: ['Informe', 'Receta'] },
  { tipo: 'caja', tono: 'aviso', titulo: 'Ojo', texto: 'Caduca pronto' },
  { tipo: 'separador' },
  { tipo: 'firma', despedida: 'Un saludo,', nombre: 'Dra. Ruiz', detalle: 'Ginecología' },
  { tipo: 'nota', texto: 'Letra pequeña' },
];

const base = (extra = {}) => ({ app: 'saluFile', variante: 'C', idioma: 'es', titulo: 'Título', bloques: BLOQUES, ...extra });

// ─── Variantes ──────────────────────────────────────────────────────────────

test('C: cabecera con el icono PNG y el wordmark de dos tonos de la app, pie SaluHold en gris', () => {
  for (const app of Object.keys(MARCAS)) {
    const m = MARCAS[app];
    const { html, fromName } = renderCorreo(base({ app }));
    assert.ok(html.includes(`src="${m.iconoUrl}"`), `${app}: icono`);
    assert.ok(html.includes(`color:${m.wordmark[0].color};">${m.wordmark[0].texto}<`), `${app}: primer tramo del wordmark`);
    assert.ok(html.includes(`color:${m.wordmark[1].color};">${m.wordmark[1].texto}<`), `${app}: segundo tramo`);
    assert.ok(html.includes(`border-top:3px solid ${m.acento}`), `${app}: filete de la app`);
    assert.ok(html.includes(`background-color:${m.accion}`), `${app}: botón del color de acción`);
    assert.ok(html.includes('SaluHold'), `${app}: pie SaluHold`);
    assert.equal(fromName, m.nombre);
    // Nada de los colores retirados en el pie ni en ningún sitio.
    for (const viejo of ['#06B6D4', '#A3E635', '#6366F1', '#1a4280']) assert.ok(!html.includes(viejo), `${app}: color retirado ${viejo}`);
  }
});

test('C: el pie nombra las apps hermanas sin color de marca (Factronia no las nombra)', () => {
  const { html } = renderCorreo(base());
  for (const a of ['SaluFile', 'SaluFirst', 'SaluFact']) {
    assert.ok(html.includes(`color:${NEUTROS.gris};text-decoration:none;">${a}</a>`), a);
  }
  const f = renderCorreo(base({ app: 'factronia' })).html;
  assert.ok(!f.includes('>SaluFirst</a>'));
});

test('A: logo del centro dentro de la tarjeta, su color, sus datos en el pie y «Enviado con» la app', () => {
  const { html, fromName, meta } = renderCorreo(base({ variante: 'A', tenant: TENANT }));
  assert.ok(html.includes(`src="${TENANT.logoUrl}"`));
  assert.ok(html.includes('max-height:56px'));
  assert.ok(!html.includes(`width="32" height="32"`), 'sin la cabecera de la app');
  assert.ok(html.includes(`border-top:3px solid ${TENANT.colorPrimario}`));
  assert.ok(html.includes(`background-color:${TENANT.colorPrimario}`), 'botón del color del centro');
  assert.ok(html.includes(TENANT.direccion) && html.includes(TENANT.telefono) && html.includes(TENANT.email));
  assert.ok(html.includes('Enviado con'));
  assert.ok(html.includes(`src="${MARCAS.saluFile.iconoUrl}" width="14"`), 'icono pequeño en el crédito');
  assert.equal(fromName, 'Clínica Olivar (vía SaluFile)');
  assert.equal(meta.acento.origen, 'centro');
});

test('A sin logo: el nombre del centro en tipografía sobria y el acento de la app', () => {
  const { html, meta } = renderCorreo(base({ variante: 'A', tenant: { nombre: 'Consulta Dr. Soler' } }));
  assert.ok(html.includes('Georgia'));
  assert.ok(html.includes('>Consulta Dr. Soler</span>'));
  assert.ok(!html.includes('max-height:56px'));
  assert.equal(meta.acento.origen, 'app');
  assert.ok(html.includes(`border-top:3px solid ${MARCAS.saluFile.acento}`));
});

test('A sin tenant cae a la cabecera de la app (no rompe)', () => {
  const { html, fromName } = renderCorreo(base({ variante: 'A', tenant: null }));
  assert.ok(html.includes(MARCAS.saluFile.iconoUrl));
  assert.equal(fromName, 'SaluFile');
});

test('B: sin cabecera, sin imágenes ni color; membrete del remitente y «Enviado mediante» fuera de la tarjeta', () => {
  const { html, fromName } = renderCorreo(base({ variante: 'B', remitente: { nombre: 'Dra. Elena Ruiz', detalle: 'Ginecología' }, tenant: TENANT }));
  assert.ok(!/<img\b/.test(html), 'ninguna imagen');
  assert.ok(!html.includes('border-top:3px solid'), 'sin filete de color');
  assert.ok(html.includes('Dra. Elena Ruiz'));
  assert.ok(html.includes('Enviado mediante'));
  assert.equal(fromName, 'Dra. Elena Ruiz');
  // Sin remitente explícito, firma el centro.
  assert.equal(renderCorreo(base({ variante: 'B', tenant: TENANT })).fromName, 'Clínica Olivar');
});

test('un solo botón primario: el segundo baja a enlace', () => {
  const { html } = renderCorreo(base({ bloques: [
    { tipo: 'boton', texto: 'Uno', url: 'https://a.es/1' },
    { tipo: 'boton', texto: 'Dos', url: 'https://a.es/2' },
  ] }));
  assert.equal((html.match(/<td bgcolor="#3d6589"/g) || []).length, 1);
  assert.ok(html.includes('Dos&nbsp;&rarr;'));
});

test('app o variante desconocidas lanzan', () => {
  assert.throws(() => renderCorreo(base({ app: 'saluX' })), /app desconocida/);
  assert.throws(() => renderCorreo(base({ variante: 'D' })), /variante desconocida/);
});

// ─── Escape ─────────────────────────────────────────────────────────────────

const MALO = '<script>alert(1)</script>"><img src=x onerror=alert(2)>\'';

test('escapa TODO el contenido de usuario', () => {
  const t = { nombre: MALO, logoUrl: null, colorPrimario: MALO, direccion: MALO, telefono: MALO, email: MALO, web: MALO };
  const bloques = [
    { tipo: 'parrafo', texto: MALO },
    { tipo: 'tabla', filas: [{ etiqueta: MALO, valor: MALO, detalle: MALO }] },
    { tipo: 'rejilla', columnas: [MALO], filas: [[MALO, { texto: MALO, detalle: MALO }]] },
    { tipo: 'boton', texto: MALO, url: `https://a.es/?q=${MALO}` },
    { tipo: 'boton', texto: MALO, url: 'https://a.es/2', secundario: true },
    { tipo: 'lista', titulo: MALO, items: [MALO] },
    { tipo: 'caja', titulo: MALO, texto: MALO, filas: [{ etiqueta: MALO, valor: MALO }] },
    { tipo: 'firma', despedida: MALO, nombre: MALO, detalle: MALO },
    { tipo: 'nota', texto: MALO },
  ];
  for (const variante of ['A', 'B', 'C']) {
    const { html, fromName } = renderCorreo({
      app: 'saluFirst', variante, idioma: 'es', tenant: t, remitente: { nombre: MALO, detalle: MALO },
      preheader: MALO, titulo: MALO, antetitulo: MALO, pieAviso: MALO, bloques,
    });
    assert.ok(!/<script/i.test(html), `${variante}: <script`);
    assert.ok(!/<img src=x/i.test(html), `${variante}: <img inyectado`);
    // Ni sale de un atributo (comilla sin escapar) ni cierra una etiqueta.
    assert.ok(!html.includes('"><img src=x'), `${variante}: rompe un atributo`);
    assert.ok(!html.includes('onerror=alert(2)>'), `${variante}: etiqueta inyectada`);
    assert.ok(!html.includes("'\""), `${variante}: comilla simple sin escapar`);
    assert.ok(html.includes('&lt;script&gt;'), `${variante}: aparece escapado`);
    assert.ok(!/[<>"]/.test(fromName), `${variante}: remitente limpio`);
  }
});

test('solo URLs http(s)/mailto/tel; un logo que no sea http(s) se ignora', () => {
  const { html, text } = renderCorreo(base({
    variante: 'A',
    tenant: { nombre: 'X', logoUrl: 'javascript:alert(1)' },
    bloques: [
      { tipo: 'boton', texto: 'Malo', url: 'javascript:alert(1)' },
      { tipo: 'boton', texto: 'Data', url: 'data:text/html,hola' },
      { tipo: 'boton', texto: 'Tel', url: 'tel:+34965123456', secundario: true },
    ],
  }));
  assert.ok(!/javascript:/i.test(html));
  assert.ok(!/data:text/i.test(html));
  assert.ok(html.includes('href="tel:+34965123456"'));
  assert.ok(!text.includes('javascript:'));
});

test('**negrita** y saltos de línea son la única marca admitida', () => {
  const { html } = renderCorreo(base({ bloques: [{ tipo: 'parrafo', texto: 'a **b** c\nd <b>e</b>' }] }));
  assert.ok(html.includes('a <strong>b</strong> c<br>d &lt;b&gt;e&lt;/b&gt;'));
});

// ─── Idiomas ────────────────────────────────────────────────────────────────

test('los doce idiomas de la suite tienen todos los textos del marco y salen en el pie', () => {
  assert.equal(IDIOMAS_SUITE.length, 12);
  const claves = Object.keys(TEXTOS_MARCO.es);
  for (const idioma of [...IDIOMAS_SUITE, 'ar']) {
    const t = TEXTOS_MARCO[idioma];
    assert.ok(t, idioma);
    assert.deepEqual(Object.keys(t).sort(), [...claves].sort(), `${idioma}: mismas claves`);
    assert.ok(t.universo.includes('{saluhold}') && t.enviadoCon.includes('{app}') && t.enviadoMediante.includes('{app}'), `${idioma}: marcadores`);
    const c = renderCorreo(base({ idioma }));
    assert.ok(c.html.includes(`lang="${idioma}"`), `${idioma}: lang`);
    assert.ok(c.html.includes(t.derechos), `${idioma}: pie`);
    const a = renderCorreo(base({ idioma, variante: 'A', tenant: TENANT }));
    assert.ok(a.fromName.includes(`(${t.via} SaluFile)`), `${idioma}: remitente`);
    assert.ok(a.html.includes(t.enlaceAlternativo.replace(/’/g, '&#39;').slice(0, 10)) || a.html.includes(t.enlaceAlternativo.slice(0, 10)), `${idioma}: enlace alternativo`);
  }
});

test('árabe: documento y tarjeta de derecha a izquierda; idioma desconocido cae al castellano', () => {
  const ar = renderCorreo(base({ idioma: 'ar', variante: 'A', tenant: TENANT }));
  assert.equal(ar.meta.dir, 'rtl');
  assert.ok(ar.html.includes('<html lang="ar" dir="rtl"'));
  assert.ok(ar.html.includes('text-align:right'));
  assert.ok(ar.html.includes('<span dir="ltr" style="unicode-bidi:embed;">965 12 34 56</span>'), 'teléfono aislado');
  assert.ok(ar.html.includes('&larr;') || !ar.html.includes('&rarr;'));
  const xx = renderCorreo(base({ idioma: 'xx' }));
  assert.equal(xx.meta.idioma, 'es');
  assert.equal(xx.meta.dir, 'ltr');
  assert.equal(renderCorreo(base({ idioma: 'EN-gb' })).meta.idioma, 'en');
});

// ─── Contraste ──────────────────────────────────────────────────────────────

test('contraste AA: botones de cada app, textos y semánticos', () => {
  for (const [app, m] of Object.entries(MARCAS)) {
    assert.ok(contraste(m.accion, '#ffffff') >= 4.5, `${app}: acción ${m.accion} = ${contraste(m.accion, '#ffffff').toFixed(2)}`);
  }
  for (const k of ['texto', 'textoSuave', 'gris']) assert.ok(contraste(NEUTROS[k], '#ffffff') >= 4.5, k);
  assert.ok(contraste(NEUTROS.gris, NEUTROS.fondoPie) >= 4.5, 'gris sobre el pie');
  for (const [tono, t] of Object.entries(TONOS)) assert.ok(contraste(t.texto, t.fondo) >= 4.5, `caja ${tono}`);
});

test('color del centro: se usa si contrasta, se oscurece si no, y si ni así, el de la app', () => {
  const ok = resolverAcento('#2f6f62', '#3d6589', '#4e7fa8');
  assert.equal(ok.origen, 'centro');
  const amarillo = resolverAcento('#e0a800', '#3d6589', '#4e7fa8');
  assert.equal(amarillo.origen, 'centro-oscurecido');
  assert.ok(contraste(amarillo.accion, '#ffffff') >= 4.5);
  assert.equal(amarillo.filete, '#e0a800', 'el filete decorativo conserva su color');
  const corto = resolverAcento('#abc', '#3d6589', '#4e7fa8');
  assert.equal(corto.origen, 'centro-oscurecido');
  const casiBlanco = resolverAcento('#fafafa', '#3d6589', '#4e7fa8');
  assert.equal(casiBlanco.origen, 'app');
  assert.equal(casiBlanco.accion, '#3d6589');
  for (const malo of ['rojo', '', null, undefined, '#12345', 'url(x)']) {
    assert.equal(resolverAcento(malo, '#3d6589', '#4e7fa8').origen, 'app', String(malo));
  }
  // Y en el correo: el botón nunca baja de 4,5:1.
  for (const color of ['#ffff00', '#e0a800', '#7fffd4', '#fafafa', '#000000', '#ff69b4']) {
    const { meta } = renderCorreo(base({ variante: 'A', tenant: { nombre: 'X', colorPrimario: color } }));
    assert.ok(contraste(meta.acento.accion, '#ffffff') >= 4.5, `${color} → ${meta.acento.accion}`);
  }
});

// ─── Forma del documento ────────────────────────────────────────────────────

test('HTML de correo: utf-8, 600 px, estilos en línea, sin restos', () => {
  for (const variante of ['A', 'B', 'C']) {
    const { html } = renderCorreo(base({ variante, tenant: TENANT }));
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<meta charset="utf-8">'));
    assert.ok(html.includes('max-width:600px'));
    assert.ok(html.includes('<meta name="color-scheme" content="light only">'));
    assert.ok(!/\b(undefined|NaN)\b|\[object Object\]|>null</.test(html), `${variante}: restos`);
  }
});

test('texto alternativo: título, datos, URL del botón y pie', () => {
  const { text } = renderCorreo(base({ variante: 'A', tenant: TENANT }));
  assert.ok(text.startsWith('Clínica Olivar'));
  assert.ok(text.includes('Título'));
  assert.ok(text.includes('Hola, Carmen:'), 'sin asteriscos');
  assert.ok(text.includes('Fecha: 29/09/2026 (martes)'));
  assert.ok(text.includes('Confirmar: https://salufile.com/c?t=1'));
  assert.ok(text.includes('- Informe'));
  assert.ok(text.includes('Enviado con SaluFile'));
  assert.ok(!/<[a-z]/i.test(text), 'sin etiquetas');
});

test('tamaño: < 100 KB incluso con una agenda de 60 citas (Gmail recorta a 102 KB)', () => {
  const filas = Array.from({ length: 60 }, (_, i) => [
    { texto: `${String(8 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`, detalle: 'a 09:15' },
    { texto: 'Nombre Apellido Apellido', detalle: '600 000 000 · Traer analítica', fuerte: true },
    { texto: 'Revisión', detalle: 'Aseguradora' },
  ]);
  const { html } = renderCorreo(base({ variante: 'A', tenant: TENANT, bloques: [{ tipo: 'rejilla', columnas: ['Hora', 'Paciente', 'Tipo'], filas }] }));
  const kb = new TextEncoder().encode(html).length / 1024;
  assert.ok(kb < 100, `${kb.toFixed(1)} KB`);
  const normal = new TextEncoder().encode(renderCorreo(base({ variante: 'C' })).html).length / 1024;
  assert.ok(normal < 30, `correo normal ${normal.toFixed(1)} KB`);
});
