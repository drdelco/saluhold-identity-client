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
// respetan. No hay forma de colar HTML propio, a propósito: es lo que impide
// que el mensaje de un profesional o el asunto de un ticket rompa el correo.
//
// JS puro, sin Firebase ni DOM: lo usan igual las Cloud Functions (CommonJS)
// que un render de prueba en local.

import { MARCAS, APPS_DEL_PIE, NEUTROS, TONOS, FUENTES, type AppCorreo, type MarcaCorreo, type TonoCaja } from './marcas';
import { resolverAcento, type AcentoResuelto } from './color';
import { TEXTOS_MARCO, idiomaDelMarco, esRtl, type TextosMarco } from './textos';

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export type VarianteCorreo = 'A' | 'B' | 'C';

export interface TenantCorreo {
  nombre: string;
  /** PNG/JPG por https. Se pinta a 56 px de alto como máximo. */
  logoUrl?: string | null;
  /** Color del centro (`#rrggbb`). Si no llega a 4,5:1 sobre blanco se oscurece o se cae al de la app. */
  colorPrimario?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  web?: string | null;
}

/** Membrete de la variante B (por defecto, el nombre del tenant). */
export interface RemitenteCorreo {
  nombre: string;
  /** Especialidad, cargo o centro, en una línea. */
  detalle?: string | null;
}

export interface FilaDato {
  etiqueta: string;
  valor: string;
  /** Segunda línea, más pequeña, bajo el valor. */
  detalle?: string | null;
  /** Importe o dato principal: un punto más grande y en negrita. */
  destacado?: boolean;
  /** IBAN, códigos: letra de ancho fijo. */
  mono?: boolean;
}

export type CeldaRejilla = string | { texto: string; detalle?: string | null; fuerte?: boolean };

export type BloqueCorreo =
  | { tipo: 'parrafo'; texto: string; suave?: boolean }
  | { tipo: 'boton'; texto: string; url: string; secundario?: boolean; alternativo?: boolean }
  | { tipo: 'tabla'; filas: FilaDato[] }
  | { tipo: 'rejilla'; columnas: string[]; filas: CeldaRejilla[][] }
  | { tipo: 'lista'; items: string[]; titulo?: string | null; ordenada?: boolean }
  | { tipo: 'caja'; tono?: TonoCaja; titulo?: string | null; texto?: string | null; filas?: FilaDato[] }
  | { tipo: 'separador' }
  | { tipo: 'firma'; nombre: string; despedida?: string | null; detalle?: string | null }
  | { tipo: 'nota'; texto: string };

export interface OpcionesCorreo {
  app: AppCorreo;
  variante: VarianteCorreo;
  /** Idioma del destinatario (dos letras). Pie, remitente y enlace alternativo salen en él. */
  idioma?: string | null;
  tenant?: TenantCorreo | null;
  /** Solo variante B: quién firma (por defecto, el tenant). */
  remitente?: RemitenteCorreo | null;
  /** Texto oculto que la bandeja muestra tras el asunto. */
  preheader?: string | null;
  titulo?: string | null;
  antetitulo?: string | null;
  bloques: BloqueCorreo[];
  /** Línea del pie antes de la marca («Recibe este correo porque…»). Ya en su idioma. */
  pieAviso?: string | null;
}

export interface CorreoRenderizado {
  html: string;
  text: string;
  /** Nombre del remitente (sin dirección): `{fromName} <salufile@saluhold.com>`. */
  fromName: string;
  meta: { idioma: string; dir: 'ltr' | 'rtl'; acento: AcentoResuelto };
}

// ─── Utilidades ─────────────────────────────────────────────────────────────

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para HTML (contenido y atributos). */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Texto de usuario → HTML: escapado, `**negrita**` y saltos de línea. */
function fmt(valor: unknown): string {
  return escaparHtml(valor)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\r?\n/g, '<br>');
}

/** El mismo texto para la versión sin HTML. */
function plano(valor: unknown): string {
  return String(valor ?? '').replace(/\*\*(.+?)\*\*/g, '$1');
}

/** Solo http(s), mailto y tel. Cualquier otra cosa (javascript:, data:…) se descarta. */
function urlSegura(valor: unknown): string | null {
  const s = String(valor ?? '').trim();
  return /^(https?:\/\/|mailto:|tel:)/i.test(s) ? s : null;
}

function imagenSegura(valor: unknown): string | null {
  const s = String(valor ?? '').trim();
  return /^https?:\/\//i.test(s) ? s : null;
}

/** Quita lo que no puede ir en un display name de cabecera From. */
function limpiarRemitente(valor: string): string {
  return valor.replace(/[<>"\r\n\\]/g, '').replace(/\s+/g, ' ').trim();
}

const conMarca = (plantilla: string, clave: string, html: string) => plantilla.replace(clave, html);

/** Teléfonos, correos y URLs dentro de un texto RTL: aislados para que no se inviertan. */
function aislarLtr(c: { rtl: boolean }, html: string): string {
  return c.rtl ? `<span dir="ltr" style="unicode-bidi:embed;">${html}</span>` : html;
}

interface Ctx {
  marca: MarcaCorreo;
  app: AppCorreo;
  variante: VarianteCorreo;
  t: TextosMarco;
  idioma: string;
  rtl: boolean;
  ini: 'left' | 'right';
  fin: 'left' | 'right';
  accion: string;
  primarioUsado: boolean;
}

// ─── Piezas HTML ────────────────────────────────────────────────────────────

const P_BASE = `font-family:${FUENTES.cuerpo};`;

function wordmarkHtml(m: MarcaCorreo, tam: number): string {
  const [a, b] = m.wordmark;
  return `<span style="font-family:${FUENTES.marca};font-size:${tam}px;font-weight:800;letter-spacing:-0.3px;line-height:1;white-space:nowrap;"><span style="color:${a.color};">${escaparHtml(a.texto)}</span><span style="color:${b.color};">${escaparHtml(b.texto)}</span></span>`;
}

function cabeceraApp(c: Ctx): string {
  const m = c.marca;
  return `<tr><td class="cx-pad" align="${c.ini}" style="padding:26px 40px 22px 40px;border-bottom:1px solid ${NEUTROS.lineaTabla};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="ltr"><tr>
<td valign="middle" style="padding:0 11px 0 0;"><img src="${escaparHtml(m.iconoUrl)}" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;border-radius:8px;"></td>
<td valign="middle">${wordmarkHtml(m, 21)}</td>
</tr></table>
</td></tr>`;
}

function cabeceraTenant(c: Ctx, tenant: TenantCorreo): string {
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

function membreteRemitente(c: Ctx, r: RemitenteCorreo): string {
  return `<p style="margin:0;font-family:${FUENTES.sobria};font-size:21px;line-height:1.3;color:${NEUTROS.texto};text-align:${c.ini};">${escaparHtml(r.nombre)}</p>
${r.detalle ? `<p style="margin:4px 0 0 0;${P_BASE}font-size:13px;line-height:1.5;color:${NEUTROS.gris};text-align:${c.ini};">${escaparHtml(r.detalle)}</p>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:18px 0 22px 0;"><div style="border-top:1px solid ${NEUTROS.borde};font-size:0;line-height:0;">&nbsp;</div></td></tr></table>`;
}

function parrafo(c: Ctx, texto: string, suave = false): string {
  return `<p style="margin:0 0 16px 0;${P_BASE}font-size:15px;line-height:1.65;color:${suave ? NEUTROS.textoSuave : NEUTROS.texto};text-align:${c.ini};">${fmt(texto)}</p>`;
}

function boton(c: Ctx, b: Extract<BloqueCorreo, { tipo: 'boton' }>): string {
  const url = urlSegura(b.url);
  if (!url) return '';
  // Un solo botón primario por correo: los siguientes bajan a enlace.
  const secundario = b.secundario || c.primarioUsado;
  if (secundario) {
    const flecha = c.rtl ? '&larr;' : '&rarr;';
    return `<p style="margin:0 0 16px 0;${P_BASE}font-size:14px;line-height:1.5;text-align:${c.ini};"><a href="${escaparHtml(url)}" style="color:${c.accion};font-weight:600;text-decoration:none;">${escaparHtml(b.texto)}&nbsp;${flecha}</a></p>`;
  }
  c.primarioUsado = true;
  const alternativo = b.alternativo === false ? '' : `<p style="margin:0 0 20px 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};text-align:${c.ini};word-break:break-all;">${escaparHtml(c.t.enlaceAlternativo)}<br>${aislarLtr(c, `<a href="${escaparHtml(url)}" style="color:${c.accion};text-decoration:underline;">${escaparHtml(url)}</a>`)}</p>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${c.ini}" style="margin:8px 0 18px 0;"><tr>
<td bgcolor="${c.accion}" style="border-radius:8px;background-color:${c.accion};">
<a href="${escaparHtml(url)}" style="display:inline-block;padding:13px 26px;${P_BASE}font-size:15px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;">${escaparHtml(b.texto)}</a>
</td></tr></table>
<div style="clear:both;font-size:0;line-height:0;">&nbsp;</div>
${alternativo}`;
}

function filasDato(c: Ctx, filas: FilaDato[], dentroDeCaja = false): string {
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

function tabla(c: Ctx, filas: FilaDato[]): string {
  if (!filas.length) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px 0;border-top:1px solid ${NEUTROS.lineaTabla};border-bottom:1px solid ${NEUTROS.lineaTabla};"><tr><td>${filasDato(c, filas)}</td></tr></table>`;
}

function rejilla(c: Ctx, columnas: string[], filas: CeldaRejilla[][]): string {
  const th = columnas.map((col) => `<th align="${c.ini}" style="padding:0 10px 8px 0;${P_BASE}font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:${NEUTROS.gris};border-bottom:1px solid ${NEUTROS.borde};text-align:${c.ini};">${fmt(col)}</th>`).join('');
  const trs = filas.map((fila) => `<tr>${fila.map((celda, j) => {
    const o = typeof celda === 'string' ? { texto: celda } : celda;
    const fuerte = o.fuerte ?? j === 0;
    return `<td valign="top" style="padding:11px 10px 11px 0;border-bottom:1px solid ${NEUTROS.lineaTabla};${P_BASE}font-size:14px;line-height:1.45;color:${NEUTROS.texto};${fuerte ? 'font-weight:600;' : ''}text-align:${c.ini};${j === 0 ? 'white-space:nowrap;' : ''}">${fmt(o.texto)}${o.detalle ? `<br><span style="font-size:12px;font-weight:400;color:${NEUTROS.gris};">${fmt(o.detalle)}</span>` : ''}</td>`;
  }).join('')}</tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:4px 0 24px 0;"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

function lista(c: Ctx, b: Extract<BloqueCorreo, { tipo: 'lista' }>): string {
  const etiqueta = b.ordenada ? 'ol' : 'ul';
  const pad = c.rtl ? 'padding:0 22px 0 0;' : 'padding:0 0 0 22px;';
  const titulo = b.titulo ? `<p style="margin:0 0 6px 0;${P_BASE}font-size:13px;font-weight:600;color:${NEUTROS.textoSuave};text-align:${c.ini};">${fmt(b.titulo)}</p>` : '';
  const items = b.items.map((i) => `<li style="margin:0 0 6px 0;">${fmt(i)}</li>`).join('');
  return `${titulo}<${etiqueta} style="margin:0 0 18px 0;${pad}${P_BASE}font-size:15px;line-height:1.55;color:${NEUTROS.texto};text-align:${c.ini};">${items}</${etiqueta}>`;
}

function caja(c: Ctx, b: Extract<BloqueCorreo, { tipo: 'caja' }>): string {
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

function separador(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 0 26px 0;"><div style="border-top:1px solid ${NEUTROS.borde};font-size:0;line-height:0;">&nbsp;</div></td></tr></table>`;
}

function firma(c: Ctx, b: Extract<BloqueCorreo, { tipo: 'firma' }>): string {
  return `<p style="margin:8px 0 0 0;${P_BASE}font-size:15px;line-height:1.6;color:${NEUTROS.texto};text-align:${c.ini};">${b.despedida ? `${fmt(b.despedida)}<br>` : ''}<strong>${escaparHtml(b.nombre)}</strong>${b.detalle ? `<br><span style="font-size:13px;color:${NEUTROS.gris};">${fmt(b.detalle)}</span>` : ''}</p>`;
}

function nota(c: Ctx, texto: string): string {
  return `<p style="margin:22px 0 0 0;${P_BASE}font-size:12.5px;line-height:1.55;color:${NEUTROS.gris};text-align:${c.ini};">${fmt(texto)}</p>`;
}

function bloqueHtml(c: Ctx, b: BloqueCorreo): string {
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
    default: return '';
  }
}

// ─── Pies ───────────────────────────────────────────────────────────────────

function creditoApp(c: Ctx, plantilla: string, conIcono: boolean): string {
  const m = c.marca;
  const icono = conIcono
    ? `<img src="${escaparHtml(m.iconoUrl)}" width="14" height="14" alt="" style="display:inline-block;width:14px;height:14px;border:0;border-radius:4px;vertical-align:-3px;">&nbsp;`
    : '';
  const nombre = `${icono}<a href="${escaparHtml(m.web)}" style="color:${NEUTROS.gris};text-decoration:none;font-weight:600;">${escaparHtml(m.nombre)}</a>`;
  return conMarca(escaparHtml(plantilla), '{app}', nombre);
}

function pieTenant(c: Ctx, tenant: TenantCorreo | null, aviso: string | null | undefined): string {
  const lineas: string[] = [];
  if (tenant?.nombre) {
    lineas.push(`<p style="margin:0 0 4px 0;${P_BASE}font-size:13px;font-weight:600;line-height:1.5;color:${NEUTROS.texto};">${escaparHtml(tenant.nombre)}</p>`);
    if (tenant.direccion) lineas.push(`<p style="margin:0 0 2px 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};">${escaparHtml(tenant.direccion)}</p>`);
    const contacto = [
      tenant.telefono ? `${escaparHtml(c.t.tel)} ${aislarLtr(c, escaparHtml(tenant.telefono))}` : '',
      tenant.email ? aislarLtr(c, escaparHtml(tenant.email)) : '',
      tenant.web ? aislarLtr(c, escaparHtml(tenant.web.replace(/^https?:\/\//, ''))) : '',
    ].filter(Boolean).join(' &middot; ');
    if (contacto) lineas.push(`<p style="margin:0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};">${contacto}</p>`);
  }
  if (aviso) lineas.push(`<p style="margin:${lineas.length ? 12 : 0}px 0 0 0;${P_BASE}font-size:12px;line-height:1.5;color:${NEUTROS.gris};">${fmt(aviso)}</p>`);
  lineas.push(`<p style="margin:${lineas.length ? 14 : 0}px 0 0 0;${P_BASE}font-size:11px;line-height:1.5;color:${NEUTROS.gris};">${creditoApp(c, c.t.enviadoCon, true)}</p>`);
  return `<tr><td class="cx-pad" align="center" bgcolor="${NEUTROS.fondoPie}" style="padding:22px 40px 22px 40px;background-color:${NEUTROS.fondoPie};border-top:1px solid ${NEUTROS.lineaTabla};text-align:center;">${lineas.join('\n')}</td></tr>`;
}

function pieSuite(c: Ctx, aviso: string | null | undefined): string {
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

function textoBloque(b: BloqueCorreo, c: Ctx): string {
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
    default: void c; return '';
  }
}

// ─── Render ─────────────────────────────────────────────────────────────────

/**
 * Compone un correo completo de la suite.
 *
 * @returns `html` (documento completo), `text` (alternativa sin HTML para el
 *          `text` de Resend) y `fromName` (sin la dirección).
 */
export function renderCorreo(o: OpcionesCorreo): CorreoRenderizado {
  const marca = MARCAS[o.app];
  if (!marca) throw new Error(`renderCorreo: app desconocida «${String(o.app)}»`);
  if (o.variante !== 'A' && o.variante !== 'B' && o.variante !== 'C') {
    throw new Error(`renderCorreo: variante desconocida «${String(o.variante)}»`);
  }
  const idioma = idiomaDelMarco(o.idioma);
  const t = TEXTOS_MARCO[idioma];
  const rtl = esRtl(idioma);
  const tenant = o.tenant?.nombre?.trim() ? o.tenant : null;

  const acento = o.variante === 'A' && tenant
    ? resolverAcento(tenant.colorPrimario, marca.accion, marca.acento)
    : { accion: marca.accion, filete: marca.acento, origen: 'app' as const };

  const c: Ctx = {
    marca, app: o.app, variante: o.variante, t, idioma, rtl,
    ini: rtl ? 'right' : 'left', fin: rtl ? 'left' : 'right',
    accion: acento.accion, primarioUsado: false,
  };

  // Remitente
  const remitenteB: RemitenteCorreo | null = o.variante === 'B'
    ? (o.remitente?.nombre?.trim() ? o.remitente : tenant ? { nombre: tenant.nombre } : null)
    : null;
  let fromName: string;
  if (o.variante === 'A' && tenant) fromName = `${tenant.nombre} (${t.via} ${marca.nombre})`;
  else if (o.variante === 'B' && remitenteB) fromName = remitenteB.nombre;
  else fromName = marca.nombre;
  fromName = limpiarRemitente(fromName) || marca.nombre;

  // Cabecera
  let cabecera = '';
  if (o.variante === 'C' || (o.variante === 'A' && !tenant)) cabecera = cabeceraApp(c);
  else if (o.variante === 'A' && tenant) cabecera = cabeceraTenant(c, tenant);

  // Cuerpo
  const partes: string[] = [];
  if (o.variante === 'B' && remitenteB) partes.push(membreteRemitente(c, remitenteB));
  // Versalitas espaciadas solo en alfabetos latinos/cirílicos: el árabe se
  // escribe ligado y el espaciado entre letras lo rompe.
  const versalitas = rtl ? 'font-size:13px;' : 'font-size:11px;letter-spacing:1px;text-transform:uppercase;';
  if (o.antetitulo) partes.push(`<p style="margin:0 0 8px 0;${P_BASE}${versalitas}font-weight:700;line-height:1.4;color:${c.accion};text-align:${c.ini};">${fmt(o.antetitulo)}</p>`);
  if (o.titulo) partes.push(`<h1 style="margin:0 0 18px 0;${P_BASE}font-size:${o.variante === 'B' ? 18 : 22}px;font-weight:600;line-height:1.3;color:${NEUTROS.texto};text-align:${c.ini};">${fmt(o.titulo)}</h1>`);
  for (const b of o.bloques || []) partes.push(bloqueHtml(c, b));

  const cuerpo = `<tr><td class="cx-pad" style="padding:${o.variante === 'B' ? '36px' : '32px'} 40px ${o.variante === 'B' ? '34px' : '30px'} 40px;text-align:${c.ini};">${partes.join('\n')}</td></tr>`;

  // Pie
  let pie = '';
  let fuera = '';
  if (o.variante === 'A') pie = tenant ? pieTenant(c, tenant, o.pieAviso) : pieSuite(c, o.pieAviso);
  else if (o.variante === 'C') pie = pieSuite(c, o.pieAviso);
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
  const txt: string[] = [];
  if (o.variante === 'B' && remitenteB) txt.push(remitenteB.nombre + (remitenteB.detalle ? `\n${remitenteB.detalle}` : ''), '');
  else if (o.variante === 'A' && tenant) txt.push(tenant.nombre, '');
  else txt.push(marca.nombre, '');
  if (o.antetitulo) txt.push(plano(o.antetitulo).toUpperCase());
  if (o.titulo) txt.push(plano(o.titulo), '');
  for (const b of o.bloques || []) {
    const s = textoBloque(b, c);
    if (s) txt.push(s, '');
  }
  txt.push('--');
  if (o.pieAviso) txt.push(plano(o.pieAviso));
  if (o.variante === 'A' && tenant) {
    txt.push(tenant.nombre);
    if (tenant.direccion) txt.push(tenant.direccion);
    const contacto = [tenant.telefono ? `${t.tel} ${tenant.telefono}` : '', tenant.email || '', tenant.web || ''].filter(Boolean).join(' · ');
    if (contacto) txt.push(contacto);
    txt.push(t.enviadoCon.replace('{app}', marca.nombre));
  } else if (o.variante === 'B') {
    txt.push(t.enviadoMediante.replace('{app}', marca.nombre));
  } else {
    txt.push(t.universo.replace('{saluhold}', 'SaluHold'), `© ${new Date().getFullYear()} SaluHold. ${t.derechos}`);
  }

  return {
    html,
    text: txt.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n',
    fromName,
    meta: { idioma, dir: rtl ? 'rtl' : 'ltr', acento },
  };
}
