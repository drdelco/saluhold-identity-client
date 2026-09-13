import { type LecturaOk, type DatosDocumento } from './documento';
import { type PacienteCoincidente } from './config';
export type DecisionEscaneo = 
/** El NIF ya existe: hay que vincular o abrir la ficha, no crear otra. */
'found'
/** NIF legible y sin coincidencias: se puede crear con lo prerrellenado. */
 | 'create'
/** No se pudo leer el NIF: el operador lo teclea y busca. NUNCA se salta a crear. */
 | 'sin-nif';
export interface ResultadoEscaneo {
    decision: DecisionEscaneo;
    borrador: DatosDocumento;
    revisar: string[];
    avisos: string[];
    documento: LecturaOk['documento'];
    conAcceso: PacienteCoincidente[];
    sinAcceso: PacienteCoincidente[];
}
export type ProgresoEscaneo = 'comprimiendo' | 'leyendo' | 'buscando';
/**
 * Vuelca el borrador sobre el formulario sin romper el tipo.
 *
 * El formulario de alta exige los cinco campos de la dirección, pero el
 * documento rara vez los trae todos (y sin reverso no trae ninguno). Aquí se
 * completa lo que falte con lo que ya hubiera en el formulario, o con cadena
 * vacía. Vive junto al hook para que todas las pantallas de alta hagan la
 * mezcla igual: es exactamente el tipo de detalle que se copia mal al tercer
 * sitio.
 */
export declare function aplicarBorrador<T extends {
    direccion?: Record<string, string> | undefined;
}>(actual: T, borrador: DatosDocumento): T;
export declare function useScanIdDocument(): {
    escanear: (ficheros: File[]) => Promise<ResultadoEscaneo | null>;
    leer: (ficheros: File[]) => Promise<LecturaOk | null>;
    procesarLectura: (lectura: LecturaOk) => Promise<ResultadoEscaneo | null>;
    escaneando: boolean;
    progreso: ProgresoEscaneo | null;
    error: string | null;
    limpiar: () => void;
    cancelar: () => void;
};
//# sourceMappingURL=useScanIdDocument.d.ts.map