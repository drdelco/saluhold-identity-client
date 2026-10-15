// altaEmpresaServidor.ts — dar de alta una EMPRESA desde un backend de la suite (0.11.0).
//
// El alta de empresa la construye Identity y solo Identity (`altaEmpresaCanonica`).
// Los frontends llaman al callable `crearEmpresaCanonica` con su sesión; esto es
// para lo que no tiene sesión de usuario detrás: hoy, el generador mensual de
// comisiones de SaluFirst en SaluFact, que da de alta al cobrador como cliente.
// Antes escribía la ficha a mano en Identity con un id propio.
//
// Misma puerta que el alta de pacientes de servidor: la función de Identity no
// es pública y solo admite un ID token de Google de la cuenta de servicio de
// cada app (y con los orígenes de esa app). El token sale del servidor de
// metadatos: no hay clave ni secreto. Fuera de Google Cloud la llamada falla, a
// propósito.

import { idTokenDelServidor } from './altaServidor';

const URL_ALTA_EMPRESA = 'https://europe-west1-identity-44874.cloudfunctions.net/altaEmpresaServidor';

/** Origen del alta (traza `source` de la ficha). Identity solo acepta los de la cuenta que llama. */
export type OrigenAltaEmpresaServidor = 'salufact' | 'salufirst-comisiones';

/** Lo que admite la ficha canónica. Se valida y normaliza en Identity, no aquí. */
export interface DatosAltaEmpresaServidor {
  /** El documento. Vacío solo con `tipoIdentificador: 'SIN_IDENTIFICADOR'`. */
  cif: string;
  /** Tipo del documento (`TIPOS_IDENTIFICADOR`). Sin él, lo dice la forma del número. */
  tipoIdentificador?: string | null;
  /** Razón social. */
  nombre: string;
  nombreComercial?: string | null;
  tipos?: string[] | null;
  /** `pais` es TEXTO («España», «Francia»…). */
  direccion?: {
    calle?: string | null;
    codigoPostal?: string | null;
    poblacion?: string | null;
    provincia?: string | null;
    pais?: string | null;
  } | null;
  contactos?: Array<{
    id?: string | null;
    etiqueta?: string | null;
    email?: string | null;
    telefono?: string | null;
    prefijoTelefono?: string | null;
    principal?: boolean | null;
  }> | null;
  /** Atajo: sin `contactos`, forman el contacto principal. */
  email?: string | null;
  telefono?: string | null;
  prefijoTelefono?: string | null;
}

export type ResultadoAltaEmpresaServidor =
  /** Ficha nueva, en la clínica y sus heredadas. */
  | { creada: true; empresaId: string; cif: string | null; tipoIdentificador: string | null }
  /** Ya había una empresa con ese documento: no se crea otra; quien llama la vincula si no es suya. */
  | { creada: false; empresaId: string; enSuClinica: boolean };

/**
 * Da de alta una empresa en Identity por el camino canónico.
 *
 * Lanza `Error` con el motivo si Identity rechaza los datos (un NIF con el
 * carácter de control mal, un país que no reconoce…) o no responde; una
 * empresa que ya existe NO es error.
 */
export async function darDeAltaEmpresaDesdeServidor(
  app: OrigenAltaEmpresaServidor,
  clinicaId: string,
  datos: DatosAltaEmpresaServidor,
): Promise<ResultadoAltaEmpresaServidor> {
  const token = await idTokenDelServidor(URL_ALTA_EMPRESA);
  const r = await fetch(URL_ALTA_EMPRESA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ app, clinicaId, datos }),
  });
  const cuerpo = await r.json().catch(() => ({})) as Record<string, unknown>;
  if (!r.ok) {
    throw new Error(String(cuerpo.error || `Identity respondió ${r.status} al dar de alta la empresa.`));
  }
  return cuerpo as unknown as ResultadoAltaEmpresaServidor;
}
