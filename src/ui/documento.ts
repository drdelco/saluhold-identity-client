// documento.ts — lector de documentos de identidad (vive en Identity).
//
// La foto NO se almacena en ningún punto: se envía, se extraen los campos y se
// descarta. Eso se cumple en el backend; aquí, además, no se guarda copia local.

import { httpsCallable } from 'firebase/functions';
import { config } from './config';
import { textosUI } from './textos';

export interface CaraDocumento {
  data: string;                                   // base64 sin prefijo
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  cara: 'anverso' | 'reverso';
}

export type MotivoFalloLectura =
  | 'ilegible'
  | 'no_es_documento'
  | 'respuesta_incompleta'
  | 'bloqueado_por_seguridad';

export interface DireccionDocumento {
  calle?: string;
  codigoPostal?: string;
  poblacion?: string;
  provincia?: string;
  pais?: string;
}

/**
 * Lo que el documento aporta. La dirección va parcial a propósito: en el alta
 * los cinco campos son obligatorios, pero un documento sin reverso no trae
 * ninguno y un pasaporte no trae domicilio en absoluto. Forzar el tipo completo
 * obligaría a inventar cadenas vacías aquí, que es justo donde no toca.
 */
export interface DatosDocumento {
  nif?: string;
  nombre?: string;
  apellidos?: string;
  fechaNacimiento?: string;
  sexo?: string;
  nacionalidad?: string;
  direccion?: DireccionDocumento;
  [k: string]: unknown;
}

export interface LecturaOk {
  ok: true;
  documento: {
    tipo: 'DNI' | 'NIE' | 'PASAPORTE' | 'OTRO' | null;
    paisEmisor: string | null;
    numeroSoporte: string | null;
    fechaCaducidad: string | null;
  };
  /** Subconjunto de los campos del alta que el documento sí contiene. */
  datos: DatosDocumento;
  confianza: {
    global: 'alta' | 'media' | 'baja';
    /** Claves de `datos` que conviene que el humano compruebe. */
    revisar: string[];
  };
  avisos: string[];
  modelo: string;
  ms: number;
}

export interface LecturaFallida {
  ok: false;
  motivo: MotivoFalloLectura;
  avisos: string[];
  modelo: string;
  ms: number;
}

export type ResultadoLectura = LecturaOk | LecturaFallida;

/**
 * Mensajes para el usuario. Ninguno culpa al usuario ni menciona la IA.
 *
 * Son propiedades calculadas y no cadenas fijas para que el idioma se resuelva
 * al LEER el mensaje y no al importar el módulo: si no, quedaría congelado el
 * idioma que hubiera al arrancar la app.
 */
export const MENSAJE_FALLO: Record<MotivoFalloLectura, string> = {
  get ilegible() { return textosUI().lecturaIlegible; },
  get no_es_documento() { return textosUI().lecturaNoEsDocumento; },
  get respuesta_incompleta() { return textosUI().lecturaIncompleta; },
  get bloqueado_por_seguridad() { return textosUI().lecturaBloqueada; },
};

/**
 * Lee un documento de identidad y devuelve los campos para prerrellenar.
 * Anverso y reverso van en la MISMA llamada: la dirección solo está en el
 * reverso y el modelo necesita ver las dos caras juntas para reconciliarlas.
 */
export async function leerDocumentoIdentidad(caras: CaraDocumento[]): Promise<ResultadoLectura> {
  const c = config();
  if (c.initIdentity) await c.initIdentity();

  // Se manda la clínica activa: quien trabaja en varias no se puede resolver
  // solo con el uid, e Identity la valida contra las suyas antes de usarla.
  const fn = httpsCallable<
    { imagenes: CaraDocumento[]; app: string; clinicaId?: string },
    ResultadoLectura
  >(c.identityFunctions(), 'leerDocumentoIdentidad');

  const res = await fn({ imagenes: caras, app: c.app, clinicaId: c.clinicaId() || undefined });
  return res.data;
}
