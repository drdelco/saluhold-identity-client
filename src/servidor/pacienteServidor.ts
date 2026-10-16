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

/** Lo mínimo de Firestore: documentos y una transacción (el Admin SDK lo cumple). */
export interface FirestoreConTransaccion {
  collection(ruta: string): {
    doc(id: string): {
      get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
      update(datos: Record<string, unknown>): Promise<unknown>;
    };
  };
  runTransaction<T>(fn: (tx: {
    get(ref: unknown): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
    update(ref: unknown, datos: Record<string, unknown>): unknown;
  }) => Promise<T>): Promise<T>;
}

/** Los centinelas de `FieldValue` del Admin SDK de quien llama. */
export interface CamposDesvinculacion {
  arrayRemove: (...valores: string[]) => unknown;
  borrar: () => unknown;
}

/**
 * Quita la clínica de `clinicaIds` y su número de `idsLocales`, con
 * `updatedAt`. Solo esa clínica (no el grupo): desvincular una sede no saca al
 * paciente de las demás. Idempotente.
 */
export async function desvincularPacienteEnIdentity(
  db: Pick<FirestoreConTransaccion, 'collection'>,
  campos: CamposDesvinculacion,
  pacienteId: string,
  clinicaId: string,
  coleccionPacientes = 'pacientes',
): Promise<{ yaDesvinculado: boolean }> {
  const ref = db.collection(coleccionPacientes).doc(pacienteId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('No es posible desvincular: el paciente ya no existe.');
  const datos = snap.data() || {};
  const clinicaIds = Array.isArray(datos.clinicaIds) ? datos.clinicaIds as string[] : [];
  const idsLocales = (datos.idsLocales && typeof datos.idsLocales === 'object' ? datos.idsLocales : {}) as Record<string, unknown>;
  if (!clinicaIds.includes(clinicaId) && !(clinicaId in idsLocales)) return { yaDesvinculado: true };
  await ref.update({
    clinicaIds: campos.arrayRemove(clinicaId),
    [`idsLocales.${clinicaId}`]: campos.borrar(),
    updatedAt: new Date(),
  });
  return { yaDesvinculado: false };
}

export type ResultadoNumeroHistoria =
  | { asignado: true; numero: string }
  | { asignado: false; motivo: 'ya-tenia'; numero: string }
  | { asignado: false; motivo: 'paciente-no-existe-en-identity' };

/**
 * El número de historia del paciente en la clínica, si no lo tiene ya. En
 * transacción: dos eventos a la vez no acuñan dos números distintos.
 */
export async function asegurarNumeroHistoriaEnIdentity(
  db: FirestoreConTransaccion,
  pacienteId: string,
  clinicaId: string,
  opciones: { prefijo?: string; coleccionPacientes?: string } = {},
): Promise<ResultadoNumeroHistoria> {
  const ref = db.collection(opciones.coleccionPacientes || 'pacientes').doc(pacienteId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { asignado: false, motivo: 'paciente-no-existe-en-identity' } as const;
    const ids = ((snap.data() || {}).idsLocales || {}) as Record<string, unknown>;
    const actual = ids[clinicaId];
    if (typeof actual === 'string' && actual.trim()) return { asignado: false, motivo: 'ya-tenia', numero: actual } as const;
    const existente = Object.values(ids).find((v): v is string => typeof v === 'string' && v.trim() !== '');
    const numero = existente || acunarNumeroHistoria(opciones.prefijo);
    // `updatedAt` es obligatorio: el índice de pacientes y el acelerador
    // sincronizan por delta sobre él; sin él el número no se vería.
    tx.update(ref, { [`idsLocales.${clinicaId}`]: numero, updatedAt: new Date() });
    return { asignado: true, numero } as const;
  });
}
