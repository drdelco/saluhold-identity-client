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

const CAMPOS_SIMPLES: (keyof FichaPacienteEditable)[] = [
  'nif', 'tipoIdentificador', 'nombre', 'apellidos', 'alias', 'sexo',
  'fechaNacimiento', 'fechaDeceso', 'nacionalidad', 'idiomaInformes',
  'email', 'telefono', 'prefijoTelefono', 'aseguradora', 'numeroPoliza',
];
const SUBCAMPOS: (keyof DireccionEditable)[] = ['calle', 'codigoPostal', 'poblacion', 'provincia', 'pais'];

/**
 * Cualquier forma de fecha que circula por la suite → 'YYYY-MM-DD' ('' si no
 * hay o no se entiende): Timestamp de Firestore, su versión serializada por una
 * callable (`{_seconds}` / `{seconds}`), Date, ISO o milisegundos.
 */
export function fechaISO(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  let d: Date | null = null;
  if (v instanceof Date) d = v;
  else if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
    d = new Date(v);
  } else if (typeof v === 'number') d = new Date(v);
  else if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.toDate === 'function') d = (o.toDate as () => Date)();
    else if (typeof o._seconds === 'number') d = new Date((o._seconds as number) * 1000);
    else if (typeof o.seconds === 'number') d = new Date((o.seconds as number) * 1000);
  }
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function norm(campo: string, v: unknown): string {
  if (v === null || v === undefined) return '';
  if (campo === 'fechaNacimiento' || campo === 'fechaDeceso') return fechaISO(v);
  const s = String(v).trim().replace(/\s+/g, ' ');
  if (campo === 'email') return s.toLowerCase();
  if (campo === 'nif' || campo === 'sexo' || campo === 'tipoIdentificador' || campo === 'apellidos') return s.toUpperCase();
  if (campo === 'idiomaInformes') return s.toLowerCase();
  return s;
}

/**
 * Compara la ficha LEÍDA con el formulario y devuelve solo lo cambiado.
 *
 * Un campo `undefined` en `editado` significa «este formulario no lo gestiona»
 * y no se compara ni se manda. `original` debe ser la ficha completa (la
 * lectura de detalle), no la fila de un índice.
 */
export function construirParchePaciente(
  original: FichaPacienteEditable,
  editado: FichaPacienteEditable
): ParchePaciente {
  const parche: Record<string, unknown> = {};
  const borrar: string[] = [];
  const cambios: string[] = [];

  for (const campo of CAMPOS_SIMPLES) {
    if (editado[campo] === undefined) continue;
    const antes = norm(campo, original[campo]);
    const ahora = norm(campo, editado[campo]);
    if (antes === ahora) continue;
    cambios.push(campo);
    if (!ahora) {
      parche[campo] = null;
      borrar.push(campo);
    } else {
      parche[campo] = campo === 'fechaNacimiento' || campo === 'fechaDeceso'
        ? ahora
        : String(editado[campo]).trim();
    }
  }

  if (editado.direccion !== undefined) {
    const antes = original.direccion || {};
    const ahora = editado.direccion || {};
    const dir: Record<string, string> = {};
    for (const sub of SUBCAMPOS) {
      if (editado.direccion !== null && ahora[sub] === undefined) continue;
      const a = norm(sub, antes[sub]);
      const b = norm(sub, ahora[sub]);
      if (a === b) continue;
      dir[sub] = b;
      cambios.push(`direccion.${sub}`);
      if (!b) borrar.push(`direccion.${sub}`);
    }
    if (Object.keys(dir).length) parche.direccion = dir;
  }

  if (borrar.length) parche.borrar = borrar;
  return { parche, borrar, cambios };
}

/**
 * La ficha de Identity (tal como la devuelve cualquier lectura de detalle) en
 * la forma que compara `construirParchePaciente`. Solo copia las claves que
 * vienen: una clave ausente en la lectura queda `undefined`, no ''.
 */
export function fichaEditableDesdeIdentity(raw: Record<string, unknown> | null | undefined): FichaPacienteEditable {
  const f: FichaPacienteEditable = {};
  if (!raw) return f;
  for (const campo of CAMPOS_SIMPLES) {
    if (!(campo in raw)) continue;
    const v = raw[campo];
    (f as Record<string, unknown>)[campo] = campo === 'fechaNacimiento' || campo === 'fechaDeceso'
      ? fechaISO(v)
      : (v === null || v === undefined ? '' : String(v));
  }
  if ('direccion' in raw) {
    const d = (raw.direccion || {}) as Record<string, unknown>;
    f.direccion = {};
    for (const sub of SUBCAMPOS) f.direccion[sub] = d[sub] == null ? '' : String(d[sub]);
  }
  return f;
}
