// Pruebas de @saluhold/identity-client/correo con el runner de Node
// (`node --test`), sin dependencias: el paquete se instala desde git en las
// Cloud Functions y cada devDependency de más se descargaría en cada build.
//
//   npm test   (compila y ejecuta)

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  renderCorreo, sanearHtmlCorreo, MARCAS, TONOS, NEUTROS, TEXTOS_MARCO, IDIOMAS_SUITE, contraste, resolverAcento,
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

test('C con tenant y logo: marca de la app a la izquierda, logo del centro a la derecha (≤ 40 px), acento y pie de la app', () => {
  const { html, text, fromName, meta } = renderCorreo(base({ app: 'saluFirst', tenant: TENANT }));
  const m = MARCAS.saluFirst;
  const iApp = html.indexOf(`src="${m.iconoUrl}" width="32"`);
  const iLogo = html.indexOf(`src="${TENANT.logoUrl}"`);
  assert.ok(iApp > 0 && iLogo > iApp, 'la app primero (inicio de lectura), el logo después');
  assert.ok(/<td valign="middle" align="right"[^>]*><img src="https:\/\/logos\.ejemplo\.es\/olivar\.png" height="40"/.test(html), 'logo en la celda derecha, 40 px de alto');
  assert.ok(html.includes('max-height:40px;max-width:180px;width:auto;height:auto;'), 'sin medidas: topes que conservan la proporción');
  assert.ok(html.includes(`alt="${TENANT.nombre}"`));
  assert.ok(!html.includes('max-height:56px'), 'no es la cabecera de A');
  // Sigue mandando la app: su acento, su filete, su remitente, su pie; ni color ni datos del centro.
  assert.ok(html.includes(`border-top:3px solid ${m.acento}`));
  assert.ok(html.includes(`background-color:${m.accion}`));
  assert.ok(!html.includes(TENANT.colorPrimario));
  assert.ok(!html.includes(TENANT.direccion));
  assert.ok(html.includes('SaluHold'));
  assert.equal(fromName, 'SaluFirst');
  assert.equal(meta.acento.origen, 'app');
  // Con logo, el nombre no se repite en gris bajo el título.
  assert.equal(html.split('Clínica Olivar').length - 1, 1, 'el nombre solo en el alt');
  assert.ok(text.startsWith('SaluFirst · Clínica Olivar\n'));
});

test('C con tenant y medidas del logo: width/height exactos dentro de 180×40', () => {
  const ancho = renderCorreo(base({ tenant: { ...TENANT, logoAncho: 600, logoAlto: 100 } })).html;
  assert.ok(ancho.includes('width="180" height="30"'), 'logo apaisado: manda el ancho');
  const alto = renderCorreo(base({ tenant: { ...TENANT, logoAncho: 200, logoAlto: 200 } })).html;
  assert.ok(alto.includes('width="40" height="40"'), 'logo cuadrado: manda el alto');
  const chico = renderCorreo(base({ tenant: { ...TENANT, logoAncho: 30, logoAlto: 20 } })).html;
  assert.ok(chico.includes('width="30" height="20"'), 'no se agranda');
});

test('C con tenant sin logo: el nombre en una línea gris bajo el título; si va en el antetítulo, no se repite', () => {
  const t = { nombre: 'Centro Médico Norte' };
  const { html, text } = renderCorreo(base({ tenant: t }));
  assert.ok(html.includes(`color:${NEUTROS.gris};text-align:left;">Centro Médico Norte</p>`));
  assert.ok(!html.includes('<img src="https://logos'), 'sin logo');
  assert.ok(html.includes(`src="${MARCAS.saluFile.iconoUrl}" width="32"`), 'cabecera normal de la app');
  assert.ok(text.includes('Título\nCentro Médico Norte'));
  const ante = renderCorreo(base({ tenant: t, antetitulo: 'Centro Médico Norte' })).html;
  assert.equal(ante.split('Centro Médico Norte').length - 1, 1, 'solo en el antetítulo');
  // Un logo que no es https no cuenta como logo: cae al nombre en gris.
  const malo = renderCorreo(base({ tenant: { nombre: 'X', logoUrl: 'javascript:alert(1)' } })).html;
  assert.ok(!malo.includes('javascript:'));
  assert.ok(malo.includes('text-align:left;">X</p>'));
});

test('C con tenant: escapa nombre y logo', () => {
  const t = { nombre: '<script>alert(1)</script> & "Co"', logoUrl: 'https://l.es/a.png?x="><img onerror=1>' };
  const conLogo = renderCorreo(base({ tenant: t }));
  assert.ok(!conLogo.html.includes('<script>alert'));
  assert.ok(!conLogo.html.includes('"><img onerror'));
  assert.ok(conLogo.html.includes('alt="&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Co&quot;"'));
  const sinLogo = renderCorreo(base({ tenant: { nombre: t.nombre } })).html;
  assert.ok(!sinLogo.includes('<script>alert'));
  assert.ok(sinLogo.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Co&quot;</p>'));
});

test('C con tenant en árabe: la app a la derecha (inicio) y el logo a la izquierda, con el hueco del lado contrario', () => {
  const { html, meta } = renderCorreo(base({ idioma: 'ar', tenant: TENANT }));
  assert.equal(meta.dir, 'rtl');
  assert.ok(html.includes('<td valign="middle" align="right" style="text-align:right;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="ltr">'), 'marca de la app al inicio (derecha)');
  assert.ok(html.includes('<td valign="middle" align="left" style="padding:0 20px 0 0;text-align:left;"><img'), 'logo al final (izquierda)');
  const sinLogo = renderCorreo(base({ idioma: 'ar', tenant: { nombre: 'مركز' } })).html;
  assert.ok(sinLogo.includes('text-align:right;">مركز</p>'));
});

test('A y B no cambian con el soporte de tenant en C', () => {
  const a = renderCorreo(base({ variante: 'A', tenant: TENANT })).html;
  assert.ok(a.includes('max-height:56px') && !a.includes('max-width:180px'));
  const b = renderCorreo(base({ variante: 'B', tenant: TENANT })).html;
  assert.ok(!b.includes('<img src="https://logos'));
  const cSin = renderCorreo(base()).html;
  assert.ok(!cSin.includes('max-width:180px'));
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

test('un solo botón primario: el segundo es un botón secundario de verdad; `enlace` lo deja en texto', () => {
  const { html } = renderCorreo(base({ bloques: [
    { tipo: 'boton', texto: 'Uno', url: 'https://a.es/1' },
    { tipo: 'boton', texto: 'Dos', url: 'https://a.es/2' },
    { tipo: 'boton', texto: 'Tres', url: 'https://a.es/3', enlace: true },
  ] }));
  assert.equal((html.match(/bgcolor="#3d6589"/g) || []).length, 1, 'un solo relleno');
  // Dos: borde de 1 px del acento, fondo blanco, texto del acento.
  assert.ok(/bgcolor="#ffffff" style="border-radius:8px;background-color:#ffffff;border:1px solid #3d6589;">\s*<a href="https:\/\/a\.es\/2" style="[^"]*color:#3d6589;/.test(html), 'Dos es botón secundario');
  assert.ok(html.includes('Tres&nbsp;&rarr;'), 'Tres, enlace de texto');
  // Enlace alternativo: el primario con su dirección debajo; el secundario, en la línea común.
  assert.ok(html.includes('https://a.es/1</a>'));
  assert.ok(html.includes('Si el botón no se muestra: <a href="https://a.es/2"'));
});

// ─── Bloques nuevos ─────────────────────────────────────────────────────────

const ACCIONES = { tipo: 'acciones', botones: [
  { texto: 'Confirmar', url: 'https://salufile.com/c/confirmar?t=1' },
  { texto: 'Cancelar', url: 'https://salufile.com/c/cancelar?t=1', tono: 'peligro' },
] };

test('acciones: el primero primario, «peligro» con borde y texto del semántico, fila que se apila en el móvil', () => {
  const { html, text } = renderCorreo(base({ variante: 'A', tenant: TENANT, bloques: [ACCIONES] }));
  const acc = TENANT.colorPrimario;
  assert.ok(/bgcolor="#2f6f62"[^>]*>\s*<a href="https:\/\/salufile\.com\/c\/confirmar\?t=1" style="[^"]*color:#ffffff;/.test(html), 'Confirmar relleno del acento del centro');
  assert.ok(html.includes(`border:1px solid ${TONOS.peligro.borde};`), 'Cancelar con borde de peligro');
  assert.ok(new RegExp(`cancelar\\?t=1" style="[^"]*color:${TONOS.peligro.texto};`).test(html), 'Cancelar con texto de peligro');
  assert.ok(!html.includes(`background-color:${TONOS.peligro.fondo}`), 'peligro sin relleno');
  assert.equal((html.match(/class="cx-acc"/g) || []).length, 2, 'una celda por botón');
  assert.ok(html.includes('.cx-acc { display:block !important; width:100% !important;'), 'se apila en el móvil');
  // Una sola línea de enlaces alternativos, sin la dirección larga.
  assert.ok(html.includes('Si los botones no se muestran: <a href="https://salufile.com/c/confirmar?t=1"'));
  assert.ok(html.includes(`>Confirmar</a> &middot; <a href="https://salufile.com/c/cancelar?t=1" style="color:${acc};`));
  assert.ok(!html.includes('>https://salufile.com/c/confirmar?t=1</a>'), 'sin la URL entera');
  assert.ok(text.includes('Confirmar: https://salufile.com/c/confirmar?t=1') && text.includes('Cancelar: https://salufile.com/c/cancelar?t=1'));
});

test('acciones tras un botón primario: ninguno más relleno; URLs malas fuera', () => {
  const { html } = renderCorreo(base({ bloques: [
    { tipo: 'boton', texto: 'Principal', url: 'https://a.es/p' },
    { tipo: 'acciones', botones: [
      { texto: 'Otra', url: 'https://a.es/o' },
      { texto: 'Mala', url: 'javascript:alert(1)' },
      { texto: '', url: 'https://a.es/vacio' },
    ] },
  ] }));
  assert.equal((html.match(/bgcolor="#3d6589"/g) || []).length, 1);
  assert.ok(!/javascript:/i.test(html));
  assert.ok(!html.includes('a.es/vacio'));
  assert.equal((html.match(/class="cx-acc"/g) || []).length, 1);
});

test('acciones en árabe: línea de enlaces traducida y hueco del lado contrario', () => {
  const { html } = renderCorreo(base({ idioma: 'ar', bloques: [ACCIONES] }));
  assert.ok(html.includes(TEXTOS_MARCO.ar.enlacesAlternativos));
  assert.ok(html.includes('class="cx-acc" valign="top" style="padding:0 0 10px 10px;"'));
  assert.ok(html.includes('align="right" class="cx-acciones"'));
});

const CICLO = {
  tipo: 'ciclo', titulo: '¿Cuándo empezó tu última regla?', texto: 'Toca la respuesta y queda anotada.',
  fechas: ['Hoy', 'Ayer', 'Hace 2 días', 'Hace 3 días', 'Hace 4 días', 'Hace 5 días', 'Hace 6 días'].map((t, i) => ({ texto: t, url: `https://ciclo.salufile.com/p?fur=2026-09-${String(27 - i).padStart(2, '0')}` })),
  enlaces: [{ texto: 'Otra fecha', url: 'https://ciclo.salufile.com/p?fur=otra' }, { texto: 'Ya no tengo la regla (menopausia)', url: 'https://ciclo.salufile.com/p?menopausia=1' }],
  nota: 'Tus datos son privados.',
};

test('ciclo: rejilla de fechas en botones pequeños del acento del correo, enlaces y nota; sin el rosa fijo', () => {
  const { html, text } = renderCorreo(base({ variante: 'A', tenant: TENANT, bloques: [CICLO] }));
  for (const f of CICLO.fechas) assert.ok(html.includes(`href="${f.url}"`), f.texto);
  assert.equal((html.match(new RegExp(`border:1px solid ${TENANT.colorPrimario};border-radius:6px;`, 'g')) || []).length, 7, 'siete botones del acento del centro');
  assert.equal((html.match(/<td width="25%" valign="top"/g) || []).length, 7, '4 columnas');
  assert.equal((html.match(/<td width="25%" style="padding:3px;">&nbsp;<\/td>/g) || []).length, 1, 'hueco que completa la segunda fila');
  assert.ok(html.includes('>Otra fecha</a>') && html.includes('menopausia=1'));
  assert.ok(html.includes('Tus datos son privados.'));
  for (const rosa of ['#DB2777', '#9D174D', '#FCE7F3', '#831843']) assert.ok(!html.toUpperCase().includes(rosa), rosa);
  assert.ok(text.includes('- Ayer: https://ciclo.salufile.com/p?fur=2026-09-26'));
  const tres = renderCorreo(base({ bloques: [{ ...CICLO, columnas: 3 }] })).html;
  assert.equal((tres.match(/<td width="33%" valign="top"/g) || []).length, 7, '3 columnas');
  assert.equal(renderCorreo(base({ bloques: [{ ...CICLO, fechas: [{ texto: 'x', url: 'javascript:1' }] }] })).html.includes('¿Cuándo'), false, 'sin fechas válidas no se pinta');
});

test('imagen: https o cid:, centrada, ancho acotado, pie; lo demás se descarta', () => {
  const { html, text } = renderCorreo(base({ bloques: [{ tipo: 'imagen', src: 'https://salufile.com/qr/abc.png', alt: 'Código QR de la receta', ancho: 180, pie: 'Muestre este código en la farmacia.' }] }));
  assert.ok(html.includes('<img src="https://salufile.com/qr/abc.png" alt="Código QR de la receta" width="180" style="display:block;margin:0 auto;width:100%;max-width:180px;height:auto;border:0;">'));
  assert.ok(html.includes('Muestre este código en la farmacia.'));
  assert.ok(text.includes('[Código QR de la receta]'));
  assert.ok(renderCorreo(base({ bloques: [{ tipo: 'imagen', src: 'cid:firma-1', alt: 'Firma' }] })).html.includes('src="cid:firma-1"'));
  assert.ok(renderCorreo(base({ bloques: [{ tipo: 'imagen', src: 'cid:x', alt: 'x', ancho: 5000 }] })).html.includes('max-width:520px'));
  for (const malo of ['data:image/png;base64,AAAA', 'javascript:alert(1)', 'http://inseguro.es/a.png', 'https://a.es/a.png" onerror="alert(1)', '/relativa.png']) {
    const h = renderCorreo(base({ bloques: [{ tipo: 'imagen', src: malo, alt: 'x' }] })).html;
    assert.ok(!h.includes('max-width:200px'), malo);
  }
  assert.ok(!renderCorreo(base({ bloques: [{ tipo: 'imagen', src: 'cid:a', alt: MALO }] })).html.includes('onerror=alert(2)>'));
});

test('pasos: lista numerada con título por paso, en el acento; de derecha a izquierda en árabe', () => {
  const b = { tipo: 'pasos', titulo: 'Cómo enviarlos', items: [{ titulo: 'Abra el enlace', texto: 'Desde el móvil o el ordenador.' }, { titulo: 'Elija los archivos' }, { titulo: '' }, { titulo: 'Pulse Enviar' }] };
  const { html, text } = renderCorreo(base({ bloques: [b] }));
  assert.ok(html.includes('color:#3d6589;text-align:center;">1</div>') && html.includes('>3</div>'));
  assert.ok(!html.includes('>4</div>'), 'el paso vacío no cuenta');
  assert.ok(html.includes('Abra el enlace') && html.includes('Desde el móvil o el ordenador.'));
  assert.ok(text.includes('1. Abra el enlace\n   Desde el móvil o el ordenador.\n2. Elija los archivos\n3. Pulse Enviar'));
  const ar = renderCorreo(base({ idioma: 'ar', bloques: [b] })).html;
  assert.ok(ar.includes('style="padding:0 0 14px 12px;"') && ar.includes('text-align:right;"><p'));
});

// ─── HTML de confianza ──────────────────────────────────────────────────────

test('htmlConfianza: pasa la lista blanca sin atributos, con los estilos del marco', () => {
  const { html, text } = renderCorreo(base({ variante: 'B', remitente: { nombre: 'Dra. Ruiz' }, bloques: [{ tipo: 'htmlConfianza', html:
    '<p style="color:red;font-size:40px" class="x">Hola, <strong>Carmen</strong>: <em>ya</em> tengo los <u>resultados</u>.<br/>Todo bien.</p>'
    + '<ul><li><p>Hierro un mes más</p></li><li>Revisión en <b>octubre</b></li></ul>'
    + '<ol><li>uno</li></ol><p><a href="https://salufile.com/x?a=1&amp;b=2" target="_blank" onclick="robar()">Ver informe</a> · <a href="mailto:hola@olivar.es">escríbanos</a> · <a href="tel:+34965123456">llámenos</a></p>' }] }));
  assert.ok(html.includes('Hola, <strong>Carmen</strong>: <em>ya</em> tengo los <u>resultados</u>.<br>Todo bien.</p>'));
  assert.ok(!html.includes('color:red') && !html.includes('font-size:40px') && !html.includes('class="x"'), 'estilos y clases fuera');
  assert.ok(html.includes('<li style="margin:0 0 4px 0;"><p style="margin:0;'), 'párrafo dentro de lista sin margen');
  assert.ok(html.includes('<a href="https://salufile.com/x?a=1&amp;b=2" style="color:'), 'href https conservado (y escapado)');
  assert.ok(!/onclick|target=|_blank|robar/.test(html));
  assert.ok(html.includes('href="mailto:hola@olivar.es"') && html.includes('href="tel:+34965123456"'));
  assert.ok(text.includes('Hola, Carmen: ya tengo los resultados.\nTodo bien.'), 'texto plano');
  assert.ok(text.includes('- Hierro un mes más') && !/<[a-z]/i.test(text));
});

test('htmlConfianza: XSS — todo lo que no está en la lista se escapa y no se ejecuta', () => {
  const ataques = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(2)>',
    '<svg onload=alert(3)>',
    '<iframe src="https://malo.es"></iframe>',
    '<a href="javascript:alert(4)">a</a>',
    '<a href="jav&#x61;script:alert(5)">b</a>',
    '<a href="&#106;avascript:alert(6)">c</a>',
    '<a href=" javascript:alert(7)">d</a>',
    '<a href="java\tscript:alert(8)">e</a>',
    '<a href="data:text/html,<script>alert(9)</script>">f</a>',
    '<a href="http://inseguro.es">g</a>',
    '<p onmouseover="alert(10)">h</p>',
    '<style>body{display:none}</style>',
    '<form action="https://malo.es"><input name=x></form>',
    '<!--[if mso]><script>alert(11)</script><![endif]-->',
    '<p>"><img src=x onerror=alert(12)></p>',
    '<a href="https://ok.es" style="position:fixed">i</a>',
    '<object data="x"></object><embed src="x"><math><mi>x</mi></math>',
    '<scr<script>ipt>alert(13)</script>',
    '<p>abierto <strong>sin cerrar <a href="https://ok.es">enlace',
  ].join('\n');
  const { html } = renderCorreo(base({ bloques: [{ tipo: 'htmlConfianza', html: ataques }, { tipo: 'parrafo', texto: 'DESPUÉS' }] }));
  const cuerpo = html.slice(html.indexOf('<body'));
  for (const etiqueta of ['script', 'img', 'svg', 'iframe', 'style', 'form', 'input', 'object', 'embed', 'math']) {
    assert.ok(!new RegExp(`<${etiqueta}\\b`, 'i').test(cuerpo.replace(/<img src="https:\/\/salufile\.com\/icon-192\.png"/g, '')), `<${etiqueta}> vivo`);
  }
  assert.ok(!/href="\s*(javascript|data|jav|&#|http:)/i.test(cuerpo), 'href peligroso');
  assert.ok(!/\son[a-z]+=/i.test(cuerpo.replace(/&[a-z#0-9]+;/gi, '')) || !/<[^>]+\son[a-z]+=/i.test(cuerpo), 'ningún manejador de eventos dentro de una etiqueta');
  assert.ok(!/<[^>]+\son[a-z]+\s*=/i.test(cuerpo), 'manejador de eventos dentro de una etiqueta');
  assert.ok(!cuerpo.includes('position:fixed'));
  assert.ok(cuerpo.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'se ve escapado');
  assert.ok(cuerpo.includes('&lt;!--[if mso]&gt;'), 'comentario condicional escapado');
  // Lo que quedó abierto se cierra antes de lo siguiente: el párrafo de después no queda dentro del enlace.
  const i = cuerpo.indexOf('enlace');
  const despues = cuerpo.indexOf('DESPUÉS');
  assert.ok(cuerpo.slice(i, despues).includes('</a>') && cuerpo.slice(i, despues).includes('</strong>'), 'etiquetas equilibradas');
  // Los enlaces con href descartado dejan su texto y su cierre no cierra nada ajeno.
  assert.ok(cuerpo.includes('>a') || cuerpo.includes('a\n'));
});

test('htmlConfianza: lo que produce el editor (titulares, citas, color, tablas) se reduce, no se enseña como etiqueta', () => {
  const { html } = renderCorreo(base({ bloques: [{ tipo: 'htmlConfianza', html:
    '<h2>Resultados</h2><blockquote><p>Cita</p></blockquote><p><span style="color: rgb(255, 0, 0)">rojo</span> y <s>tachado</s> &amp; &nbsp;&copy; &#8364; &#x20AC; &bogus AT&T</p>'
    + '<table><tbody><tr><td>Hb</td><td>12,1</td></tr></tbody></table><hr><pre><code>x</code></pre>' }] }));
  assert.ok(html.includes('<p style="margin:0 0 14px 0;') && html.includes('><strong>Resultados</strong></p>'), 'titular → párrafo en negrita');
  assert.ok(!/&lt;\/?(h2|blockquote|span|s|table|tbody|tr|td|hr|pre|code)&gt;/.test(html), 'sin etiquetas a la vista');
  assert.ok(html.includes('rojo y tachado &amp; &nbsp;&copy; &#8364; &#x20AC; &amp;bogus AT&amp;T'), 'entidades bien formadas se conservan; & suelto se escapa');
  assert.ok(html.includes('Hb 12,1'), 'celdas separadas');
  assert.ok(!html.includes('rgb(255, 0, 0)'));
});

test('sanearHtmlCorreo exportada: vacío y no-cadena', () => {
  assert.equal(sanearHtmlCorreo(''), '');
  assert.equal(sanearHtmlCorreo(null), '');
  assert.equal(sanearHtmlCorreo(42), '42');
  assert.equal(sanearHtmlCorreo('</p></strong>solo'), 'solo', 'cierres huérfanos fuera');
  assert.equal(sanearHtmlCorreo('<a href="javascript:x"><b>t</b></a></b>'), '<b>t</b>');
});

test('contraste de los botones secundarios y de «peligro» sobre blanco', () => {
  for (const [app, m] of Object.entries(MARCAS)) assert.ok(contraste(m.accion, '#ffffff') >= 4.5, app);
  assert.ok(contraste(TONOS.peligro.texto, '#ffffff') >= 4.5, 'texto peligro');
  assert.ok(contraste(TONOS.peligro.borde, '#ffffff') >= 3, 'borde peligro (componente no textual, 3:1)');
});

test('bloques nuevos: escapan su texto', () => {
  const { html } = renderCorreo(base({ variante: 'A', tenant: TENANT, bloques: [
    { tipo: 'acciones', botones: [{ texto: MALO, url: 'https://a.es/1' }, { texto: MALO, url: 'https://a.es/2', tono: 'peligro' }] },
    { tipo: 'ciclo', titulo: MALO, texto: MALO, fechas: [{ texto: MALO, url: `https://a.es/?f=${MALO}` }], enlaces: [{ texto: MALO, url: 'https://a.es/3' }], nota: MALO },
    { tipo: 'imagen', src: 'https://a.es/i.png', alt: MALO, pie: MALO },
    { tipo: 'pasos', titulo: MALO, items: [{ titulo: MALO, texto: MALO }] },
  ] }));
  assert.ok(!/<script/i.test(html));
  assert.ok(!html.includes('onerror=alert(2)>'));
  assert.ok(!html.includes('"><img src=x'));
});

test('recordatorio completo (acciones + subida de documentos + ciclo) por debajo de 40 KB', () => {
  const { html } = renderCorreo(base({ variante: 'A', tenant: TENANT, bloques: [
    ...BLOQUES.slice(0, 2), ACCIONES,
    { tipo: 'caja', titulo: '¿Tiene documentos que compartir?', texto: 'Puede subirlos antes de su cita.' },
    { tipo: 'boton', texto: 'Subir documentos', url: 'https://salufile.com/m/upload/abc', secundario: true },
    CICLO,
  ] }));
  const kb = new TextEncoder().encode(html).length / 1024;
  assert.ok(kb < 40, `${kb.toFixed(1)} KB`);
  assert.ok(html.includes('Si los botones no se muestran: ') && html.includes('>Subir documentos</a>'), 'los tres en la misma línea');
  assert.equal((html.match(/Si los botones no se muestran/g) || []).length, 1, 'una sola línea');
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
