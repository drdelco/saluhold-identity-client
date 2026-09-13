import type { FirestoreMinimo } from './vinculacion';
export interface DatosLiberacion {
    /** Quién lo libera, para que conste en la disputa. */
    liberadoPor: string;
    /** Clínica que reporta el error. */
    clinicaOrigen: string;
    /** Por qué. Si no se da, se pone el motivo habitual. */
    motivo?: string;
    /** Nombre legible de quien reporta, si la app lo tiene a mano. */
    liberadoPorNombre?: string;
}
export interface ResultadoLiberacion {
    /** El NIF soltado, para poder crear ya la ficha correcta. */
    nifLiberado: string;
    /** Clínicas dueñas de la ficha: a ellas hay que avisar, y lo hace quien llama. */
    clinicasPropietarias: string[];
    /** Iniciales del titular, para el aviso. Nunca el nombre entero. */
    nombreEnmascarado: string;
}
/**
 * Suelta el NIF. Lanza `Error` con un mensaje presentable si no procede.
 *
 * Quien llama decide cómo convertir ese error en su propio tipo: aquí no se
 * depende de `firebase-functions` porque esto lo usan también las apps.
 */
export declare function liberarNifEnIdentity(db: FirestoreMinimo, pacienteId: string, datos: DatosLiberacion, coleccionPacientes?: string): Promise<ResultadoLiberacion>;
//# sourceMappingURL=liberarNif.d.ts.map