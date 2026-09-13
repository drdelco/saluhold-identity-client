// documento.ts — lector de documentos de identidad (vive en Identity).
//
// La foto NO se almacena en ningún punto: se envía, se extraen los campos y se
// descarta. Eso se cumple en el backend; aquí, además, no se guarda copia local.
import { httpsCallable } from 'firebase/functions';
import { config } from './config';
/** Mensajes para el usuario. Ninguno culpa al usuario ni menciona la IA. */
export const MENSAJE_FALLO = {
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
export async function leerDocumentoIdentidad(caras) {
    const c = config();
    if (c.initIdentity)
        await c.initIdentity();
    // Se manda la clínica activa: quien trabaja en varias no se puede resolver
    // solo con el uid, e Identity la valida contra las suyas antes de usarla.
    const fn = httpsCallable(c.identityFunctions(), 'leerDocumentoIdentidad');
    const res = await fn({ imagenes: caras, app: c.app, clinicaId: c.clinicaId() || undefined });
    return res.data;
}
//# sourceMappingURL=documento.js.map