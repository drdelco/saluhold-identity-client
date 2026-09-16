// config.ts — lo que el escáner de documentos necesita de la app que lo monta.
//
// POR QUÉ INYECCIÓN Y NO IMPORTS
// El escáner vivía dentro de SaluFile y tiraba de sus módulos: su instancia de
// Firebase, su `CLINIC_ID`, su búsqueda global. Copiarlo a SaluFirst y SaluFact
// habría significado tres copias divergiendo, que es exactamente el problema
// que llevamos toda la semana deshaciendo. Aquí el componente no importa nada
// de ninguna app: la app le entrega lo que necesita, una sola vez, al arrancar.
//
// Todo lo que se pide son FUNCIONES, no valores: la instancia de Identity y la
// clínica activa no existen hasta después del login, y este módulo se configura
// al cargar la aplicación.

import type { Functions } from 'firebase/functions';
import type { Firestore } from 'firebase/firestore';
import { textosUI } from './textos';

/**
 * Un paciente que ya existe con ese documento.
 *
 * El tipo es deliberadamente abierto: el escáner no interpreta la ficha, la
 * recibe de la búsqueda de la app y la devuelve tal cual a la pantalla de alta,
 * que sí conoce su propio tipo. Cerrarlo aquí obligaría a las tres apps a
 * convertir en los dos sentidos para nada.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PacienteCoincidente = Record<string, any>;

export interface ResultadoBusquedaNif {
  conAcceso: PacienteCoincidente[];
  sinAcceso: PacienteCoincidente[];
}

export interface ConfigEscaner {
  /** Cloud Functions de IDENTITY: allí vive el lector (`leerDocumentoIdentidad`). */
  identityFunctions: () => Functions;
  /** Si la app abre Identity de forma perezosa, se llama antes de cada lectura. */
  initIdentity?: () => Promise<void>;
  /** Clínica activa; Identity la valida contra las del profesional. */
  clinicaId: () => string | null | undefined;
  /** Qué app está leyendo. Queda en la auditoría del lector. */
  app: string;
  /**
   * Búsqueda global por documento. Es la pieza que evita duplicados, así que la
   * pone la app: cada una llama a su propia capa (con su caché y sus permisos).
   */
  buscarPorNif: (nif: string) => Promise<ResultadoBusquedaNif>;
  /**
   * Traspaso al móvil por QR. Si no se configura, el botón no ofrece esa vía
   * —mejor no enseñar un camino que no lleva a ninguna parte—.
   */
  qr?: {
    /** Firestore de IDENTITY: las sesiones viven allí, no en la base de la app.
     *  Función, como todo lo demás: Identity no existe hasta después del login. */
    db: () => Firestore;
    /** URL que codifica el QR: la página donde el móvil hace la foto. */
    urlSesion: (clinicaId: string, sessionId: string) => string;
  };
}

let _config: ConfigEscaner | null = null;

/** Se llama una vez, al arrancar la app. */
export function configurarEscanerDocumentos(config: ConfigEscaner): void {
  _config = config;
}

export function escanerConfigurado(): boolean {
  return _config !== null;
}

export function hayTraspasoQr(): boolean {
  return !!_config?.qr;
}

export function config(): ConfigEscaner {
  if (!_config) {
    throw new Error(textosUI().errorEscanerNoConfigurado);
  }
  return _config;
}

/**
 * Mensaje de error presentable.
 *
 * Las callables devuelven el motivo en `message`; lo que no sirve es enseñar un
 * "internal" pelado o un stack. Si no hay nada legible, se usa el respaldo que
 * da el llamante, que sabe qué estaba intentando el usuario.
 */
export function mensajeDeError(e: unknown, respaldo: string): string {
  const msg = (e as { message?: string } | null)?.message;
  if (!msg) return respaldo;
  if (/^internal$/i.test(msg) || /^unknown$/i.test(msg)) return respaldo;
  return msg;
}
