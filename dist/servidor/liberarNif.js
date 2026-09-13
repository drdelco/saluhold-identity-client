// liberarNif.ts — soltar un NIF mal asignado a la ficha de otra persona.
//
// El caso real: un profesional tiene delante al paciente y su documento físico,
// busca por ese número y le sale la ficha de OTRA persona. Alguien, en otra
// clínica, lo tecleó mal sobre un tercero. Hasta que ese número se libere no se
// puede crear la ficha correcta: el identificador es único por definición.
//
// Vive aquí, como la vinculación, porque el NIF es dato maestro: la regla debe
// ser una sola aunque la invoquen apps distintas. Estaba escrita solo en
// SaluFile, y el día que otra app la necesitara habría una segunda copia — que
// es exactamente como se llegó a tener seis implementaciones de "vincular un
// paciente", una de ellas rota.
//
// Lo que NO hace, a propósito: avisar a la clínica propietaria, mandar el push
// y registrar el acceso. Eso es de cada app, que tiene sus canales y sus
// destinatarios. Aquí se suelta el dato y se devuelve A QUIÉN hay que avisar.
//
// Es REVERSIBLE: no se borra nada. El NIF queda vacío, la ficha marcada como
// pendiente de corrección y la disputa guardada con quién y por qué. El
// historial clínico no se toca.
/** Motivo por defecto, en el lenguaje en que lo leerá la clínica avisada. */
const MOTIVO_POR_DEFECTO = 'El documento no corresponde al paciente presente (verificación del documento físico).';
/**
 * Suelta el NIF. Lanza `Error` con un mensaje presentable si no procede.
 *
 * Quien llama decide cómo convertir ese error en su propio tipo: aquí no se
 * depende de `firebase-functions` porque esto lo usan también las apps.
 */
export async function liberarNifEnIdentity(db, pacienteId, datos, coleccionPacientes = 'pacientes') {
    const ref = db.collection(coleccionPacientes).doc(pacienteId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error('La ficha ya no existe.');
    const d = snap.data() || {};
    const nifLiberado = String(d.nif || '').trim();
    const clinicasPropietarias = Array.isArray(d.clinicaIds) ? d.clinicaIds : [];
    // Esto es para corregir el error de OTRO. Si la ficha ya es tuya, lo correcto
    // es editarla: soltar tu propio identificador deja la ficha sin NIF y sin
    // nadie que se dé por aludido.
    if (clinicasPropietarias.includes(datos.clinicaOrigen)) {
        throw new Error('Esta ficha ya pertenece a tu clínica. Corrige el documento editándola, no liberándolo.');
    }
    if (!nifLiberado) {
        throw new Error('Esta ficha no tiene documento que liberar.');
    }
    await ref.update({
        nif: '',
        requiereCorreccionNif: true,
        nifDisputa: {
            nifLiberado,
            motivo: (datos.motivo || '').trim() || MOTIVO_POR_DEFECTO,
            liberadoPor: datos.liberadoPor,
            ...(datos.liberadoPorNombre ? { liberadoPorNombre: datos.liberadoPorNombre } : {}),
            clinicaOrigen: datos.clinicaOrigen,
            fecha: new Date(),
        },
        // Sin esto el paciente se cae del sync delta y desaparece del buscador, que
        // es lo último que quieres en una ficha que acabas de marcar como pendiente
        // de corregir.
        updatedAt: new Date(),
    });
    return {
        nifLiberado,
        clinicasPropietarias,
        nombreEnmascarado: `${String(d.nombre || '?').charAt(0)}. ${String(d.apellidos || '?').charAt(0)}.`,
    };
}
//# sourceMappingURL=liberarNif.js.map