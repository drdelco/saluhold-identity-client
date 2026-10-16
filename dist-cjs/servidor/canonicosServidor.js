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
exports.accesoAppDesdeServidor = exports.actualizarTenantDesdeServidor = exports.crearTenantDesdeServidor = exports.actualizarEmpresaDesdeServidor = exports.vincularEmpresaDesdeServidor = void 0;
const altaServidor_1 = require("./altaServidor");
const BASE = 'https://europe-west1-identity-44874.cloudfunctions.net';
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
        throw new Error(String(respuesta.error || `Identity respondió ${r.status} al ${que}.`));
    }
    return respuesta;
}
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
 * Concede o retira `appsActivas.<appId>`. Respeta la regla de las cuentas de
 * asesoría (no conviven con las apps de producto en la misma cuenta).
 */
function accesoAppDesdeServidor(app, peticion) {
    return llamar('accesoAppServidor', { app, ...peticion }, 'cambiar el acceso a la app');
}
exports.accesoAppDesdeServidor = accesoAppDesdeServidor;
//# sourceMappingURL=canonicosServidor.js.map