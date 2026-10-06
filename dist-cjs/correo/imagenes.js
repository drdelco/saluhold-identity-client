"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.manejarLogoCentro = exports.tipoDeImagen = exports.imagenesFueraDelDominio = exports.imagenDelDominio = exports.logoEnDominioDeLaApp = exports.partesDeLogo = exports.hostDeImagenes = exports.LOGO_MAX_BYTES = exports.APPS_CON_RUTA_DE_LOGO = exports.RUTA_LOGO = exports.ALMACEN_LOGOS = void 0;
const marcas_1 = require("./marcas");
/** Dónde guardan las tres apps (y el panel de Identity) el logo de un centro. */
exports.ALMACEN_LOGOS = {
    bucket: 'identity-44874.firebasestorage.app',
    carpeta: 'tenant_logos',
};
/** Ruta del Hosting de cada app que sirve el logo: `/logo/{tenantId}/{fichero}`. */
exports.RUTA_LOGO = '/logo';
/** Apps cuyo Hosting tiene el rewrite `/logo/**` → `manejarLogoCentro`. */
exports.APPS_CON_RUTA_DE_LOGO = ['saluFile', 'saluFirst', 'saluFact', 'factronia'];
/** Tope de tamaño (el de la regla de Storage de `tenant_logos`). */
exports.LOGO_MAX_BYTES = 2 * 1024 * 1024;
const RE_TENANT = /^[A-Za-z0-9]{6,40}$/;
const RE_FICHERO = /^logo_\d{6,17}\.(?:png|jpe?g|gif|webp)$/i;
/** Host (sin `www.`) desde el que tienen que servirse las imágenes de un correo de `app`. */
function hostDeImagenes(app) {
    return new URL(marcas_1.MARCAS[app].web).host.toLowerCase();
}
exports.hostDeImagenes = hostDeImagenes;
function urlHttps(valor) {
    const s = String(valor ?? '').trim();
    if (!/^https:\/\/[^\s"'<>]+$/i.test(s))
        return null;
    try {
        return new URL(s);
    }
    catch {
        return null;
    }
}
function partesValidas(tenantId, fichero) {
    return RE_TENANT.test(tenantId) && RE_FICHERO.test(fichero) ? { tenantId, fichero } : null;
}
/**
 * `{tenantId, fichero}` de la dirección de un logo de centro, venga como
 * dirección de Firebase Storage (`/v0/b/{bucket}/o/tenant_logos%2F…`), de
 * Cloud Storage (`storage.googleapis.com/{bucket}/tenant_logos/…`) o ya como
 * `/logo/{tenantId}/{fichero}` de una app. `null` si no es un logo del almacén.
 */
function partesDeLogo(valor) {
    const u = urlHttps(valor);
    if (!u)
        return null;
    const host = u.host.toLowerCase();
    let ruta;
    try {
        ruta = decodeURIComponent(u.pathname);
    }
    catch {
        return null;
    }
    let objeto = null;
    if (host === 'firebasestorage.googleapis.com') {
        const pre = `/v0/b/${exports.ALMACEN_LOGOS.bucket}/o/`;
        if (ruta.startsWith(pre))
            objeto = ruta.slice(pre.length);
    }
    else if (host === 'storage.googleapis.com') {
        const pre = `/${exports.ALMACEN_LOGOS.bucket}/`;
        if (ruta.startsWith(pre))
            objeto = ruta.slice(pre.length);
    }
    else if (exports.APPS_CON_RUTA_DE_LOGO.some((a) => hostDeImagenes(a) === host) && ruta.startsWith(`${exports.RUTA_LOGO}/`)) {
        objeto = `${exports.ALMACEN_LOGOS.carpeta}/${ruta.slice(exports.RUTA_LOGO.length + 1)}`;
    }
    if (!objeto)
        return null;
    const trozos = objeto.split('/');
    if (trozos.length !== 3 || trozos[0] !== exports.ALMACEN_LOGOS.carpeta)
        return null;
    return partesValidas(trozos[1], trozos[2]);
}
exports.partesDeLogo = partesDeLogo;
/**
 * La dirección del logo del centro en el dominio de `app`
 * (`https://salufile.com/logo/{tenantId}/logo_{ts}.png`), o `null` si el logo
 * no está en el almacén de la suite o la app no tiene la ruta: entonces el
 * correo sale sin imagen.
 */
function logoEnDominioDeLaApp(app, logoUrl) {
    if (!exports.APPS_CON_RUTA_DE_LOGO.includes(app))
        return null;
    const p = partesDeLogo(logoUrl);
    if (!p)
        return null;
    return `https://${hostDeImagenes(app)}${exports.RUTA_LOGO}/${p.tenantId}/${p.fichero}`;
}
exports.logoEnDominioDeLaApp = logoEnDominioDeLaApp;
/** Imagen del cuerpo: https EN EL DOMINIO DE LA APP, o `cid:` (adjunto en línea). */
function imagenDelDominio(app, valor) {
    const s = String(valor ?? '').trim();
    if (/^cid:[^\s"'<>]+$/i.test(s))
        return s;
    const u = urlHttps(s);
    return u && u.host.toLowerCase() === hostDeImagenes(app) ? s : null;
}
exports.imagenDelDominio = imagenDelDominio;
/**
 * Las imágenes de un correo ya compuesto que NO se sirven desde el dominio de
 * `app` (ni son `cid:`): `<img src>`, `background="…"` y `url(…)` de un fondo.
 * Para las pruebas de cada app: tiene que devolver `[]`.
 */
function imagenesFueraDelDominio(app, html) {
    const host = hostDeImagenes(app);
    const vistas = [];
    const texto = String(html ?? '');
    const patrones = [
        /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
        /\bbackground\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
        /background(?:-image)?\s*:[^;"}]*?url\(\s*(?:&quot;|["'])?([^)"']+?)(?:&quot;|["'])?\s*\)/gi,
    ];
    for (const re of patrones) {
        let m;
        while ((m = re.exec(texto)))
            vistas.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/&amp;/g, '&').trim());
    }
    return vistas.filter((src) => {
        if (/^cid:/i.test(src))
            return false;
        const u = urlHttps(src);
        return !(u && u.host.toLowerCase() === host);
    });
}
exports.imagenesFueraDelDominio = imagenesFueraDelDominio;
/** 30 días en el navegador, el proxy del cliente de correo y la CDN del Hosting. */
const CACHE_OK = 'public, max-age=2592000, s-maxage=2592000';
const CACHE_NO = 'public, max-age=300, s-maxage=300';
/** Tipo real por los primeros bytes (no por lo que diga Storage ni la extensión). */
function tipoDeImagen(b) {
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
        return 'image/png';
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
        return 'image/jpeg';
    if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
        return 'image/gif';
    if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
        && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
        return 'image/webp';
    return null;
}
exports.tipoDeImagen = tipoDeImagen;
function responder(res, estado, cache, tipo, cuerpo, largo) {
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
function noHay(res, estado = 404, cache = CACHE_NO) {
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
async function manejarLogoCentro(req, res) {
    const metodo = String(req.method || 'GET').toUpperCase();
    if (metodo !== 'GET' && metodo !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return noHay(res, 405, 'no-store');
    }
    const ruta = String(req.path || req.originalUrl || req.url || '').split('?')[0];
    const m = /(?:^|\/)logo\/([^/]+)\/([^/]+)$/.exec(ruta);
    const p = m ? partesValidas(m[1], m[2]) : null;
    if (!p)
        return noHay(res);
    const objeto = encodeURIComponent(`${exports.ALMACEN_LOGOS.carpeta}/${p.tenantId}/${p.fichero}`);
    const origen = `https://firebasestorage.googleapis.com/v0/b/${exports.ALMACEN_LOGOS.bucket}/o/${objeto}?alt=media`;
    let bytes;
    try {
        const ctrl = new AbortController();
        const reloj = setTimeout(() => ctrl.abort(), 8000);
        try {
            const r = await fetch(origen, { signal: ctrl.signal, redirect: 'error' });
            if (r.status === 404 || r.status === 403 || r.status === 400)
                return noHay(res);
            if (!r.ok)
                return noHay(res, 502, 'no-store');
            const largo = Number(r.headers.get('content-length') || 0);
            if (largo > exports.LOGO_MAX_BYTES)
                return noHay(res);
            bytes = new Uint8Array(await r.arrayBuffer());
        }
        finally {
            clearTimeout(reloj);
        }
    }
    catch {
        return noHay(res, 502, 'no-store');
    }
    if (!bytes.length || bytes.length > exports.LOGO_MAX_BYTES)
        return noHay(res);
    const tipo = tipoDeImagen(bytes);
    if (!tipo)
        return noHay(res);
    const B = globalThis.Buffer;
    responder(res, 200, CACHE_OK, tipo, metodo === 'HEAD' ? undefined : (B ? B.from(bytes) : bytes), bytes.length);
}
exports.manejarLogoCentro = manejarLogoCentro;
//# sourceMappingURL=imagenes.js.map