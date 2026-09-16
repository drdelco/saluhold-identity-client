"use strict";
// config.ts — lo que el escáner de documentos necesita de la app que lo monta.
//
// POR QUÉ INYECCIÓN Y NO IMPORTS
// El escáner vivía dentro de SaluFile y tiraba de sus módulos: su instancia de
// Firebase, su `CLINIC_ID`, su búsqueda global. Copiarlo a SaluFirst y SaluFact
// habría significado tres copias divergiendo, que es exactamente el problema
// que llevamos toda la semana deshaciendo. Aquí el componente no importa nada
// de ninguna app: la app le entrega lo que necesita, una sola vez, al arrancar.
//
// Todo lo que se pide son FUNCIONES, no valores: la instancia de Identity y la
// clínica activa no existen hasta después del login, y este módulo se configura
// al cargar la aplicación.
Object.defineProperty(exports, "__esModule", { value: true });
exports.mensajeDeError = exports.config = exports.hayTraspasoQr = exports.escanerConfigurado = exports.configurarEscanerDocumentos = void 0;
const textos_1 = require("./textos");
let _config = null;
/** Se llama una vez, al arrancar la app. */
function configurarEscanerDocumentos(config) {
    _config = config;
}
exports.configurarEscanerDocumentos = configurarEscanerDocumentos;
function escanerConfigurado() {
    return _config !== null;
}
exports.escanerConfigurado = escanerConfigurado;
function hayTraspasoQr() {
    return !!_config?.qr;
}
exports.hayTraspasoQr = hayTraspasoQr;
function config() {
    if (!_config) {
        throw new Error((0, textos_1.textosUI)().errorEscanerNoConfigurado);
    }
    return _config;
}
exports.config = config;
/**
 * Mensaje de error presentable.
 *
 * Las callables devuelven el motivo en `message`; lo que no sirve es enseñar un
 * "internal" pelado o un stack. Si no hay nada legible, se usa el respaldo que
 * da el llamante, que sabe qué estaba intentando el usuario.
 */
function mensajeDeError(e, respaldo) {
    const msg = e?.message;
    if (!msg)
        return respaldo;
    if (/^internal$/i.test(msg) || /^unknown$/i.test(msg))
        return respaldo;
    return msg;
}
exports.mensajeDeError = mensajeDeError;
//# sourceMappingURL=config.js.map