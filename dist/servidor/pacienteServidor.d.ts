/** Lo mínimo de Firestore: documentos y una transacción (el Admin SDK lo cumple). */
export interface FirestoreConTransaccion {
    collection(ruta: string): {
        doc(id: string): {
            get(): Promise<{
                exists: boolean;
                data(): Record<string, unknown> | undefined;
            }>;
            update(datos: Record<string, unknown>): Promise<unknown>;
        };
    };
    runTransaction<T>(fn: (tx: {
        get(ref: unknown): Promise<{
            exists: boolean;
            data(): Record<string, unknown> | undefined;
        }>;
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
export declare function desvincularPacienteEnIdentity(db: Pick<FirestoreConTransaccion, 'collection'>, campos: CamposDesvinculacion, pacienteId: string, clinicaId: string, coleccionPacientes?: string): Promise<{
    yaDesvinculado: boolean;
}>;
export type ResultadoNumeroHistoria = {
    asignado: true;
    numero: string;
} | {
    asignado: false;
    motivo: 'ya-tenia';
    numero: string;
} | {
    asignado: false;
    motivo: 'paciente-no-existe-en-identity';
};
/**
 * El número de historia del paciente en la clínica, si no lo tiene ya. En
 * transacción: dos eventos a la vez no acuñan dos números distintos.
 */
export declare function asegurarNumeroHistoriaEnIdentity(db: FirestoreConTransaccion, pacienteId: string, clinicaId: string, opciones?: {
    prefijo?: string;
    coleccionPacientes?: string;
}): Promise<ResultadoNumeroHistoria>;
//# sourceMappingURL=pacienteServidor.d.ts.map