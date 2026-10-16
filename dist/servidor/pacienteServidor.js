// pacienteServidor.ts — dos reglas más del paciente en Identity (0.14.0), como
// la de vincular (`vinculacion.ts`): las ejecuta el servidor de cada app sobre
// la base de datos de Identity, y por eso son UNA y no una por app.
//
//   - Desvincular un paciente de una clínica: SaluFile lo hacía a mano al
//     borrar un paciente (`softDeletePatient`) y sin `updatedAt`, así que el
//     paciente seguía en el buscador de las copias por delta.
//   - Asegurar su número de historia en la clínica: SaluFile lo acuñaba a mano
//     al crear el primer evento clínico (y en la auditoría de integridad). El
//     número es UNIVERSAL por paciente: si ya tiene uno en otra clínica, se
//     reutiliza; solo se acuña (`acunarNumeroHistoria`) si no tiene ninguno.
import { acunarNumeroHistoria } from './vinculacion';
/**
 * Quita la clínica de `clinicaIds` y su número de `idsLocales`, con
 * `updatedAt`. Solo esa clínica (no el grupo): desvincular una sede no saca al
 * paciente de las demás. Idempotente.
 */
export async function desvincularPacienteEnIdentity(db, campos, pacienteId, clinicaId, coleccionPacientes = 'pacientes') {
    const ref = db.collection(coleccionPacientes).doc(pacienteId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error('No es posible desvincular: el paciente ya no existe.');
    const datos = snap.data() || {};
    const clinicaIds = Array.isArray(datos.clinicaIds) ? datos.clinicaIds : [];
    const idsLocales = (datos.idsLocales && typeof datos.idsLocales === 'object' ? datos.idsLocales : {});
    if (!clinicaIds.includes(clinicaId) && !(clinicaId in idsLocales))
        return { yaDesvinculado: true };
    await ref.update({
        clinicaIds: campos.arrayRemove(clinicaId),
        [`idsLocales.${clinicaId}`]: campos.borrar(),
        updatedAt: new Date(),
    });
    return { yaDesvinculado: false };
}
/**
 * El número de historia del paciente en la clínica, si no lo tiene ya. En
 * transacción: dos eventos a la vez no acuñan dos números distintos.
 */
export async function asegurarNumeroHistoriaEnIdentity(db, pacienteId, clinicaId, opciones = {}) {
    const ref = db.collection(opciones.coleccionPacientes || 'pacientes').doc(pacienteId);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            return { asignado: false, motivo: 'paciente-no-existe-en-identity' };
        const ids = ((snap.data() || {}).idsLocales || {});
        const actual = ids[clinicaId];
        if (typeof actual === 'string' && actual.trim())
            return { asignado: false, motivo: 'ya-tenia', numero: actual };
        const existente = Object.values(ids).find((v) => typeof v === 'string' && v.trim() !== '');
        const numero = existente || acunarNumeroHistoria(opciones.prefijo);
        // `updatedAt` es obligatorio: el índice de pacientes y el acelerador
        // sincronizan por delta sobre él; sin él el número no se vería.
        tx.update(ref, { [`idsLocales.${clinicaId}`]: numero, updatedAt: new Date() });
        return { asignado: true, numero };
    });
}
//# sourceMappingURL=pacienteServidor.js.map