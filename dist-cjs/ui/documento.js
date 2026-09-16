"use strict";
// documento.ts — lector de documentos de identidad (vive en Identity).
//
// La foto NO se almacena en ningún punto: se envía, se extraen los campos y se
// descarta. Eso se cumple en el backend; aquí, además, no se guarda copia local.
Object.defineProperty(exports, "__esModule", { value: true });
exports.leerDocumentoIdentidad = exports.MENSAJE_FALLO = void 0;
const functions_1 = require("firebase/functions");
const config_1 = require("./config");
const textos_1 = require("./textos");
/**
 * Mensajes para el usuario. Ninguno culpa al usuario ni menciona la IA.
 *
 * Son propiedades calculadas y no cadenas fijas para que el idioma se resuelva
 * al LEER el mensaje y no al importar el módulo: si no, quedaría congelado el
 * idioma que hubiera al arrancar la app.
 */
exports.MENSAJE_FALLO = {
    get ilegible() { return (0, textos_1.textosUI)().lecturaIlegible; },
    get no_es_documento() { return (0, textos_1.textosUI)().lecturaNoEsDocumento; },
    get respuesta_incompleta() { return (0, textos_1.textosUI)().lecturaIncompleta; },
    get bloqueado_por_seguridad() { return (0, textos_1.textosUI)().lecturaBloqueada; },
};
/**
 * Lee un documento de identidad y devuelve los campos para prerrellenar.
 * Anverso y reverso van en la MISMA llamada: la dirección solo está en el
 * reverso y el modelo necesita ver las dos caras juntas para reconciliarlas.
 */
async function leerDocumentoIdentidad(caras) {
    const c = (0, config_1.config)();
    if (c.initIdentity)
        await c.initIdentity();
    // Se manda la clínica activa: quien trabaja en varias no se puede resolver
    // solo con el uid, e Identity la valida contra las suyas antes de usarla.
    const fn = (0, functions_1.httpsCallable)(c.identityFunctions(), 'leerDocumentoIdentidad');
    const res = await fn({ imagenes: caras, app: c.app, clinicaId: c.clinicaId() || undefined });
    return res.data;
}
exports.leerDocumentoIdentidad = leerDocumentoIdentidad;
//# sourceMappingURL=documento.js.map