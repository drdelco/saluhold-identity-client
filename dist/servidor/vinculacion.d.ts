/**
 * Lo mínimo que se necesita de Firestore, declarado aquí para no depender de
 * `firebase-admin`: el paquete lo consumen también sitios sin Admin SDK, y una
 * dependencia de tipos que no hace falta es una dependencia que rompe.
 */
export interface FirestoreMinimo {
    collection(ruta: string): {
        doc(id: string): {
            get(): Promise<{
                exists: boolean;
                data(): Record<string, unknown> | undefined;
            }>;
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
export declare function acunarNumeroHistoria(prefijo?: string): string;
/** Clínicas que heredan de la principal, para que el paciente se vea en el grupo. */
export declare function clinicasDelGrupo(db: FirestoreMinimo, clinicaId: string, coleccionTenants?: string): Promise<string[]>;
/**
 * El vínculo. Idempotente: si el paciente ya está en la clínica no escribe nada.
 *
 * @param arrayUnion El `FieldValue.arrayUnion` del Admin SDK de quien llama. Se
 *   pasa en vez de importarlo para que este módulo no dependa de
 *   `firebase-admin`, que cada backend tiene en su propia versión.
 */
export declare function vincularPacienteEnIdentity(db: FirestoreMinimo, arrayUnion: ArrayUnion, pacienteId: string, clinicaId: string, opciones?: OpcionesVinculacion): Promise<ResultadoVinculacion>;
//# sourceMappingURL=vinculacion.d.ts.map