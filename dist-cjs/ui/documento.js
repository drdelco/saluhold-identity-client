"use strict";
// documento.ts — lector de documentos de identidad (vive en Identity).
//
// La foto NO se almacena en ningún punto: se envía, se extraen los campos y se
// descarta. Eso se cumple en el backend; aquí, además, no se guarda copia local.
Object.defineProperty(exports, "__esModule", { value: true });
exports.leerDocumentoIdentidad = exports.MENSAJE_FALLO = void 0;
const functions_1 = require("firebase/functions");
const config_1 = require("./config");
/** Mensajes para el usuario. Ninguno culpa al usuario ni menciona la IA. */
exports.MENSAJE_FALLO = {
    ilegible: 'No se lee bien el documento. Acerca la cámara, evita reflejos y vuelve a intentarlo.',
    no_es_documento: 'La imagen no parece un documento de identidad.',
    respuesta_incompleta: 'No se ha podido completar la lectura. Inténtalo de nuevo.',
    bloqueado_por_seguridad: 'No se ha podido procesar esta imagen. Prueba con otra foto.',
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