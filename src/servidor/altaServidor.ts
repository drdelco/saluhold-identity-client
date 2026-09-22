// altaServidor.ts — dar de alta un paciente desde un BACKEND de la suite.
//
// El alta de paciente la construye Identity y solo Identity (`altaCanonica`).
// Los frontends llaman al callable `crearPacienteCanonico` con su sesión; esto
// es para los dos caminos que no tienen sesión de usuario detrás: el webhook de
// pago de teleconsulta de SaluFirst y el chatbot de citas de SaluFile. Antes
// escribían la ficha a mano con `IDENTITY_SA_WRITER` y el chatbot la dejaba sin
// número de historia.
//
// La autenticación es IAM: la función de Identity no es pública y solo admite
// un ID token de Google de las cuentas de servicio de las apps. El token sale
// del servidor de metadatos de la propia Cloud Function, así que no hay clave ni
// secreto que guardar ni rotar. Fuera de Google Cloud (un script local) no hay
// servidor de metadatos y la llamada falla: es a propósito.

const URL_ALTA = 'https://europe-west1-identity-44874.cloudfunctions.net/altaPacienteServidor';
const METADATOS = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity';

/** Origen del alta: fija el prefijo del número de historia (SF-, SC-). */
export type OrigenAltaServidor = 'salufirst' | 'sanacloud' | 'chatbot';

/** Lo que admite la ficha canónica. Se normaliza en Identity, no aquí. */
export interface DatosAltaServidor {
  nif: string;
  nombre: string;
  apellidos: string;
  email?: string | null;
  telefono?: string | null;
  prefijoTelefono?: string | null;
  /** 'YYYY-MM-DD'. */
  fechaNacimiento?: string | null;
  sexo?: string | null;
  nacionalidad?: string | null;
  /** Lengua en la que se le escribe al paciente ('es', 'en', …). */
  idiomaInformes?: string | null;
  aseguradora?: string | null;
  numeroPoliza?: string | null;
  direccion?: {
    calle?: string | null;
    codigoPostal?: string | null;
    poblacion?: string | null;
    provincia?: string | null;
    pais?: string | null;
  } | null;
}

export type ResultadoAltaServidor =
  /** Ficha nueva, con su número de historia ya acuñado en todo el grupo de clínicas. */
  | { creado: true; pacienteId: string; nif: string; idLocal: string }
  /** Ya había una ficha con ese documento: no se crea otra; quien llama la vincula. */
  | { creado: false; pacienteId: string; enSuClinica: boolean };

async function idTokenDelServidor(audiencia: string): Promise<string> {
  const r = await fetch(`${METADATOS}?audience=${encodeURIComponent(audiencia)}&format=full`, {
    headers: { 'Metadata-Flavor': 'Google' },
  });
  if (!r.ok) throw new Error(`No se pudo obtener la identidad del servidor (${r.status}).`);
  return r.text();
}

/**
 * Da de alta un paciente en Identity por el camino canónico.
 *
 * Lanza `Error` con el motivo si Identity rechaza los datos (p.ej. un DNI con
 * la letra mal) o no responde; un paciente que ya existe NO es error.
 */
export async function darDeAltaPacienteDesdeServidor(
  app: OrigenAltaServidor,
  clinicaId: string,
  datos: DatosAltaServidor,
): Promise<ResultadoAltaServidor> {
  const token = await idTokenDelServidor(URL_ALTA);
  const r = await fetch(URL_ALTA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ app, clinicaId, datos }),
  });
  const cuerpo = await r.json().catch(() => ({})) as Record<string, unknown>;
  if (!r.ok) {
    throw new Error(String(cuerpo.error || `Identity respondió ${r.status} al dar de alta el paciente.`));
  }
  return cuerpo as unknown as ResultadoAltaServidor;
}
