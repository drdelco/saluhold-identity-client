"use strict";
// vinculacion.ts — qué significa vincular un paciente a una clínica.
//
// Subruta `/servidor`: esto corre en Cloud Functions con el Admin SDK, nunca en
// un navegador. No importa nada; recibe la base de datos ya construida, así que
// sirve igual a Identity (que escribe en la suya) y a las apps (que escriben en
// la de Identity con `IDENTITY_SA_WRITER`).
//
// Vincular no es añadir un id a un array. Son tres cosas a la vez:
//
//   1. `clinicaIds` gana la clínica Y las que heredan de ella, porque un grupo
//      comparte historia y ver al paciente en una sola de sus sedes es verlo a
//      medias.
//   2. El número de historia se REUTILIZA si el paciente ya tiene uno en
//      cualquier otra clínica, y solo se acuña si no tiene ninguno. El número es
//      universal por paciente: acuñar uno por clínica es como se llegó a tener
//      una misma persona con varios números.
//   3. `updatedAt` sube. Sin eso el paciente se cae del sync delta y desaparece
//      del buscador aunque el vínculo esté perfectamente escrito.
//
// Estaba implementado SEIS veces —dos en el conector de vinculación de SaluFile,
// una en su conector de Identity, una en su chatbot, una en SaluFirst y una en
// Identity— y ya habían divergido: la de Identity ponía el número a `null` y el
// chatbot no lo escribe.
//
// Lo que NO entra aquí, a propósito: compartir el historial clínico
// (`medical_events.sharedWithClinicIds`), el consentimiento firmado, el audit
// log y los avisos. Eso es de cada app. Y tampoco se comprueba el
// consentimiento: quien llama ya lo obtuvo por su vía —el clic del paciente en
// el email, la firma presencial, o la decisión de un superadmin— y guarda su
// propia evidencia.
Object.defineProperty(exports, "__esModule", { value: true });
exports.vincularPacienteEnIdentity = exports.clinicasDelGrupo = exports.acunarNumeroHistoria = void 0;
/** Número de historia nuevo: prefijo + marca de tiempo en base 36 + azar. */
function acunarNumeroHistoria(prefijo = 'ID') {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Array.from({ length: 6 }, () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
    return `${prefijo}-${ts}${rnd}`;
}
exports.acunarNumeroHistoria = acunarNumeroHistoria;
/** Clínicas que heredan de la principal, para que el paciente se vea en el grupo. */
async function clinicasDelGrupo(db, clinicaId, coleccionTenants = 'tenants') {
    try {
        const snap = await db.collection(coleccionTenants).doc(clinicaId).get();
        const heredados = snap.data()?.tenantsHeredados || [];
        return [clinicaId, ...heredados.filter((t) => t && t !== clinicaId)];
    }
    catch {
        // Sin grupo configurado el paciente se vincula solo a su clínica, que es el
        // comportamiento sano: mejor de menos que colgarlo de un grupo equivocado.
        return [clinicaId];
    }
}
exports.clinicasDelGrupo = clinicasDelGrupo;
/**
 * El vínculo. Idempotente: si el paciente ya está en la clínica no escribe nada.
 *
 * @param arrayUnion El `FieldValue.arrayUnion` del Admin SDK de quien llama. Se
 *   pasa en vez de importarlo para que este módulo no dependa de
 *   `firebase-admin`, que cada backend tiene en su propia versión.
 */
async function vincularPacienteEnIdentity(db, arrayUnion, pacienteId, clinicaId, opciones = {}) {
    const coleccion = opciones.coleccionPacientes || 'pacientes';
    const ref = db.collection(coleccion).doc(pacienteId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new Error('No es posible vincular: el paciente ya no existe.');
    }
    const datos = snap.data() || {};
    const clinicaIds = Array.isArray(datos.clinicaIds) ? datos.clinicaIds : [];
    const idsLocales = (datos.idsLocales || {});
    // El número que ya tenga en CUALQUIER clínica: es el mismo paciente.
    const existente = Object.values(idsLocales)
        .find((v) => typeof v === 'string' && v.trim() !== '');
    if (clinicaIds.includes(clinicaId)) {
        return { yaVinculado: true, idLocal: existente || '', clinicas: [clinicaId] };
    }
    const grupo = await clinicasDelGrupo(db, clinicaId, opciones.coleccionTenants);
    const idLocal = opciones.idLocalPreferido?.trim()
        || existente
        || acunarNumeroHistoria(opciones.prefijo);
    const parche = {
        clinicaIds: arrayUnion(...grupo),
        updatedAt: new Date(),
    };
    for (const c of grupo)
        parche[`idsLocales.${c}`] = idLocal;
    await ref.update(parche);
    return { yaVinculado: false, idLocal, clinicas: grupo };
}
exports.vincularPacienteEnIdentity = vincularPacienteEnIdentity;
//# sourceMappingURL=vinculacion.js.map