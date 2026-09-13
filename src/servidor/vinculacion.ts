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

/**
 * Lo mínimo que se necesita de Firestore, declarado aquí para no depender de
 * `firebase-admin`: el paquete lo consumen también sitios sin Admin SDK, y una
 * dependencia de tipos que no hace falta es una dependencia que rompe.
 */
export interface FirestoreMinimo {
  collection(ruta: string): {
    doc(id: string): {
      get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
      update(datos: Record<string, unknown>): Promise<unknown>;
    };
  };
}

/** `FieldValue.arrayUnion` del Admin SDK de quien llama. */
export type ArrayUnion = (...valores: string[]) => unknown;

export interface ResultadoVinculacion {
  /** Ya estaba vinculado: no se ha escrito nada. */
  yaVinculado: boolean;
  /** Número de historia del paciente, reutilizado o recién acuñado. */
  idLocal: string;
  /** Clínicas a las que ha quedado vinculado: la pedida más sus heredadas. */
  clinicas: string[];
}

export interface OpcionesVinculacion {
  /**
   * Número de historia que impone quien llama. Solo para casos en que la app ya
   * lo tiene acuñado; si no, se reutiliza el del paciente o se acuña uno.
   */
  idLocalPreferido?: string;
  /**
   * Prefijo del número si hay que acuñarlo. El convenio es que refleje la app
   * de ORIGEN: SC- SaluFile, SF- SaluFirst, FA- SaluFact, ID- Identity.
   * Falsearlo es peor que admitir que no se sabe, así que por defecto va ID-.
   */
  prefijo?: string;
  /** Nombre de la colección de pacientes, por si algún día deja de ser este. */
  coleccionPacientes?: string;
  /** Nombre de la colección de clínicas. */
  coleccionTenants?: string;
}

/** Número de historia nuevo: prefijo + marca de tiempo en base 36 + azar. */
export function acunarNumeroHistoria(prefijo = 'ID'): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
  return `${prefijo}-${ts}${rnd}`;
}

/** Clínicas que heredan de la principal, para que el paciente se vea en el grupo. */
export async function clinicasDelGrupo(
  db: FirestoreMinimo,
  clinicaId: string,
  coleccionTenants = 'tenants',
): Promise<string[]> {
  try {
    const snap = await db.collection(coleccionTenants).doc(clinicaId).get();
    const heredados = (snap.data()?.tenantsHeredados as string[] | undefined) || [];
    return [clinicaId, ...heredados.filter((t) => t && t !== clinicaId)];
  } catch {
    // Sin grupo configurado el paciente se vincula solo a su clínica, que es el
    // comportamiento sano: mejor de menos que colgarlo de un grupo equivocado.
    return [clinicaId];
  }
}

/**
 * El vínculo. Idempotente: si el paciente ya está en la clínica no escribe nada.
 *
 * @param arrayUnion El `FieldValue.arrayUnion` del Admin SDK de quien llama. Se
 *   pasa en vez de importarlo para que este módulo no dependa de
 *   `firebase-admin`, que cada backend tiene en su propia versión.
 */
export async function vincularPacienteEnIdentity(
  db: FirestoreMinimo,
  arrayUnion: ArrayUnion,
  pacienteId: string,
  clinicaId: string,
  opciones: OpcionesVinculacion = {},
): Promise<ResultadoVinculacion> {
  const coleccion = opciones.coleccionPacientes || 'pacientes';
  const ref = db.collection(coleccion).doc(pacienteId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('No es posible vincular: el paciente ya no existe.');
  }

  const datos = snap.data() || {};
  const clinicaIds: string[] = Array.isArray(datos.clinicaIds) ? datos.clinicaIds as string[] : [];
  const idsLocales = (datos.idsLocales || {}) as Record<string, unknown>;

  // El número que ya tenga en CUALQUIER clínica: es el mismo paciente.
  const existente = Object.values(idsLocales)
    .find((v): v is string => typeof v === 'string' && v.trim() !== '');

  if (clinicaIds.includes(clinicaId)) {
    return { yaVinculado: true, idLocal: existente || '', clinicas: [clinicaId] };
  }

  const grupo = await clinicasDelGrupo(db, clinicaId, opciones.coleccionTenants);
  const idLocal = opciones.idLocalPreferido?.trim()
    || existente
    || acunarNumeroHistoria(opciones.prefijo);

  const parche: Record<string, unknown> = {
    clinicaIds: arrayUnion(...grupo),
    updatedAt: new Date(),
  };
  for (const c of grupo) parche[`idsLocales.${c}`] = idLocal;

  await ref.update(parche);

  return { yaVinculado: false, idLocal, clinicas: grupo };
}
