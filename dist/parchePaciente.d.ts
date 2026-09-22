/**
 * El PARCHE de una edición de paciente: solo lo que el usuario ha cambiado.
 *
 * POR QUÉ EXISTE
 * `actualizarPacienteCanonico` ya no tocaba lo que no se le mandaba, pero los
 * formularios le mandaban la ficha ENTERA. Si la lectura de la ficha fallaba al
 * abrir la edición —o venía de un índice que no traía algún campo—, el
 * formulario salía con huecos y al guardar los mandaba vacíos: la dirección, la
 * nacionalidad, el prefijo… se borraban en Identity sin que nadie lo pidiera.
 *
 * LA REGLA: se compara lo que se LEYÓ con lo que hay en el formulario, campo a
 * campo, y solo viaja lo distinto. Lo que el usuario ha VACIADO viaja como
 * vacío y además en `borrar`, que es lo único que el servidor acepta como
 * permiso para dejar un dato en blanco. Sin ficha leída no hay con qué
 * comparar: la pantalla no debe dejar guardar.
 *
 * No depende de React ni de Mantine: lo usan las PWA, la app nativa y el portal
 * de Identity con el mismo resultado.
 */
export interface DireccionEditable {
    calle?: string | null;
    codigoPostal?: string | null;
    poblacion?: string | null;
    provincia?: string | null;
    pais?: string | null;
}
/**
 * Campos maestros editables de un paciente, en los nombres de Identity. Las
 * fechas, como 'YYYY-MM-DD' (usa `fechaISO` para convertir lo que venga).
 */
export interface FichaPacienteEditable {
    nif?: string | null;
    tipoIdentificador?: string | null;
    nombre?: string | null;
    apellidos?: string | null;
    alias?: string | null;
    sexo?: string | null;
    fechaNacimiento?: string | null;
    fechaDeceso?: string | null;
    nacionalidad?: string | null;
    idiomaInformes?: string | null;
    email?: string | null;
    telefono?: string | null;
    prefijoTelefono?: string | null;
    aseguradora?: string | null;
    numeroPoliza?: string | null;
    direccion?: DireccionEditable | null;
}
export interface ParchePaciente {
    /** Lo que se manda a `actualizarPacienteCanonico` (sin `pacienteId`). */
    parche: Record<string, unknown>;
    /** Campos que el usuario ha vaciado a propósito (`direccion.calle`…). */
    borrar: string[];
    /** Nombres de los campos que cambian (para logs y para «no hay cambios»). */
    cambios: string[];
}
/**
 * Cualquier forma de fecha que circula por la suite → 'YYYY-MM-DD' ('' si no
 * hay o no se entiende): Timestamp de Firestore, su versión serializada por una
 * callable (`{_seconds}` / `{seconds}`), Date, ISO o milisegundos.
 */
export declare function fechaISO(v: unknown): string;
/**
 * Compara la ficha LEÍDA con el formulario y devuelve solo lo cambiado.
 *
 * Un campo `undefined` en `editado` significa «este formulario no lo gestiona»
 * y no se compara ni se manda. `original` debe ser la ficha completa (la
 * lectura de detalle), no la fila de un índice.
 */
export declare function construirParchePaciente(original: FichaPacienteEditable, editado: FichaPacienteEditable): ParchePaciente;
/**
 * La ficha de Identity (tal como la devuelve cualquier lectura de detalle) en
 * la forma que compara `construirParchePaciente`. Solo copia las claves que
 * vienen: una clave ausente en la lectura queda `undefined`, no ''.
 */
export declare function fichaEditableDesdeIdentity(raw: Record<string, unknown> | null | undefined): FichaPacienteEditable;
//# sourceMappingURL=parchePaciente.d.ts.map