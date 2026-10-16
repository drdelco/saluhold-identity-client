"use strict";
// canonicosServidor.ts — clientes de los endpoints de SERVIDOR de Identity (0.12.0).
//
// «Todo canónico» (Diego, 16-10-2026): lo que un backend de la suite escribe
// en Identity va por Identity, no a mano con la cuenta de servicio. Estos son
// los caminos que no tienen sesión de usuario detrás (o en los que quien decide
// es la app: el rol de administrador de una empresa vive en la app, no en
// Identity). Hoy los usa SaluFact (y Factronia, que es la misma app):
//
//   - vincular una empresa a su clínica y actualizarla (las comisiones de
//     SaluFirst completan la dirección del cobrador desde un cron);
//   - crear y actualizar el tenant de una empresa de sus apps (alta del
//     superadmin, datos y logo, límite de usuarios del plan, apps, supresión);
//   - conceder o retirar el acceso a SUS apps (`saluFact`, `factronia`,
//     `asesoria`): el acceso de un asesor lo concede el administrador de la
//     empresa, no el superadmin.
//
// Misma puerta que las altas de servidor: las funciones de Identity no son
// públicas y solo admiten un ID token de Google de la cuenta de servicio de la
// app, sacado del servidor de metadatos (sin claves). Identity comprueba además
// qué puede hacer cada cuenta. Fuera de Google Cloud la llamada falla, a
// propósito.
Object.defineProperty(exports, "__esModule", { value: true });
exports.accesoAppDesdeServidor = exports.subirLogoDeTenantDesdeServidor = exports.actualizarTenantDesdeServidor = exports.crearTenantDesdeServidor = exports.actualizarEmpresaDesdeServidor = exports.vincularEmpresaDesdeServidor = exports.llamar = exports.ErrorDeIdentity = exports.codigoDeEstadoIdentity = void 0;
const altaServidor_1 = require("./altaServidor");
const BASE = 'https://europe-west1-identity-44874.cloudfunctions.net';
/** Código (el de un HttpsError) que corresponde a un estado HTTP de Identity. */
function codigoDeEstadoIdentity(status) {
    switch (status) {
        case 400: return 'invalid-argument';
        case 401: return 'unauthenticated';
        case 403: return 'permission-denied';
        case 404: return 'not-found';
        case 409: return 'already-exists';
        case 412: return 'failed-precondition';
        case 429: return 'resource-exhausted';
        case 503: return 'unavailable';
        default: return 'internal';
    }
}
exports.codigoDeEstadoIdentity = codigoDeEstadoIdentity;
/**
 * Un rechazo de Identity (0.14.0). Es un `Error` con el mensaje de Identity
 * (para el usuario), y además el estado, el código y los detalles: una app
 * necesita saber, por ejemplo, que un alta es un 409 y de qué ficha.
 */
class ErrorDeIdentity extends Error {
    constructor(mensaje, status, codigo, detalles) {
        super(mensaje);
        this.name = 'ErrorDeIdentity';
        this.status = status;
        this.codigo = codigo || codigoDeEstadoIdentity(status);
        this.detalles = detalles;
    }
}
exports.ErrorDeIdentity = ErrorDeIdentity;
/** POST a un endpoint de servidor de Identity con el ID token de la cuenta (lo usan también los de 0.14.0). */
async function llamar(endpoint, cuerpo, que) {
    const url = `${BASE}/${endpoint}`;
    const token = await (0, altaServidor_1.idTokenDelServidor)(url);
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(cuerpo),
    });
    const respuesta = await r.json().catch(() => ({}));
    if (!r.ok) {
        const detalles = respuesta.detalles && typeof respuesta.detalles === 'object'
            ? respuesta.detalles : null;
        throw new ErrorDeIdentity(String(respuesta.error || `Identity respondió ${r.status} al ${que}.`), r.status, typeof respuesta.codigo === 'string' ? respuesta.codigo : null, detalles);
    }
    return respuesta;
}
exports.llamar = llamar;
/** Vincula una empresa a la clínica (y sus heredadas). Idempotente. */
function vincularEmpresaDesdeServidor(app, clinicaId, empresaId) {
    return llamar('vincularEmpresaServidor', { app, clinicaId, empresaId }, 'vincular la empresa');
}
exports.vincularEmpresaDesdeServidor = vincularEmpresaDesdeServidor;
/** Actualiza una empresa de la clínica. Identity comprueba que sea de esa clínica. */
function actualizarEmpresaDesdeServidor(app, clinicaId, empresaId, datos) {
    return llamar('actualizarEmpresaServidor', { app, clinicaId, empresaId, datos }, 'actualizar la empresa');
}
exports.actualizarEmpresaDesdeServidor = actualizarEmpresaDesdeServidor;
/** Alta de un tenant con origen en la app. `tenantId` opcional (si la app ya tiene el suyo). */
function crearTenantDesdeServidor(app, datos, opciones = {}) {
    return llamar('crearTenantServidor', {
        app, tenantId: opciones.tenantId ?? null, actuaPor: opciones.actuaPor ?? null, datos,
    }, 'crear el tenant');
}
exports.crearTenantDesdeServidor = crearTenantDesdeServidor;
/** Actualiza el tenant (parche: lo que no se manda no se toca). */
function actualizarTenantDesdeServidor(app, tenantId, datos, opciones = {}) {
    return llamar('actualizarTenantServidor', {
        app, tenantId, actuaPor: opciones.actuaPor ?? null, datos,
    }, 'actualizar el tenant');
}
exports.actualizarTenantDesdeServidor = actualizarTenantDesdeServidor;
/**
 * Sube (o quita, con `null`) el logo del tenant. Hasta 0.13.0 cada app escribía
 * el objeto en el Storage de Identity con su cuenta de servicio, a su manera
 * (con o sin token, siempre `.png` aunque no lo fuera). Identity comprueba ahora
 * el tipo por los bytes (PNG, JPEG o WEBP) y el tamaño (≤ 2 MB), guarda SIEMPRE
 * un objeto nuevo (los correos ya enviados apuntan al anterior), y escribe
 * `branding.logoUrl` + `updatedAt`.
 *
 * `actuaPor` es el id de Identity de quien lo cambia: la app comprueba antes
 * que administra esa empresa (el rol vive en la app); Identity, que su ficha
 * esté activa, sea de ese tenant y tenga esa app (o que sea superadmin).
 */
function subirLogoDeTenantDesdeServidor(app, tenantId, imagenBase64, opciones) {
    return llamar('subirLogoTenantServidor', {
        app, tenantId, imagenBase64, actuaPor: opciones.actuaPor,
    }, 'subir el logo');
}
exports.subirLogoDeTenantDesdeServidor = subirLogoDeTenantDesdeServidor;
/**
 * Concede o retira `appsActivas.<appId>`. Respeta la regla de las cuentas de
 * asesoría (no conviven con las apps de producto en la misma cuenta).
 */
function accesoAppDesdeServidor(app, peticion) {
    return llamar('accesoAppServidor', { app, ...peticion }, 'cambiar el acceso a la app');
}
exports.accesoAppDesdeServidor = accesoAppDesdeServidor;
//# sourceMappingURL=canonicosServidor.js.map