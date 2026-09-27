// renderCorreo — el marco ÚNICO de los correos de la suite SaluHold.
//
// Tres variantes, según quién firma el correo:
//
//   A · predomina el CENTRO (citas, recetas, informes, facturas al cliente,
//       agenda del médico). Cabecera blanca con el logo del centro, o su
//       nombre en tipografía sobria; acento = su color si contrasta; pie con
//       sus datos y un «Enviado con {App}» discreto. Modelo: la agenda del día
//       siguiente de SaluFile.
//   B · DISCRETO (documentos privados del médico, comunicación libre). Sin
//       cabecera ni color: el nombre del remitente como membrete, el texto y
//       su firma. Fuera de la tarjeta, «Enviado mediante {App}» en gris.
//       Modelo: enviarDocumentosProfesional de SaluFile.
//   C · predomina la SUITE (altas, verificación, contraseñas, pagos, avisos
//       de plataforma). Cabecera blanca con el icono y el wordmark de la app,
//       un solo color de acento, pie SaluHold con las apps hermanas en gris.
//
// Todo lo que entra por `bloques`, `titulo`, `tenant`… es TEXTO: se escapa
// siempre. La única marca admitida es `**negrita**`; los saltos de línea se
// respetan. La ÚNICA puerta para HTML es el bloque `htmlConfianza` (el cuerpo
// con formato que escribe un profesional), y pasa por `sanearHtmlCorreo`: una
// lista blanca corta, sin atributos salvo `a[href]` https/mailto/tel, con los
// estilos puestos por el marco. Todo lo demás se escapa.
//
// JS puro, sin Firebase ni DOM: lo usan igual las Cloud Functions (CommonJS)
// que un render de prueba en local.
import { MARCAS, APPS_DEL_PIE, NEUTROS, TONOS, FUENTES } from './marcas';
import { resolverAcento } from './color';
import { TEXTOS_MARCO, idiomaDelMarco, esRtl } from './textos';
// ─── Utilidades ─────────────────────────────────────────────────────────────
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapa texto para HTML (contenido y atributos). */
export function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}
/** Texto de usuario → HTML: escapado, `**negrita**` y saltos de línea. */
function fmt(valor) {
    return escaparHtml(valor)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\r?\n/g, '<br>');
}
/** El mismo texto para la versión sin HTML. */
function plano(valor) {
    return String(valor ?? '').replace(/\*\*(.+?)\*\*/g, '$1');
}
/** Solo http(s), mailto y tel. Cualquier otra cosa (javascript:, data:…) se descarta. */
function urlSegura(valor) {
    const s = String(valor ?? '').trim();
    return /^(https?:\/\/|mailto:|tel:)/i.test(s) ? s : null;
}
function imagenSegura(valor) {
    const s = String(valor ?? '').trim();
    return /^https?:\/\//i.test(s) ? s : null;
}
/** Imagen del cuerpo: https o `cid:` (adjunto en línea). Nada de data:, http ni rutas. */
function imagenCuerpoSegura(valor) {
    const s = String(valor ?? '').trim();
    if (/^https:\/\/[^\s"'<>]+$/i.test(s))
        return s;
    if (/^cid:[^\s"'<>]+$/i.test(s))
        return s;
    return null;
}
/** Quita lo que no puede ir en un display name de cabecera From. */
function limpiarRemitente(valor) {
    return valor.replace(/[<>"\r\n\\]/g, '').replace(/\s+/g, ' ').trim();
}
/** Misma cadena salvo mayúsculas, espacios y `**`. */
function mismoTexto(a, b) {
    const n = (v) => plano(v).replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    return !!a && n(a) === n(b);
}
const conMarca = (plantilla, clave, html) => plantilla.replace(clave, html);
/** Teléfonos, correos y URLs dentro de un texto RTL: aislados para que no se inviertan. */
function aislarLtr(c, html) {
    return c.rtl ? `<span dir="ltr" style="unicode-bidi:embed;">${html}</span>` : html;
}
// ─── Piezas HTML ────────────────────────────────────────────────────────────
const P_BASE = `font-family:${FUENTES.cuerpo};`;
function wordmarkHtml(m, tam) {
    const [a, b] = m.wordmark;
    return `<span style="font-family:${FUENTES.marca};font-size:${tam}px;font-weight:800;letter-spacing:-0.3px;line-height:1;white-space:nowrap;"><span style="color:${a.color};">${escaparHtml(a.texto)}</span><span style="color:${b.color};">${escaparHtml(b.texto)}</span></span>`;
}
function marcaApp(m) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="ltr"><tr>
<td valign="middle" style="padding:0 11px 0 0;"><img src="${escaparHtml(m.iconoUrl)}" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;border-radius:8px;"></td>
<td valign="middle">${wordmarkHtml(m, 21)}</td>
</tr></table>`;
}
/** Alto y ancho máximos del logo del centro en la cabecera de C. */
const LOGO_C_ALTO = 40;
const LOGO_C_ANCHO = 180;
/**
 * Medidas del logo del centro en C: con las naturales, `width`/`height`
 * exactos dentro de 180×40; sin ellas, `height` para Outlook y topes CSS.
 */
function medidasLogoC(tenant) {
    const w0 = Number(tenant.logoAncho);
    const h0 = Number(tenant.logoAlto);
    if (!(w0 > 0 && h0 > 0))
        return { w: null, h: LOGO_C_ALTO };
    const escala = Math.min(LOGO_C_ALTO / h0, LOGO_C_ANCHO / w0, 1);
    return { w: Math.max(1, Math.round(w0 * escala)), h: Math.max(1, Math.round(h0 * escala)) };
}
function cabeceraApp(c, tenant = null) {
    const m = c.marca;
    const logo = tenant ? imagenSegura(tenant.logoUrl) : null;
    if (!logo || !tenant) {
        return `<tr><td class="cx-pad" align="${c.ini}" style="padding:26px 40px 22px 40px;border-bottom:1px solid ${NEUTROS.lineaTabla};">
${marcaApp(m)}
</td></tr>`;
    }
    // La app a un lado (el de inicio de lectura) y el logo del centro al otro,
    // más bajo que la marca de la app para que esta siga mandando.
    const { w, h } = medidasLogoC(tenant);
    const dims = w ? `width="${w}" height="${h}"` : `height="${h}"`;
    const estilo = w
        ? `width:${w}px;height:${h}px;`
        // Sin medidas: el atributo `height` para Outlook y, en el resto, topes que
        // conservan la proporción (un logo apaisado no se deforma ni uno pequeño crece).
        : `max-height:${h}px;max-width:${LOGO_C_ANCHO}px;width:auto;height:auto;`;
    const hueco = c.rtl ? 'padding:0 20px 0 0;' : 'padding:0 0 0 20px;';
    return `<tr><td class="cx-pad" bgcolor="#ffffff" style="padding:22px 40px 20px 40px;background-color:#ffffff;border-bottom:1px solid ${NEUTROS.lineaTabla};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" align="${c.ini}" style="text-align:${c.ini};">${marcaApp(m)}</td>
<td valign="middle" align="${c.fin}" style="${hueco}text-align:${c.fin};"><img src="${escaparHtml(logo)}" ${dims} alt="${escaparHtml(tenant.nombre)}" style="display:inline-block;${estilo}border:0;"></td>
</tr></table>
</td></tr>`;
}
function cabeceraTenant(c, tenant) {
    const logo = imagenSegura(tenant.logoUrl);
    // Centrado, como la cabecera con logo de la agenda de SaluFile (el modelo).
    const dentro = logo
        ? `<img src="${escaparHtml(logo)}" alt="${escaparHtml(tenant.nombre)}" style="display:inline-block;max-height:56px;max-width:240px;width:auto;height:auto;border:0;">`
        : `<span style="font-family:${FUENTES.sobria};font-size:23px;line-height:1.25;color:${NEUTROS.texto};">${escaparHtml(tenant.nombre)}</span>`;
    // bgcolor explícito: los clientes que invierten colores en modo oscuro
    // respetan más el atributo que el estilo, y un logo PNG con transparencia y
    // letras oscuras sigue leyéndose.
    void c;
    return `<tr><td class="cx-pad" align="center" bgcolor="#ffffff" style="padding:${logo ? '26px 40px 22px 40px' : '30px 40px 24px 40px'};background-color:#ffffff;border-bottom:1px solid ${NEUTROS.lineaTabla};text-align:center;">${dentro}</td></tr>`;
}
function membreteRemitente(c, r) {
    return `<p style="margin:0;font-family:${FUENTES.sobria};font-size:21px;line-height:1.3;color:${NEUTROS.texto};text-align:${c.ini};">${escaparHtml(r.nombre)}</p>
${r.detalle ? `<p style="margin:4px 0 0 0;${P_BASE}font-size:13px;line-height:1.5;color:${NEUTROS.gris};text-align:${c.ini};">${escaparHtml(r.detalle)}</p>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:18px 0 22px 0;"><div style="border-top:1px solid ${NEUTROS.borde};font-size:0;line-height:0;">&nbsp;</div></td></tr></table>`;
}
function parrafo(c, texto, suave = false) {
    return `<p style="margin:0 0 16px 0;${P_BASE}font-size:15px;line-height:1.65;color:${suave ? NEUTROS.textoSuave : NEUTROS.texto};text-align:${c.ini};">${fmt(texto)}</p>`;
}
/**
 * El botón en sí, a prueba de Outlook: celda con `bgcolor` (y borde en los
 * secundarios) y el enlace dentro con su relleno. Los secundarios quitan 1 px
 * de relleno por lado para medir lo mismo que el primario con su borde.
 */
function botonHtml(c, texto, url, estilo) {
    const color = estilo === 'primario' ? '#ffffff' : estilo === 'peligro' ? TONOS.peligro.texto : c.accion;
    const fondo = estilo === 'primario' ? c.accion : '#ffffff';
    const borde = estilo === 'primario' ? '' : `border:1px solid ${estilo === 'peligro' ? TONOS.peligro.borde : c.accion};`;
    const relleno = estilo === 'primario' ? '13px 26px' : '12px 25px';
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cx-boton"><tr>
<td align="center" bgcolor="${fondo}" style="border-radius:8px;background-color:${fondo};${borde}">
<a href="${escaparHtml(url)}" style="display:inline-block;padding:${relleno};${P_BASE}font-size:15px;font-weight:600;line-height:1.2;color:${color};text-decoration:none;border-radius:8px;">${escaparHtml(texto)}</a>
</td></tr></table>`;
}
/** Estilo que le toca a un botón según lo que ya lleva el correo (un solo primario). */
function estiloDe(c, secundario, tono) {
    if (tono === 'peligro')
        return 'peligro';
    if (secundario || c.primarioUsado)
        return 'secundario';
    c.primarioUsado = true;
    return 'primario';
}
function boton(c, b) {
    const url = urlSegura(b.url);
    if (!url)
        return '';
    if (b.enlace) {
        const flecha = c.rtl ? '&larr;' : '&rarr;';
        return `<p style="margin:0 0 16px 0;${P_BASE}font-size:14px;line-height:1.5;text-align:${c.ini};"><a href="${escaparHtml(url)}" style="color:${c.accion};font-weight:600;text-decoration:none;">${escaparHtml(b.texto)}&nbsp;${flecha}</a></p>`;
    }
    const estilo = estiloDe(c, !!b.secundario, b.tono);
    const envoltura = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${c.ini}" style="margin:8px 0 18px 0;"><tr><td>${botonHtml(c, b.texto, url, estilo)}</td></tr></table>
<div style="clear:both;font-size:0;line-height:0;">&nbsp;</div>`;
    if (estilo !== 'primario') {
        if (b.alternativo !== false)
            c.alternativos.push({ texto: b.texto, url });
        return envoltura;
    }
    const alternativo = b.alternativo === false ? '' : `<p style="margin:0 0 20px 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};text-align:${c.ini};word-break:break-all;">${escaparHtml(c.t.enlaceAlternativo)}<br>${aislarLtr(c, `<a href="${escaparHtml(url)}" style="color:${c.accion};text-decoration:underline;">${escaparHtml(url)}</a>`)}</p>`;
    return `${envoltura}
${alternativo}`;
}
function acciones(c, botones) {
    const validos = (botones || [])
        .map((b) => ({ ...b, url: urlSegura(b?.url) }))
        .filter((b) => !!b.url && !!String(b.texto ?? '').trim());
    if (!validos.length)
        return '';
    const hueco = c.rtl ? 'padding:0 0 10px 10px;' : 'padding:0 10px 10px 0;';
    const celdas = validos.map((b) => {
        const estilo = estiloDe(c, false, b.tono);
        c.alternativos.push({ texto: b.texto, url: b.url });
        return `<td class="cx-acc" valign="top" style="${hueco}">${botonHtml(c, b.texto, b.url, estilo)}</td>`;
    }).join('');
    // Fila en escritorio; en el móvil cada celda pasa a bloque de ancho completo
    // (media query del <head>). Outlook de escritorio no lee media queries y se
    // queda con la fila, que es lo que quiere a 600 px.
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${c.ini}" class="cx-acciones" style="margin:8px 0 10px 0;"><tr>${celdas}</tr></table>
<div style="clear:both;font-size:0;line-height:0;">&nbsp;</div>`;
}
/** «Si los botones no se muestran: Confirmar · Cancelar», al final del cuerpo. */
function lineaAlternativos(c) {
    if (!c.alternativos.length)
        return '';
    const intro = c.alternativos.length > 1 ? c.t.enlacesAlternativos : c.t.enlaceAlternativoCorto;
    const enlaces = c.alternativos
        .map((a) => `<a href="${escaparHtml(a.url)}" style="color:${c.accion};text-decoration:underline;">${escaparHtml(a.texto)}</a>`)
        .join(' &middot; ');
    return `<p style="margin:18px 0 0 0;${P_BASE}font-size:12px;line-height:1.6;color:${NEUTROS.gris};text-align:${c.ini};">${escaparHtml(intro)} ${enlaces}</p>`;
}
function ciclo(c, b) {
    const fechas = (b.fechas || []).map((f) => ({ texto: f?.texto, url: urlSegura(f?.url) })).filter((f) => f.url && String(f.texto ?? '').trim());
    if (!fechas.length)
        return '';
    const cols = b.columnas === 3 ? 3 : 4;
    const ancho = `${Math.floor(100 / cols)}%`;
    const filas = [];
    for (let i = 0; i < fechas.length; i += cols) {
        const trozo = fechas.slice(i, i + cols);
        const celdas = trozo.map((f) => `<td width="${ancho}" valign="top" style="padding:3px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid ${c.accion};border-radius:6px;">
<a href="${escaparHtml(f.url)}" style="display:block;padding:8px 4px;${P_BASE}font-size:13px;font-weight:600;line-height:1.25;color:${c.accion};text-decoration:none;text-align:center;">${escaparHtml(f.texto)}</a>
</td></tr></table></td>`);
        while (celdas.length < cols)
            celdas.push(`<td width="${ancho}" style="padding:3px;">&nbsp;</td>`);
        filas.push(`<tr>${celdas.join('')}</tr>`);
    }
    const enlaces = (b.enlaces || []).map((e) => ({ texto: e?.texto, url: urlSegura(e?.url) })).filter((e) => e.url && String(e.texto ?? '').trim())
        .map((e) => `<a href="${escaparHtml(e.url)}" style="color:${c.accion};font-weight:600;text-decoration:underline;">${escaparHtml(e.texto)}</a>`);
    const t = TONOS.neutra;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px 0;border-collapse:separate;"><tr>
<td bgcolor="${t.fondo}" style="background-color:${t.fondo};border:1px solid ${t.borde};border-radius:8px;padding:16px 15px 14px 15px;">
<p style="margin:0 0 4px 0;padding:0 3px;${P_BASE}font-size:15px;font-weight:600;line-height:1.4;color:${NEUTROS.texto};text-align:${c.ini};">${fmt(b.titulo)}</p>
${b.texto ? `<p style="margin:0 0 10px 0;padding:0 3px;${P_BASE}font-size:13.5px;line-height:1.55;color:${NEUTROS.textoSuave};text-align:${c.ini};">${fmt(b.texto)}</p>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">${filas.join('')}</table>
${enlaces.length ? `<p style="margin:10px 0 0 0;padding:0 3px;${P_BASE}font-size:13px;line-height:1.6;text-align:${c.ini};">${enlaces.join(` <span style="color:${NEUTROS.gris};">&middot;</span> `)}</p>` : ''}
${b.nota ? `<p style="margin:8px 0 0 0;padding:0 3px;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};text-align:${c.ini};">${fmt(b.nota)}</p>` : ''}
</td></tr></table>`;
}
function imagen(b) {
    const src = imagenCuerpoSegura(b.src);
    if (!src)
        return '';
    const ancho = Math.round(Math.min(520, Math.max(16, Number(b.ancho) || 200)));
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;"><tr><td align="center" style="text-align:center;">
<img src="${escaparHtml(src)}" alt="${escaparHtml(b.alt)}" width="${ancho}" style="display:block;margin:0 auto;width:100%;max-width:${ancho}px;height:auto;border:0;">
${b.pie ? `<p style="margin:8px 0 0 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};text-align:center;">${fmt(b.pie)}</p>` : ''}
</td></tr></table>`;
}
function pasos(c, b) {
    const items = (b.items || []).filter((p) => p && String(p.titulo ?? '').trim());
    if (!items.length)
        return '';
    const titulo = b.titulo ? `<p style="margin:0 0 10px 0;${P_BASE}font-size:13px;font-weight:600;color:${NEUTROS.textoSuave};text-align:${c.ini};">${fmt(b.titulo)}</p>` : '';
    const hueco = c.rtl ? 'padding:0 0 14px 12px;' : 'padding:0 12px 14px 0;';
    const trs = items.map((p, i) => `<tr>
<td width="26" valign="top" style="${hueco}"><div style="width:24px;height:24px;border:1px solid ${c.accion};border-radius:12px;${P_BASE}font-size:12px;font-weight:700;line-height:24px;color:${c.accion};text-align:center;">${i + 1}</div></td>
<td valign="top" style="padding:2px 0 14px 0;text-align:${c.ini};"><p style="margin:0;${P_BASE}font-size:15px;font-weight:600;line-height:1.45;color:${NEUTROS.texto};">${fmt(p.titulo)}</p>${p.texto ? `<p style="margin:3px 0 0 0;${P_BASE}font-size:14px;line-height:1.55;color:${NEUTROS.textoSuave};">${fmt(p.texto)}</p>` : ''}</td>
</tr>`).join('');
    return `${titulo}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;">${trs}</table>`;
}
// ─── HTML de confianza (cuerpo con formato del profesional) ────────────────
/** Etiquetas que pasan tal cual (sin atributos; `a` conserva un `href` seguro). */
const HTML_PERMITIDO = new Set(['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'a']);
/**
 * Lo que el editor de la suite (TipTap: titulares, citas, tablas, color) puede
 * producir y no está en la lista: se reduce a la lista en vez de escaparse,
 * para que el paciente no lea etiquetas. Bloques → párrafo; titulares →
 * párrafo en negrita; en línea → se desenvuelve (queda el texto).
 */
const HTML_A_PARRAFO = new Set(['div', 'blockquote', 'pre', 'tr', 'section', 'article', 'header', 'footer']);
const HTML_A_TITULAR = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const HTML_DESENVOLVER = new Set(['span', 'font', 's', 'strike', 'del', 'ins', 'mark', 'small', 'sub', 'sup', 'code', 'table', 'thead', 'tbody', 'tfoot', 'td', 'th', 'caption', 'abbr', 'cite', 'q', 'kbd', 'var', 'time']);
const HTML_VACIAS = new Set(['br', 'hr']);
const ENTIDAD = /^&(?:[a-z][a-z0-9]{1,31}|#\d{1,7}|#x[0-9a-f]{1,6});/i;
/** Texto entre etiquetas: se conservan las entidades bien formadas; lo demás se escapa. */
function textoHtml(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '&') {
            const m = ENTIDAD.exec(s.slice(i));
            if (m) {
                out += m[0];
                i += m[0].length - 1;
                continue;
            }
            out += '&amp;';
        }
        else if (ch === '<')
            out += '&lt;';
        else if (ch === '>')
            out += '&gt;';
        else if (ch === '"')
            out += '&quot;';
        else
            out += ch;
    }
    return out;
}
const NOMBRADAS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n', nbsp: ' ' };
/** Decodifica entidades (para validar un href igual que lo leerá el navegador). */
function decodificarEntidades(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (m, e) => {
        if (e[0] === '#') {
            const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
        }
        return NOMBRADAS[e.toLowerCase()] ?? m;
    });
}
/** `href` de un `<a>` de confianza: solo https, mailto y tel. */
function hrefConfianza(attrs) {
    const m = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attrs);
    if (!m)
        return null;
    // Sin controles ni espacios que el navegador se salta al leer el esquema.
    const valor = decodificarEntidades(m[1] ?? m[2] ?? m[3] ?? '').replace(/[\u0000- \u007f-\u009f]/g, (ch) => (ch === ' ' ? '%20' : '')).trim();
    return /^(https:\/\/|mailto:|tel:)/i.test(valor) ? valor : null;
}
const RE_ETIQUETA = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
/**
 * Sanea el HTML que escribe un profesional para meterlo en un correo.
 *
 * - Pasan `p, br, b, strong, i, em, u, ul, ol, li, a` SIN atributos (los
 *   estilos los pone el marco); `a` conserva solo un `href` https/mailto/tel.
 * - Titulares, `div`, `blockquote`, filas de tabla… se reducen a párrafo;
 *   `span`, `s`, celdas y demás etiquetas de formato en línea se desenvuelven.
 * - Cualquier otra etiqueta (script, style, iframe, img, svg, form…), un
 *   comentario o un `<` suelto se ESCAPA: se ve como texto, no se ejecuta.
 * - Las etiquetas se equilibran: un cierre sin apertura se ignora y lo que
 *   quede abierto se cierra al final, para que no se coma el resto del correo.
 */
export function sanearHtmlCorreo(html, opciones = {}) {
    const s = String(html ?? '');
    const accion = opciones.accion || NEUTROS.texto;
    const ini = opciones.rtl ? 'right' : 'left';
    const lado = opciones.rtl ? 'padding:0 22px 0 0;' : 'padding:0 0 0 22px;';
    const estilo = {
        p: `margin:0 0 14px 0;${P_BASE}font-size:15px;line-height:1.65;color:${NEUTROS.texto};text-align:${ini};`,
        ul: `margin:0 0 14px 0;${lado}${P_BASE}font-size:15px;line-height:1.55;color:${NEUTROS.texto};text-align:${ini};`,
        ol: `margin:0 0 14px 0;${lado}${P_BASE}font-size:15px;line-height:1.55;color:${NEUTROS.texto};text-align:${ini};`,
        li: 'margin:0 0 4px 0;',
        a: `color:${accion};text-decoration:underline;`,
    };
    // `a-muerto`: un <a> cuyo href no pasa. No emite etiqueta, pero ocupa su
    // sitio en la pila para que su </a> no cierre nada ajeno.
    const MUERTO = 'a-muerto';
    const pila = [];
    let out = '';
    let ultimo = 0;
    const abrir = (tag, extra = '') => {
        // Un párrafo dentro de un punto de lista no lleva margen (TipTap los mete así).
        const css = tag === 'p' && pila.includes('li') ? `${estilo.p.replace('margin:0 0 14px 0;', 'margin:0;')}` : estilo[tag];
        pila.push(tag);
        out += `<${tag}${extra}${css ? ` style="${css}"` : ''}>`;
    };
    const cerrar = (tag) => {
        const i = tag === 'a' ? Math.max(pila.lastIndexOf('a'), pila.lastIndexOf(MUERTO)) : pila.lastIndexOf(tag);
        if (i < 0)
            return; // cierre huérfano
        while (pila.length > i) {
            const t = pila.pop();
            if (t !== MUERTO)
                out += `</${t}>`;
        }
    };
    RE_ETIQUETA.lastIndex = 0;
    let m;
    while ((m = RE_ETIQUETA.exec(s))) {
        out += textoHtml(s.slice(ultimo, m.index));
        ultimo = m.index + m[0].length;
        const cierre = m[1] === '/';
        const nombre = m[2].toLowerCase();
        if (HTML_VACIAS.has(nombre)) {
            if (!cierre)
                out += '<br>';
            continue;
        }
        if (HTML_PERMITIDO.has(nombre) || HTML_A_PARRAFO.has(nombre) || HTML_A_TITULAR.has(nombre)) {
            const tag = HTML_PERMITIDO.has(nombre) ? nombre : 'p';
            if (cierre) {
                if (HTML_A_TITULAR.has(nombre))
                    cerrar('strong');
                cerrar(tag);
                continue;
            }
            if (tag === 'a') {
                if (pila.includes('a'))
                    continue; // un enlace dentro de otro no
                const href = hrefConfianza(m[3] || '');
                if (!href) {
                    pila.push(MUERTO);
                    continue;
                }
                abrir('a', ` href="${escaparHtml(href)}"`);
                continue;
            }
            // <p> no anida, y una lista no va dentro de un párrafo.
            if ((tag === 'p' || tag === 'ul' || tag === 'ol') && pila[pila.length - 1] === 'p')
                cerrar('p');
            if (tag === 'p' && pila.includes('p') && !pila.includes('li'))
                cerrar('p');
            abrir(tag);
            if (HTML_A_TITULAR.has(nombre))
                abrir('strong');
            continue;
        }
        if (HTML_DESENVOLVER.has(nombre)) {
            if (nombre === 'td' || nombre === 'th') {
                if (cierre)
                    out += ' ';
            }
            continue;
        }
        // Fuera de la lista: se ve como texto.
        out += textoHtml(m[0]);
    }
    out += textoHtml(s.slice(ultimo));
    while (pila.length) {
        const t = pila.pop();
        if (t !== MUERTO)
            out += `</${t}>`;
    }
    return out;
}
/** El HTML de confianza como texto plano (versión sin HTML del correo). */
function htmlATexto(html) {
    return decodificarEntidades(String(html ?? '')
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*li[^>]*>/gi, '\n- ')
        .replace(/<\/\s*(p|div|h[1-6]|li|tr|blockquote|ul|ol)\s*>/gi, '\n')
        .replace(/<[^>]*>/g, '')).replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function htmlConfianza(c, html) {
    const limpio = sanearHtmlCorreo(html, { accion: c.accion, rtl: c.rtl });
    if (!limpio.trim())
        return '';
    return `<div style="margin:0 0 6px 0;">${limpio}</div>`;
}
function filasDato(c, filas, dentroDeCaja = false) {
    const linea = dentroDeCaja ? 'rgba(0,0,0,0.06)' : NEUTROS.lineaTabla;
    const trs = filas.map((f, i) => {
        const borde = i < filas.length - 1 ? `border-bottom:1px solid ${linea};` : '';
        const pad = dentroDeCaja ? '6px' : '10px';
        const valorEstilo = f.destacado ? 'font-size:17px;font-weight:700;' : 'font-size:14px;font-weight:500;';
        const fuente = f.mono ? `font-family:${FUENTES.mono};` : '';
        return `<tr>
<td valign="top" width="38%" style="padding:${pad} 0;${borde}${P_BASE}font-size:13px;line-height:1.45;color:${NEUTROS.gris};text-align:${c.ini};">${fmt(f.etiqueta)}</td>
<td valign="top" style="padding:${pad} 0;${borde}${P_BASE}${valorEstilo}${fuente}line-height:1.45;color:${NEUTROS.texto};text-align:${c.ini};">${fmt(f.valor)}${f.detalle ? `<br><span style="font-size:12px;font-weight:400;color:${NEUTROS.gris};">${fmt(f.detalle)}</span>` : ''}</td>
</tr>`;
    }).join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${trs}</table>`;
}
function tabla(c, filas) {
    if (!filas.length)
        return '';
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px 0;border-top:1px solid ${NEUTROS.lineaTabla};border-bottom:1px solid ${NEUTROS.lineaTabla};"><tr><td>${filasDato(c, filas)}</td></tr></table>`;
}
function rejilla(c, columnas, filas) {
    const th = columnas.map((col) => `<th align="${c.ini}" style="padding:0 10px 8px 0;${P_BASE}font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:${NEUTROS.gris};border-bottom:1px solid ${NEUTROS.borde};text-align:${c.ini};">${fmt(col)}</th>`).join('');
    const trs = filas.map((fila) => `<tr>${fila.map((celda, j) => {
        const o = typeof celda === 'string' ? { texto: celda } : celda;
        const fuerte = o.fuerte ?? j === 0;
        return `<td valign="top" style="padding:11px 10px 11px 0;border-bottom:1px solid ${NEUTROS.lineaTabla};${P_BASE}font-size:14px;line-height:1.45;color:${NEUTROS.texto};${fuerte ? 'font-weight:600;' : ''}text-align:${c.ini};${j === 0 ? 'white-space:nowrap;' : ''}">${fmt(o.texto)}${o.detalle ? `<br><span style="font-size:12px;font-weight:400;color:${NEUTROS.gris};">${fmt(o.detalle)}</span>` : ''}</td>`;
    }).join('')}</tr>`).join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:4px 0 24px 0;"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}
function lista(c, b) {
    const etiqueta = b.ordenada ? 'ol' : 'ul';
    const pad = c.rtl ? 'padding:0 22px 0 0;' : 'padding:0 0 0 22px;';
    const titulo = b.titulo ? `<p style="margin:0 0 6px 0;${P_BASE}font-size:13px;font-weight:600;color:${NEUTROS.textoSuave};text-align:${c.ini};">${fmt(b.titulo)}</p>` : '';
    const items = b.items.map((i) => `<li style="margin:0 0 6px 0;">${fmt(i)}</li>`).join('');
    return `${titulo}<${etiqueta} style="margin:0 0 18px 0;${pad}${P_BASE}font-size:15px;line-height:1.55;color:${NEUTROS.texto};text-align:${c.ini};">${items}</${etiqueta}>`;
}
function caja(c, b) {
    const tono = TONOS[b.tono || 'neutra'] ? (b.tono || 'neutra') : 'neutra';
    const t = TONOS[tono];
    const borde = tono === 'neutra'
        ? `border:1px solid ${t.borde};`
        : `border-${c.ini}:3px solid ${t.borde};`;
    const titulo = b.titulo ? `<p style="margin:0 0 ${b.texto || b.filas?.length ? 6 : 0}px 0;${P_BASE}font-size:14px;font-weight:600;line-height:1.45;color:${t.texto};text-align:${c.ini};">${fmt(b.titulo)}</p>` : '';
    const texto = b.texto ? `<p style="margin:0;${P_BASE}font-size:14px;line-height:1.6;color:${tono === 'neutra' ? NEUTROS.textoSuave : t.texto};text-align:${c.ini};">${fmt(b.texto)}</p>` : '';
    const filas = b.filas?.length ? `<div style="margin-top:${b.texto || b.titulo ? 8 : 0}px;">${filasDato(c, b.filas, true)}</div>` : '';
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px 0;border-collapse:separate;"><tr>
<td bgcolor="${t.fondo}" style="background-color:${t.fondo};${borde}border-radius:8px;padding:14px 18px;">${titulo}${texto}${filas}</td>
</tr></table>`;
}
function separador() {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 0 26px 0;"><div style="border-top:1px solid ${NEUTROS.borde};font-size:0;line-height:0;">&nbsp;</div></td></tr></table>`;
}
function firma(c, b) {
    return `<p style="margin:8px 0 0 0;${P_BASE}font-size:15px;line-height:1.6;color:${NEUTROS.texto};text-align:${c.ini};">${b.despedida ? `${fmt(b.despedida)}<br>` : ''}<strong>${escaparHtml(b.nombre)}</strong>${b.detalle ? `<br><span style="font-size:13px;color:${NEUTROS.gris};">${fmt(b.detalle)}</span>` : ''}</p>`;
}
function nota(c, texto) {
    return `<p style="margin:22px 0 0 0;${P_BASE}font-size:12.5px;line-height:1.55;color:${NEUTROS.gris};text-align:${c.ini};">${fmt(texto)}</p>`;
}
function bloqueHtml(c, b) {
    switch (b.tipo) {
        case 'parrafo': return parrafo(c, b.texto, b.suave);
        case 'boton': return boton(c, b);
        case 'tabla': return tabla(c, b.filas || []);
        case 'rejilla': return rejilla(c, b.columnas || [], b.filas || []);
        case 'lista': return lista(c, b);
        case 'caja': return caja(c, b);
        case 'separador': return separador();
        case 'firma': return firma(c, b);
        case 'nota': return nota(c, b.texto);
        case 'acciones': return acciones(c, b.botones);
        case 'ciclo': return ciclo(c, b);
        case 'imagen': return imagen(b);
        case 'htmlConfianza': return htmlConfianza(c, b.html);
        case 'pasos': return pasos(c, b);
        default: return '';
    }
}
// ─── Pies ───────────────────────────────────────────────────────────────────
function creditoApp(c, plantilla, conIcono) {
    const m = c.marca;
    const icono = conIcono
        ? `<img src="${escaparHtml(m.iconoUrl)}" width="14" height="14" alt="" style="display:inline-block;width:14px;height:14px;border:0;border-radius:4px;vertical-align:-3px;">&nbsp;`
        : '';
    const nombre = `${icono}<a href="${escaparHtml(m.web)}" style="color:${NEUTROS.gris};text-decoration:none;font-weight:600;">${escaparHtml(m.nombre)}</a>`;
    return conMarca(escaparHtml(plantilla), '{app}', nombre);
}
function pieTenant(c, tenant, aviso) {
    const lineas = [];
    if (tenant?.nombre) {
        lineas.push(`<p style="margin:0 0 4px 0;${P_BASE}font-size:13px;font-weight:600;line-height:1.5;color:${NEUTROS.texto};">${escaparHtml(tenant.nombre)}</p>`);
        if (tenant.direccion)
            lineas.push(`<p style="margin:0 0 2px 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};">${escaparHtml(tenant.direccion)}</p>`);
        const contacto = [
            tenant.telefono ? `${escaparHtml(c.t.tel)} ${aislarLtr(c, escaparHtml(tenant.telefono))}` : '',
            tenant.email ? aislarLtr(c, escaparHtml(tenant.email)) : '',
            tenant.web ? aislarLtr(c, escaparHtml(tenant.web.replace(/^https?:\/\//, ''))) : '',
        ].filter(Boolean).join(' &middot; ');
        if (contacto)
            lineas.push(`<p style="margin:0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};">${contacto}</p>`);
    }
    if (aviso)
        lineas.push(`<p style="margin:${lineas.length ? 12 : 0}px 0 0 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};">${fmt(aviso)}</p>`);
    lineas.push(`<p style="margin:${lineas.length ? 14 : 0}px 0 0 0;${P_BASE}font-size:11px;line-height:1.5;color:${NEUTROS.gris};">${creditoApp(c, c.t.enviadoCon, true)}</p>`);
    return `<tr><td class="cx-pad" align="center" bgcolor="${NEUTROS.fondoPie}" style="padding:22px 40px 22px 40px;background-color:${NEUTROS.fondoPie};border-top:1px solid ${NEUTROS.lineaTabla};text-align:center;">${lineas.join('\n')}</td></tr>`;
}
function pieSuite(c, aviso) {
    const universo = conMarca(escaparHtml(c.t.universo), '{saluhold}', '<strong style="font-weight:600;">SaluHold</strong>');
    const hermanas = c.app === 'factronia'
        ? []
        : APPS_DEL_PIE.map((a) => `<a href="${escaparHtml(MARCAS[a].web)}" style="color:${NEUTROS.gris};text-decoration:none;">${escaparHtml(MARCAS[a].nombre)}</a>`);
    const anio = new Date().getFullYear();
    return `<tr><td class="cx-pad" align="center" bgcolor="${NEUTROS.fondoPie}" style="padding:22px 40px 24px 40px;background-color:${NEUTROS.fondoPie};border-top:1px solid ${NEUTROS.lineaTabla};text-align:center;">
${aviso ? `<p style="margin:0 0 12px 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};">${fmt(aviso)}</p>` : ''}
<p style="margin:0 0 6px 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};">${universo}</p>
${hermanas.length ? `<p style="margin:0 0 6px 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};">${hermanas.join(' &nbsp;&middot;&nbsp; ')}</p>` : ''}
<p style="margin:0;${P_BASE}font-size:11px;line-height:1.5;color:${NEUTROS.gris};">&copy; ${anio} SaluHold. ${escaparHtml(c.t.derechos)}</p>
</td></tr>`;
}
// ─── Texto alternativo ──────────────────────────────────────────────────────
function textoBloque(b, c) {
    switch (b.tipo) {
        case 'parrafo': return plano(b.texto);
        case 'boton': {
            const url = urlSegura(b.url);
            return url ? `${plano(b.texto)}: ${url}` : '';
        }
        case 'tabla': return (b.filas || []).map((f) => `${plano(f.etiqueta)}: ${plano(f.valor)}${f.detalle ? ` (${plano(f.detalle)})` : ''}`).join('\n');
        case 'rejilla': return (b.filas || []).map((fila) => fila.map((celda) => {
            const o = typeof celda === 'string' ? { texto: celda, detalle: null } : celda;
            return `${plano(o.texto)}${o.detalle ? ` (${plano(o.detalle)})` : ''}`;
        }).join(' | ')).join('\n');
        case 'lista': return `${b.titulo ? `${plano(b.titulo)}\n` : ''}${b.items.map((i, n) => `${b.ordenada ? `${n + 1}.` : '-'} ${plano(i)}`).join('\n')}`;
        case 'caja': return [b.titulo ? plano(b.titulo) : '', b.texto ? plano(b.texto) : '', ...(b.filas || []).map((f) => `${plano(f.etiqueta)}: ${plano(f.valor)}`)].filter(Boolean).join('\n');
        case 'separador': return '---';
        case 'firma': return [b.despedida ? plano(b.despedida) : '', b.nombre, b.detalle ? plano(b.detalle) : ''].filter(Boolean).join('\n');
        case 'nota': return plano(b.texto);
        case 'acciones': return (b.botones || []).map((a) => {
            const url = urlSegura(a?.url);
            return url ? `${plano(a.texto)}: ${url}` : '';
        }).filter(Boolean).join('\n');
        case 'ciclo': return [
            plano(b.titulo),
            b.texto ? plano(b.texto) : '',
            ...[...(b.fechas || []), ...(b.enlaces || [])].map((f) => {
                const url = urlSegura(f?.url);
                return url ? `- ${plano(f.texto)}: ${url}` : '';
            }),
            b.nota ? plano(b.nota) : '',
        ].filter(Boolean).join('\n');
        case 'imagen': return imagenCuerpoSegura(b.src) ? [`[${plano(b.alt)}]`, b.pie ? plano(b.pie) : ''].filter(Boolean).join('\n') : '';
        case 'htmlConfianza': return htmlATexto(sanearHtmlCorreo(b.html));
        case 'pasos': return `${b.titulo ? `${plano(b.titulo)}\n` : ''}${(b.items || []).filter((p) => p && String(p.titulo ?? '').trim())
            .map((p, n) => `${n + 1}. ${plano(p.titulo)}${p.texto ? `\n   ${plano(p.texto)}` : ''}`).join('\n')}`;
        default:
            void c;
            return '';
    }
}
// ─── Render ─────────────────────────────────────────────────────────────────
/**
 * Compone un correo completo de la suite.
 *
 * @returns `html` (documento completo), `text` (alternativa sin HTML para el
 *          `text` de Resend) y `fromName` (sin la dirección).
 */
export function renderCorreo(o) {
    const marca = MARCAS[o.app];
    if (!marca)
        throw new Error(`renderCorreo: app desconocida «${String(o.app)}»`);
    if (o.variante !== 'A' && o.variante !== 'B' && o.variante !== 'C') {
        throw new Error(`renderCorreo: variante desconocida «${String(o.variante)}»`);
    }
    const idioma = idiomaDelMarco(o.idioma);
    const t = TEXTOS_MARCO[idioma];
    const rtl = esRtl(idioma);
    const tenant = o.tenant?.nombre?.trim() ? o.tenant : null;
    const acento = o.variante === 'A' && tenant
        ? resolverAcento(tenant.colorPrimario, marca.accion, marca.acento)
        : { accion: marca.accion, filete: marca.acento, origen: 'app' };
    const c = {
        marca, app: o.app, variante: o.variante, t, idioma, rtl,
        ini: rtl ? 'right' : 'left', fin: rtl ? 'left' : 'right',
        accion: acento.accion, primarioUsado: false, alternativos: [],
    };
    // Remitente
    const remitenteB = o.variante === 'B'
        ? (o.remitente?.nombre?.trim() ? o.remitente : tenant ? { nombre: tenant.nombre } : null)
        : null;
    let fromName;
    if (o.variante === 'A' && tenant)
        fromName = `${tenant.nombre} (${t.via} ${marca.nombre})`;
    else if (o.variante === 'B' && remitenteB)
        fromName = remitenteB.nombre;
    else
        fromName = marca.nombre;
    fromName = limpiarRemitente(fromName) || marca.nombre;
    // Cabecera
    let cabecera = '';
    const tenantC = o.variante === 'C' ? tenant : null;
    const logoC = tenantC ? imagenSegura(tenantC.logoUrl) : null;
    if (o.variante === 'C')
        cabecera = cabeceraApp(c, tenantC);
    else if (o.variante === 'A' && !tenant)
        cabecera = cabeceraApp(c);
    else if (o.variante === 'A' && tenant)
        cabecera = cabeceraTenant(c, tenant);
    // Cuerpo
    const partes = [];
    if (o.variante === 'B' && remitenteB)
        partes.push(membreteRemitente(c, remitenteB));
    // Versalitas espaciadas solo en alfabetos latinos/cirílicos: el árabe se
    // escribe ligado y el espaciado entre letras lo rompe.
    const versalitas = rtl ? 'font-size:13px;' : 'font-size:11px;letter-spacing:1px;text-transform:uppercase;';
    if (o.antetitulo)
        partes.push(`<p style="margin:0 0 8px 0;${P_BASE}${versalitas}font-weight:700;line-height:1.4;color:${c.accion};text-align:${c.ini};">${fmt(o.antetitulo)}</p>`);
    // C con centro y sin logo: su nombre en gris bajo el título, salvo que el
    // llamador ya lo haya puesto como antetítulo.
    const nombreCentroC = tenantC && !logoC && !mismoTexto(o.antetitulo, tenantC.nombre) ? tenantC.nombre : null;
    if (o.titulo)
        partes.push(`<h1 style="margin:0 0 ${nombreCentroC ? 6 : 18}px 0;${P_BASE}font-size:${o.variante === 'B' ? 18 : 22}px;font-weight:600;line-height:1.3;color:${NEUTROS.texto};text-align:${c.ini};">${fmt(o.titulo)}</h1>`);
    if (nombreCentroC)
        partes.push(`<p style="margin:0 0 20px 0;${P_BASE}font-size:14px;line-height:1.5;color:${NEUTROS.gris};text-align:${c.ini};">${escaparHtml(nombreCentroC)}</p>`);
    for (const b of o.bloques || [])
        partes.push(bloqueHtml(c, b));
    partes.push(lineaAlternativos(c));
    const cuerpo = `<tr><td class="cx-pad" style="padding:${o.variante === 'B' ? '36px' : '32px'} 40px ${o.variante === 'B' ? '34px' : '30px'} 40px;text-align:${c.ini};">${partes.join('\n')}</td></tr>`;
    // Pie
    let pie = '';
    let fuera = '';
    if (o.variante === 'A')
        pie = tenant ? pieTenant(c, tenant, o.pieAviso) : pieSuite(c, o.pieAviso);
    else if (o.variante === 'C')
        pie = pieSuite(c, o.pieAviso);
    else {
        fuera = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;"><tr><td align="center" style="padding:16px 24px 0 24px;${P_BASE}font-size:11px;line-height:1.5;color:${NEUTROS.gris};text-align:center;">
${o.pieAviso ? `${fmt(o.pieAviso)}<br>` : ''}${creditoApp(c, t.enviadoMediante, false)}
</td></tr></table>`;
    }
    // Filete superior: acento de la app (C), del centro (A); B sin color.
    const bordeTarjeta = o.variante === 'B'
        ? `border:1px solid ${NEUTROS.borde};`
        : `border:1px solid ${NEUTROS.borde};border-top:3px solid ${acento.filete};`;
    const fondo = o.variante === 'B' ? '#f4f3ef' : marca.fondoPagina;
    const tituloDoc = escaparHtml(plano(o.titulo || (o.variante === 'A' && tenant ? tenant.nombre : marca.nombre)));
    const pre = escaparHtml(plano(o.preheader || ''));
    // Relleno tras el preheader: evita que la bandeja muestre el principio del cuerpo.
    const relleno = '&#847;&zwnj;&nbsp;'.repeat(60);
    const html = `<!DOCTYPE html>
<html lang="${idioma}" dir="${rtl ? 'rtl' : 'ltr'}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${tituloDoc}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@import url('https://fonts.googleapis.com/css2?family=Mulish:wght@800&display=swap');
:root { color-scheme: light only; supported-color-schemes: light; }
body { margin:0 !important; padding:0 !important; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
table { mso-table-lspace:0pt; mso-table-rspace:0pt; }
img { -ms-interpolation-mode:bicubic; }
a { color:${c.accion}; }
@media only screen and (max-width:620px) {
  .cx-pad { padding-left:24px !important; padding-right:24px !important; }
  .cx-exterior { padding:16px 10px !important; }
  .cx-acciones { width:100% !important; float:none !important; }
  .cx-acc { display:block !important; width:100% !important; padding:0 0 10px 0 !important; box-sizing:border-box; }
  .cx-acc .cx-boton { width:100% !important; }
  .cx-acc .cx-boton a { display:block !important; text-align:center !important; }
}
</style>
</head>
<body dir="${rtl ? 'rtl' : 'ltr'}" bgcolor="${fondo}" style="margin:0;padding:0;background-color:${fondo};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${fondo};mso-hide:all;">${pre}${relleno}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${fondo}" style="background-color:${fondo};">
<tr><td align="center" class="cx-exterior" style="padding:32px 16px 36px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${rtl ? 'rtl' : 'ltr'}" bgcolor="#ffffff" style="max-width:600px;background-color:#ffffff;${bordeTarjeta}border-radius:12px;border-collapse:separate;">
${cabecera}
${cuerpo}
${pie}
</table>
${fuera}
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
    // Texto alternativo
    const txt = [];
    if (o.variante === 'B' && remitenteB)
        txt.push(remitenteB.nombre + (remitenteB.detalle ? `\n${remitenteB.detalle}` : ''), '');
    else if (o.variante === 'A' && tenant)
        txt.push(tenant.nombre, '');
    else if (tenantC && logoC)
        txt.push(`${marca.nombre} · ${tenantC.nombre}`, '');
    else
        txt.push(marca.nombre, '');
    if (o.antetitulo)
        txt.push(plano(o.antetitulo).toUpperCase());
    if (o.titulo)
        txt.push(plano(o.titulo), ...(nombreCentroC ? [nombreCentroC] : []), '');
    else if (nombreCentroC)
        txt.push(nombreCentroC, '');
    for (const b of o.bloques || []) {
        const s = textoBloque(b, c);
        if (s)
            txt.push(s, '');
    }
    txt.push('--');
    if (o.pieAviso)
        txt.push(plano(o.pieAviso));
    if (o.variante === 'A' && tenant) {
        txt.push(tenant.nombre);
        if (tenant.direccion)
            txt.push(tenant.direccion);
        const contacto = [tenant.telefono ? `${t.tel} ${tenant.telefono}` : '', tenant.email || '', tenant.web || ''].filter(Boolean).join(' · ');
        if (contacto)
            txt.push(contacto);
        txt.push(t.enviadoCon.replace('{app}', marca.nombre));
    }
    else if (o.variante === 'B') {
        txt.push(t.enviadoMediante.replace('{app}', marca.nombre));
    }
    else {
        txt.push(t.universo.replace('{saluhold}', 'SaluHold'), `© ${new Date().getFullYear()} SaluHold. ${t.derechos}`);
    }
    return {
        html,
        text: txt.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n',
        fromName,
        meta: { idioma, dir: rtl ? 'rtl' : 'ltr', acento },
    };
}
//# sourceMappingURL=render.js.map