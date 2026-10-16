// canonicosServidor.ts — clientes de los endpoints de SERVIDOR de Identity (0.12.0).
//
// «Todo canónico» (Diego, 16-10-2026): lo que un backend de la suite escribe
// en Identity va por Identity, no a mano con la cuenta de servicio. Estos son
// los caminos que no tienen sesión de usuario detrás (o en los que quien decide
// es la app: el rol de administrador de una empresa vive en la app, no en
// Identity). Hoy los usa SaluFact (y Factronia, que es la misma app):
//
//   - vincular una empresa a su clínica y actualizarla (las comisiones de
//     SaluFirst completan la dirección del cobrador desde un cron);
//   - crear y actualizar el tenant de una empresa de sus apps (alta del
//     superadmin, datos y logo, límite de usuarios del plan, apps, supresión);
//   - conceder o retirar el acceso a SUS apps (`saluFact`, `factronia`,
//     `asesoria`): el acceso de un asesor lo concede el administrador de la
//     empresa, no el superadmin.
//
// Misma puerta que las altas de servidor: las funciones de Identity no son
// públicas y solo admiten un ID token de Google de la cuenta de servicio de la
// app, sacado del servidor de metadatos (sin claves). Identity comprueba además
// qué puede hacer cada cuenta. Fuera de Google Cloud la llamada falla, a
// propósito.

import { idTokenDelServidor } from './altaServidor';

const BASE = 'https://europe-west1-identity-44874.cloudfunctions.net';

/** Apps de SaluFact (mismo proyecto). Identity solo acepta las de la cuenta que llama. */
export type AppServidorSaluFact = 'salufact' | 'factronia';

/**
 * Cualquier app de la suite desde su servidor (0.14.0). Cada endpoint admite
 * solo las de la cuenta que llama: SaluFile (`salufile`), SaluFirst
 * (`salufirst`), SaluFact (`salufact`, `factronia`).
 */
export type AppServidor = 'salufile' | 'salufirst' | AppServidorSaluFact;

/** Apps con personal propio (alta, vínculo y cuentas de invitación desde su servidor). */
export type AppServidorPersonal = 'salufile' | 'salufirst';

/** Código (el de un HttpsError) que corresponde a un estado HTTP de Identity. */
export function codigoDeEstadoIdentity(status: number): string {
  switch (status) {
    case 400: return 'invalid-argument';
    case 401: return 'unauthenticated';
    case 403: return 'permission-denied';
    case 404: return 'not-found';
    case 409: return 'already-exists';
    case 412: return 'failed-precondition';
    case 429: return 'resource-exhausted';
    case 503: return 'unavailable';
    default: return 'internal';
  }
}

/**
 * Un rechazo de Identity (0.14.0). Es un `Error` con el mensaje de Identity
 * (para el usuario), y además el estado, el código y los detalles: una app
 * necesita saber, por ejemplo, que un alta es un 409 y de qué ficha.
 */
export class ErrorDeIdentity extends Error {
  status: number;
  codigo: string;
  detalles: Record<string, unknown> | null;
  constructor(mensaje: string, status: number, codigo: string | null, detalles: Record<string, unknown> | null) {
    super(mensaje);
    this.name = 'ErrorDeIdentity';
    this.status = status;
    this.codigo = codigo || codigoDeEstadoIdentity(status);
    this.detalles = detalles;
  }
}

/** POST a un endpoint de servidor de Identity con el ID token de la cuenta (lo usan también los de 0.14.0). */
export async function llamar<T>(endpoint: string, cuerpo: Record<string, unknown>, que: string): Promise<T> {
  const url = `${BASE}/${endpoint}`;
  const token = await idTokenDelServidor(url);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(cuerpo),
  });
  const respuesta = await r.json().catch(() => ({})) as Record<string, unknown>;
  if (!r.ok) {
    const detalles = respuesta.detalles && typeof respuesta.detalles === 'object'
      ? respuesta.detalles as Record<string, unknown> : null;
    throw new ErrorDeIdentity(
      String(respuesta.error || `Identity respondió ${r.status} al ${que}.`),
      r.status,
      typeof respuesta.codigo === 'string' ? respuesta.codigo : null,
      detalles,
    );
  }
  return respuesta as unknown as T;
}

// ── Empresas ─────────────────────────────────────────────────────────────────

export interface ResultadoVincularEmpresaServidor {
  vinculada: true;
  yaVinculada: boolean;
  clinicas: string[];
}

/** Vincula una empresa a la clínica (y sus heredadas). Idempotente. */
export function vincularEmpresaDesdeServidor(
  app: AppServidorSaluFact | 'salufirst-comisiones',
  clinicaId: string,
  empresaId: string,
): Promise<ResultadoVincularEmpresaServidor> {
  return llamar('vincularEmpresaServidor', { app, clinicaId, empresaId }, 'vincular la empresa');
}

/**
 * El mismo parche que `actualizarEmpresaCanonica`: lo que no se manda no se
 * toca. Las cuentas bancarias se validan en Identity (IBAN, sin duplicados, lo
 * que la ficha ya sabía de cada una) y vaciar la lista exige `borrar`.
 */
export interface DatosEmpresaServidor {
  nombre?: string;
  nombreComercial?: string | null;
  cif?: string;
  tipoIdentificador?: string | null;
  tipos?: string[];
  direccion?: {
    calle?: string | null;
    codigoPostal?: string | null;
    poblacion?: string | null;
    provincia?: string | null;
    pais?: string | null;
  };
  contactos?: Array<Record<string, unknown>>;
  cuentasBancarias?: Array<Record<string, unknown>>;
  notasBancarias?: string | null;
  activo?: boolean;
  /** Campos que se vacían A PROPÓSITO (hoy, `cuentasBancarias`). */
  borrar?: string[];
}

export interface ResultadoActualizarEmpresaServidor {
  empresaId: string;
  actualizado: boolean;
  campos: string[];
}

/** Actualiza una empresa de la clínica. Identity comprueba que sea de esa clínica. */
export function actualizarEmpresaDesdeServidor(
  app: AppServidorSaluFact | 'salufirst-comisiones',
  clinicaId: string,
  empresaId: string,
  datos: DatosEmpresaServidor,
): Promise<ResultadoActualizarEmpresaServidor> {
  return llamar('actualizarEmpresaServidor', { app, clinicaId, empresaId, datos }, 'actualizar la empresa');
}

// ── Tenants ──────────────────────────────────────────────────────────────────

/**
 * Datos del tenant. Los maestros (nombre, contacto, dirección, marca) y el
 * límite de usuarios los puede escribir la app sobre un tenant de SUS apps;
 * `activo`, `cif` y `planConcedido` solo un superadmin: la app lo acredita con
 * `actuaPor` (id de Identity de quien lo hace), y Identity comprueba su ficha.
 */
export interface DatosTenantServidor {
  nombre?: string;
  nombreComercial?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: {
    calle?: string | null;
    codigoPostal?: string | null;
    poblacion?: string | null;
    provincia?: string | null;
    pais?: string | null;
  };
  branding?: { primaryColor?: string | null; logoUrl?: string | null };
  limiteUsuarios?: number;
  /** Añade (`true`) o quita (`false`) una app de las de la cuenta que llama en `origenIds`. */
  apps?: Partial<Record<AppServidor | 'identity', boolean>>;
  /**
   * El plan de la app que llama en ESTE tenant (0.14.0): `appConfig.<app>`
   * (`plan`, `pruebaPro`), y el `plan` del tenant si el tenant nació en esa
   * app. Hoy, SaluFirst al pasar a PRO o volver a FREE.
   */
  planApp?: { plan?: string | null; pruebaPro?: boolean };
  /** Marca de supresión de los datos de las apps de quien llama (quita sus apps de `origenIds`). */
  supresion?: { por: { uid: string | null; email: string | null } };
  // Solo superadmin (`actuaPor`):
  activo?: boolean;
  cif?: string;
  planConcedido?: string | null;
  // Solo en el alta:
  adminPrincipal?: { email: string; nombre?: string | null; uid?: string | null };
  /** Texto del plan del alta (FREE/PRO/CORPORATE). Solo un superadmin (`actuaPor`). */
  plan?: string;
}

export interface ResultadoTenantServidor {
  tenantId: string;
  creado?: boolean;
  actualizado?: boolean;
  campos?: string[];
}

/** Alta de un tenant con origen en la app. `tenantId` opcional (si la app ya tiene el suyo). */
export function crearTenantDesdeServidor(
  app: AppServidor,
  datos: DatosTenantServidor,
  opciones: { tenantId?: string | null; actuaPor?: string | null } = {},
): Promise<ResultadoTenantServidor> {
  return llamar('crearTenantServidor', {
    app, tenantId: opciones.tenantId ?? null, actuaPor: opciones.actuaPor ?? null, datos,
  }, 'crear el tenant');
}

/** Actualiza el tenant (parche: lo que no se manda no se toca). */
export function actualizarTenantDesdeServidor(
  app: AppServidor,
  tenantId: string,
  datos: DatosTenantServidor,
  opciones: { actuaPor?: string | null } = {},
): Promise<ResultadoTenantServidor> {
  return llamar('actualizarTenantServidor', {
    app, tenantId, actuaPor: opciones.actuaPor ?? null, datos,
  }, 'actualizar el tenant');
}

// ── Logo del tenant (0.13.0) ─────────────────────────────────────────────────

/** Apps que suben el logo del centro desde su servidor (cada una, con su cuenta). */
export type AppServidorLogo = 'salufile' | 'salufirst' | 'salufact' | 'factronia';

export interface ResultadoLogoTenant {
  tenantId: string;
  /** Dirección de Storage del objeto NUEVO (`tenant_logos/{tenantId}/logo_{ts}.{png|jpg|webp}`), o null si se quitó. */
  logoUrl: string | null;
}

/**
 * Sube (o quita, con `null`) el logo del tenant. Hasta 0.13.0 cada app escribía
 * el objeto en el Storage de Identity con su cuenta de servicio, a su manera
 * (con o sin token, siempre `.png` aunque no lo fuera). Identity comprueba ahora
 * el tipo por los bytes (PNG, JPEG o WEBP) y el tamaño (≤ 2 MB), guarda SIEMPRE
 * un objeto nuevo (los correos ya enviados apuntan al anterior), y escribe
 * `branding.logoUrl` + `updatedAt`.
 *
 * `actuaPor` es el id de Identity de quien lo cambia: la app comprueba antes
 * que administra esa empresa (el rol vive en la app); Identity, que su ficha
 * esté activa, sea de ese tenant y tenga esa app (o que sea superadmin).
 */
export function subirLogoDeTenantDesdeServidor(
  app: AppServidorLogo,
  tenantId: string,
  imagenBase64: string | null,
  opciones: { actuaPor: string },
): Promise<ResultadoLogoTenant> {
  return llamar('subirLogoTenantServidor', {
    app, tenantId, imagenBase64, actuaPor: opciones.actuaPor,
  }, 'subir el logo');
}

// ── Acceso a las apps ────────────────────────────────────────────────────────

export interface PeticionAccesoApp {
  profesionalId: string;
  /**
   * Solo las apps de la cuenta que llama (SaluFact: `saluFact`, `factronia`,
   * `asesoria`; SaluFile: `saluFile`, al suprimir los datos de un centro).
   */
  appId: 'saluFact' | 'factronia' | 'asesoria' | 'saluFile';
  activo: boolean;
  /** Al conceder, añade esta clínica a las del profesional (el asesor la ve en su selector). */
  clinicaId?: string | null;
}

export interface ResultadoAccesoApp {
  profesionalId: string;
  appId: string;
  activo: boolean;
  cambiado: boolean;
}

/**
 * Concede o retira `appsActivas.<appId>`. Respeta la regla de las cuentas de
 * asesoría (no conviven con las apps de producto en la misma cuenta).
 */
export function accesoAppDesdeServidor(
  app: 'salufact' | 'salufile',
  peticion: PeticionAccesoApp,
): Promise<ResultadoAccesoApp> {
  return llamar('accesoAppServidor', { app, ...peticion }, 'cambiar el acceso a la app');
}
