// Imágenes de los correos: TODAS desde el dominio de la app que envía.
//
// Un correo de SaluFile (enlaces a salufile.com, remitente @salufile.com) con
// el logo del centro en `firebasestorage.googleapis.com` es una señal que los
// filtros corporativos puntúan («Host images on the sending domain» de
// Resend). Regla del marco desde 0.9.0: un `<img>` solo sale si su dirección
// está en el dominio de la app (`MARCAS[app].web`) o es un `cid:`.
//
//   - Icono de la app: ya era un PNG estático del Hosting de cada app.
//   - Logo del centro: vive en el Storage de Identity,
//     `tenant_logos/{tenantId}/logo_{ts}.png` (lectura pública por regla), y
//     `tenants/{id}.branding.logoUrl` guarda su dirección de Storage. El marco
//     la TRADUCE a `https://{dominio de la app}/logo/{tenantId}/logo_{ts}.png`,
//     que cada app sirve con un rewrite de Hosting a una función HTTP cuyo
//     manejador es `manejarLogoCentro` (abajo): pide el objeto público a
//     Storage y lo devuelve con caché larga para la CDN.
//   - La dirección lleva el nombre del objeto (con su marca de tiempo): es
//     estable mientras el centro no cambie el logo y cambia sola cuando lo
//     cambia. `branding.logoUrl` NO se toca: PDF, páginas y correos ya
//     enviados siguen usando la de Storage.
//   - Un logo en cualquier otro sitio no se puede servir desde el dominio de
//     la app: el correo sale sin imagen, con el nombre del centro en texto.

import { MARCAS, type AppCorreo } from './marcas';

/** Dónde guardan las tres apps (y el panel de Identity) el logo de un centro. */
export const ALMACEN_LOGOS = {
  bucket: 'identity-44874.firebasestorage.app',
  carpeta: 'tenant_logos',
} as const;

/** Ruta del Hosting de cada app que sirve el logo: `/logo/{tenantId}/{fichero}`. */
export const RUTA_LOGO = '/logo';

/** Apps cuyo Hosting tiene el rewrite `/logo/**` → `manejarLogoCentro`. */
export const APPS_CON_RUTA_DE_LOGO: readonly AppCorreo[] = ['saluFile', 'saluFirst', 'saluFact', 'factronia'];

/** Tope de tamaño (el de la regla de Storage de `tenant_logos`). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const RE_TENANT = /^[A-Za-z0-9]{6,40}$/;
const RE_FICHERO = /^logo_\d{6,17}\.(?:png|jpe?g|gif|webp)$/i;

/** Host (sin `www.`) desde el que tienen que servirse las imágenes de un correo de `app`. */
export function hostDeImagenes(app: AppCorreo): string {
  return new URL(MARCAS[app].web).host.toLowerCase();
}

function urlHttps(valor: unknown): URL | null {
  const s = String(valor ?? '').trim();
  if (!/^https:\/\/[^\s"'<>]+$/i.test(s)) return null;
  try { return new URL(s); } catch { return null; }
}

function partesValidas(tenantId: string, fichero: string): { tenantId: string; fichero: string } | null {
  return RE_TENANT.test(tenantId) && RE_FICHERO.test(fichero) ? { tenantId, fichero } : null;
}

/**
 * `{tenantId, fichero}` de la dirección de un logo de centro, venga como
 * dirección de Firebase Storage (`/v0/b/{bucket}/o/tenant_logos%2F…`), de
 * Cloud Storage (`storage.googleapis.com/{bucket}/tenant_logos/…`) o ya como
 * `/logo/{tenantId}/{fichero}` de una app. `null` si no es un logo del almacén.
 */
export function partesDeLogo(valor: unknown): { tenantId: string; fichero: string } | null {
  const u = urlHttps(valor);
  if (!u) return null;
  const host = u.host.toLowerCase();
  let ruta: string;
  try { ruta = decodeURIComponent(u.pathname); } catch { return null; }
  let objeto: string | null = null;
  if (host === 'firebasestorage.googleapis.com') {
    const pre = `/v0/b/${ALMACEN_LOGOS.bucket}/o/`;
    if (ruta.startsWith(pre)) objeto = ruta.slice(pre.length);
  } else if (host === 'storage.googleapis.com') {
    const pre = `/${ALMACEN_LOGOS.bucket}/`;
    if (ruta.startsWith(pre)) objeto = ruta.slice(pre.length);
  } else if (APPS_CON_RUTA_DE_LOGO.some((a) => hostDeImagenes(a) === host) && ruta.startsWith(`${RUTA_LOGO}/`)) {
    objeto = `${ALMACEN_LOGOS.carpeta}/${ruta.slice(RUTA_LOGO.length + 1)}`;
  }
  if (!objeto) return null;
  const trozos = objeto.split('/');
  if (trozos.length !== 3 || trozos[0] !== ALMACEN_LOGOS.carpeta) return null;
  return partesValidas(trozos[1], trozos[2]);
}

/**
 * La dirección del logo del centro en el dominio de `app`
 * (`https://salufile.com/logo/{tenantId}/logo_{ts}.png`), o `null` si el logo
 * no está en el almacén de la suite o la app no tiene la ruta: entonces el
 * correo sale sin imagen.
 */
export function logoEnDominioDeLaApp(app: AppCorreo, logoUrl: unknown): string | null {
  if (!APPS_CON_RUTA_DE_LOGO.includes(app)) return null;
  const p = partesDeLogo(logoUrl);
  if (!p) return null;
  return `https://${hostDeImagenes(app)}${RUTA_LOGO}/${p.tenantId}/${p.fichero}`;
}

/** Imagen del cuerpo: https EN EL DOMINIO DE LA APP, o `cid:` (adjunto en línea). */
export function imagenDelDominio(app: AppCorreo, valor: unknown): string | null {
  const s = String(valor ?? '').trim();
  if (/^cid:[^\s"'<>]+$/i.test(s)) return s;
  const u = urlHttps(s);
  return u && u.host.toLowerCase() === hostDeImagenes(app) ? s : null;
}

/**
 * Las imágenes de un correo ya compuesto que NO se sirven desde el dominio de
 * `app` (ni son `cid:`): `<img src>`, `background="…"` y `url(…)` de un fondo.
 * Para las pruebas de cada app: tiene que devolver `[]`.
 */
export function imagenesFueraDelDominio(app: AppCorreo, html: string): string[] {
  const host = hostDeImagenes(app);
  const vistas: string[] = [];
  const texto = String(html ?? '');
  const patrones = [
    /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    /\bbackground\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    /background(?:-image)?\s*:[^;"}]*?url\(\s*(?:&quot;|["'])?([^)"']+?)(?:&quot;|["'])?\s*\)/gi,
  ];
  for (const re of patrones) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(texto))) vistas.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/&amp;/g, '&').trim());
  }
  return vistas.filter((src) => {
    if (/^cid:/i.test(src)) return false;
    const u = urlHttps(src);
    return !(u && u.host.toLowerCase() === host);
  });
}

// ─── Fuente de la marca ─────────────────────────────────────────────────────
//
// El wordmark («SaluFile», «Factronia»…) se pinta en Mulish 800. Hasta 0.9.0
// el marco la cargaba con un `@import` de fonts.googleapis.com: el único
// recurso externo que quedaba en un correo (y lo que señalaba Resend). Desde
// 0.9.1 cada app publica el WOFF2 en su Hosting, `/fonts/mulish-800.woff2`
// (subconjunto latino, SIL OFL 1.1, con su `/fonts/OFL.txt`), y el marco
// declara un `@font-face` con `src` en el dominio de la app que envía.
//
//   - Solo el wordmark usa esa fuente y solo lleva letras ASCII, en los 12
//     idiomas: el subconjunto latino (con acentos y ñ) sobra. Ningún texto
//     traducido se pinta con ella, así que no hay alfabeto que cubrir.
//   - Donde el cliente no carga fuentes web (Gmail, Outlook), la pila de
//     respaldo de `FUENTES.marca`, como siempre.
//   - El `@font-face` va en un `<style>` propio, oculto a Outlook de
//     escritorio (`<!--[if !mso]><!-->`): Word, ante una fuente web declarada,
//     ignora la pila de respaldo y pinta Times New Roman.
//   - Una app sin la ruta (`saluHold`) no declara fuente web.

/** Ruta del Hosting de cada app que sirve la fuente del wordmark. */
export const RUTA_FUENTE_MARCA = '/fonts/mulish-800.woff2';

/** Apps cuyo Hosting publica `RUTA_FUENTE_MARCA`. */
export const APPS_CON_FUENTE_DE_MARCA: readonly AppCorreo[] = ['saluFile', 'saluFirst', 'saluFact', 'factronia'];

/** La dirección de la fuente del wordmark en el dominio de `app`, o `null` si no la publica. */
export function fuenteDeMarcaEnDominio(app: AppCorreo): string | null {
  return APPS_CON_FUENTE_DE_MARCA.includes(app) ? `https://${hostDeImagenes(app)}${RUTA_FUENTE_MARCA}` : null;
}

/** El `<style>` con el `@font-face` del wordmark (cadena vacía si la app no publica la fuente). */
export function estiloFuenteDeMarca(app: AppCorreo): string {
  const url = fuenteDeMarcaEnDominio(app);
  if (!url) return '';
  return `<!--[if !mso]><!--><style>
@font-face { font-family:'Mulish'; font-style:normal; font-weight:800; font-display:swap; src:url('${url}') format('woff2'); }
</style><!--<![endif]-->`;
}

/**
 * TODO recurso que un correo ya compuesto haría descargar al cliente y que NO
 * está en el dominio de `app` (ni es `cid:`): cualquier `src` (img, fuente,
 * vídeo, iframe, VML…), `srcset`, `background="…"`, `<link href>`, `@import` y
 * `url(…)` de cualquier CSS (fondos, `@font-face`). Los enlaces de navegación
 * (`<a href>`) no cuentan. Para las pruebas de cada app: tiene que dar `[]`.
 */
export function recursosFueraDelDominio(app: AppCorreo, html: string): string[] {
  const host = hostDeImagenes(app);
  const texto = String(html ?? '');
  const vistas: string[] = [];
  const limpia = (v: string) => v.replace(/&amp;/g, '&').replace(/&quot;|&#39;|&#x27;/gi, '').replace(/^["']|["']$/g, '').trim();
  // Atributos de etiqueta que piden un recurso.
  const deEtiqueta = [
    /<[a-z][^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    /<[a-z][^>]*?\sbackground\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    /<link\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  ];
  for (const re of deEtiqueta) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(texto))) vistas.push(limpia(m[1] ?? m[2] ?? m[3] ?? ''));
  }
  // CSS: solo donde hay CSS de verdad (<style> y atributos style), no en el
  // texto visible (un «url(…)» escrito por alguien no pide nada).
  const css: string[] = [];
  const bloques = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
  const atributos = /<[a-z][^>]*?\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let c: RegExpExecArray | null;
  while ((c = bloques.exec(texto))) css.push(c[1]);
  while ((c = atributos.exec(texto))) css.push(c[1] ?? c[2] ?? '');
  const deCss = [
    /@import\s+(?:url\(\s*)?(?:&quot;|["'])?([^"')\s;]+)/gi,
    /url\(\s*((?:&quot;|["'])?[^)]*?(?:&quot;|["'])?)\s*\)/gi,
  ];
  for (const trozo of css) {
    for (const re of deCss) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(trozo))) vistas.push(limpia(m[1] ?? ''));
    }
  }
  const srcset = /\ssrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = srcset.exec(texto))) {
    for (const trozo of (m[1] ?? m[2] ?? '').split(',')) {
      const u = limpia(trozo.trim().split(/\s+/)[0] || '');
      if (u) vistas.push(u);
    }
  }
  const fuera = vistas.filter((src) => {
    if (/^cid:/i.test(src)) return false;
    const u = urlHttps(src);
    return !(u && u.host.toLowerCase() === host);
  });
  return [...new Set(fuera)];
}

// ─── Enlaces: al dominio de la app ──────────────────────────────────────────
//
// Resend: «Ensure link URLs match sending domain». Un correo de SaluFile cuyos
// botones van a cloudfunctions.net, a otra app de la suite o a saluhold.com es
// otra señal que los filtros puntúan. Regla desde 0.9.2: todo enlace http(s)
// de un correo va al dominio de la app que envía (o a un subdominio suyo), y
// lo que no pueda ir ahí está en una lista blanca EXPLÍCITA y corta de quien
// compone el correo (la web del propio centro, un enlace que escribe el
// profesional, un destino externo inevitable).
//
// En el marco: el pie de la variante C NOMBRA las apps hermanas sin enlazarlas
// (solo la propia app enlaza) y la web del centro va en texto.

/** ¿Es `host` el dominio `base` o un subdominio suyo? */
function esDelDominio(host: string, base: string): boolean {
  return host === base || host.endsWith('.' + base);
}

/** Host de un enlace http(s), en minúsculas; `null` si no es http(s) (mailto:, tel:, #ancla, cid:…); `''` si no se puede leer. */
function hostDeEnlace(valor: string): string | null {
  const s = valor.replace(/&amp;/g, '&').trim();
  if (!/^https?:\/\//i.test(s)) return null;
  try { return new URL(s).host.toLowerCase(); } catch { return ''; }
}

export interface OpcionesEnlaces {
  /**
   * Hosts admitidos además del dominio de la app: una cadena vale para ese
   * host y sus subdominios; una expresión regular se prueba contra el host.
   */
  permitidos?: ReadonlyArray<string | RegExp>;
}

/**
 * Los ENLACES http(s) de un correo ya compuesto que no van al dominio de
 * `app` (ni a un subdominio suyo, ni a un host de `permitidos`): el `href` de
 * cualquier etiqueta que no sea `<link>` (`<a>`, `<area>`, VML) y el `action`
 * de un formulario. `mailto:`, `tel:` y las anclas no cuentan. Para las
 * pruebas de cada app: tiene que dar `[]`.
 */
export function enlacesFueraDelDominio(app: AppCorreo, html: string, opciones?: OpcionesEnlaces): string[] {
  const base = hostDeImagenes(app);
  const permitidos = opciones?.permitidos ?? [];
  const texto = String(html ?? '');
  const vistos: string[] = [];
  const patrones = [
    /<(?!link\b)[a-z][a-z0-9:]*\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    /<form\b[^>]*?\saction\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  ];
  for (const re of patrones) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(texto))) vistos.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/&amp;/g, '&').trim());
  }
  const fuera = vistos.filter((href) => {
    const host = hostDeEnlace(href);
    if (host === null) return false;
    if (!host) return true;
    if (esDelDominio(host, base)) return false;
    return !permitidos.some((p) => (typeof p === 'string' ? esDelDominio(host, p.toLowerCase()) : p.test(host)));
  });
  return [...new Set(fuera)];
}

// ─── Manejador HTTP del logo ───────────────────────────────────────────────

/** Lo mínimo de `http.IncomingMessage` / `ServerResponse` (Express incluido) que usa el manejador. */
export interface PeticionLogo { method?: string; path?: string; url?: string; originalUrl?: string }
export interface RespuestaLogo {
  statusCode: number;
  setHeader(nombre: string, valor: string | number): unknown;
  end(cuerpo?: unknown): unknown;
}

/** 30 días en el navegador, el proxy del cliente de correo y la CDN del Hosting. */
const CACHE_OK = 'public, max-age=2592000, s-maxage=2592000';
const CACHE_NO = 'public, max-age=300, s-maxage=300';

/** Tipo real por los primeros bytes (no por lo que diga Storage ni la extensión). */
export function tipoDeImagen(b: Uint8Array): string | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

function responder(res: RespuestaLogo, estado: number, cache: string, tipo: string, cuerpo: unknown, largo: number): void {
  res.statusCode = estado;
  res.setHeader('Content-Type', tipo);
  res.setHeader('Content-Length', largo);
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(cuerpo);
}

function noHay(res: RespuestaLogo, estado = 404, cache = CACHE_NO): void {
  responder(res, estado, cache, 'text/plain; charset=utf-8', '', 0);
}

/**
 * `GET /logo/{tenantId}/{fichero}` → el logo del centro, tal cual está en el
 * Storage de Identity. Solo lectura, sin credenciales (el objeto ya es
 * público), sin Firestore y sin nada más que la imagen:
 *   - solo GET/HEAD (405 lo demás);
 *   - `tenantId` y `fichero` validados contra su forma: no se puede pedir
 *     ningún otro objeto ni ningún otro host;
 *   - ≤ 2 MB y PNG/JPEG/GIF/WEBP por sus primeros bytes (un SVG o un HTML
 *     subido como «logo» no se sirve);
 *   - `Cache-Control` de 30 días (la CDN del Hosting lo cachea: una invocación
 *     por objeto y nodo, no por apertura); 404 cacheado 5 min; si Storage no
 *     responde, 502 sin caché.
 *
 * Uso: `onRequest({ region: 'europe-west1', cors: false }, manejarLogoCentro)`
 * + rewrite de Hosting `/logo/**`.
 */
export async function manejarLogoCentro(req: PeticionLogo, res: RespuestaLogo): Promise<void> {
  const metodo = String(req.method || 'GET').toUpperCase();
  if (metodo !== 'GET' && metodo !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return noHay(res, 405, 'no-store');
  }
  const ruta = String(req.path || req.originalUrl || req.url || '').split('?')[0];
  const m = /(?:^|\/)logo\/([^/]+)\/([^/]+)$/.exec(ruta);
  const p = m ? partesValidas(m[1], m[2]) : null;
  if (!p) return noHay(res);

  const objeto = encodeURIComponent(`${ALMACEN_LOGOS.carpeta}/${p.tenantId}/${p.fichero}`);
  const origen = `https://firebasestorage.googleapis.com/v0/b/${ALMACEN_LOGOS.bucket}/o/${objeto}?alt=media`;
  let bytes: Uint8Array;
  try {
    const ctrl = new AbortController();
    const reloj = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(origen, { signal: ctrl.signal, redirect: 'error' });
      if (r.status === 404 || r.status === 403 || r.status === 400) return noHay(res);
      if (!r.ok) return noHay(res, 502, 'no-store');
      const largo = Number(r.headers.get('content-length') || 0);
      if (largo > LOGO_MAX_BYTES) return noHay(res);
      bytes = new Uint8Array(await r.arrayBuffer());
    } finally {
      clearTimeout(reloj);
    }
  } catch {
    return noHay(res, 502, 'no-store');
  }
  if (!bytes.length || bytes.length > LOGO_MAX_BYTES) return noHay(res);
  const tipo = tipoDeImagen(bytes);
  if (!tipo) return noHay(res);
  const B = (globalThis as any).Buffer;
  responder(res, 200, CACHE_OK, tipo, metodo === 'HEAD' ? undefined : (B ? B.from(bytes) : bytes), bytes.length);
}
