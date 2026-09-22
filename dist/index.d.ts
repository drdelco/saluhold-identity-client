/**
 * @saluhold/identity-client
 *
 * Cliente JS para el Local Server SaluHold (proceso que despliega SaluFile
 * en el PC de cada clínica y que cachea pacientes/empresas/profesionales de
 * Identity para acelerar lecturas y permitir trabajo offline).
 *
 * Uso típico desde una app frontend:
 *
 *   import { localBuscarClientes, setLocalServerHost } from '@saluhold/identity-client';
 *
 *   setLocalServerHost(clinicConfig.localServerHost);
 *   const clientes = await localBuscarClientes('garcia');
 *   if (clientes === null) {
 *     // Caer a Cloud Functions
 *   }
 *
 * Cualquier función `local*` devuelve `null` (o `undefined` para los obtener
 * por id) cuando el servidor local no responde — el caller decide si caer
 * a Cloud Functions o mostrar un error.
 */
export interface ClienteDireccion {
    calle: string;
    codigoPostal: string;
    poblacion: string;
    provincia: string;
    pais: string;
}
/**
 * Cliente "estándar SaluHold": shape que usan los frontends para mostrar y
 * editar pacientes y empresas de Identity. Pensado como mínimo común
 * denominador entre SaluFile, SaluFact y SaluFirst.
 */
export interface Cliente {
    id: string;
    tipo: 'PACIENTE' | 'EMPRESA';
    nif: string;
    nombreRazon: string;
    tipoIdentificador?: 'DNI' | 'NIE' | 'PASAPORTE' | 'OTRO';
    email?: string;
    telefono?: string;
    direccion: ClienteDireccion;
    esExterno: boolean;
    tieneEmail?: boolean;
    idLocal?: string;
}
/** Documento crudo de Identity.pacientes que devuelve el local server. */
export interface RawPaciente {
    id: string;
    nombre?: string;
    apellidos?: string;
    nif?: string;
    tipoIdentificador?: 'DNI' | 'NIE' | 'PASAPORTE' | 'OTRO';
    email?: string;
    telefono?: string;
    fechaNacimiento?: string;
    sexo?: string;
    direccion?: {
        calle?: string;
        codigoPostal?: string;
        poblacion?: string;
        provincia?: string;
        pais?: string;
    };
    clinicaIds?: string[];
    idsLocales?: Record<string, string>;
    idLocal?: string | null;
}
/** Documento crudo de Identity.empresas que devuelve el local server. */
export interface RawEmpresa {
    id: string;
    nombre?: string;
    cif?: string;
    contactos?: Array<{
        nombre?: string;
        departamento?: string;
        email?: string;
        telefono?: string;
        principal?: boolean;
    }>;
    direccion?: {
        calle?: string;
        codigoPostal?: string;
        poblacion?: string;
        provincia?: string;
        pais?: string;
    };
    clinicaIds?: string[];
    activo?: boolean;
}
/** Alias semántico usado por SaluFile (vista interna de paciente). */
export type IdentityPaciente = RawPaciente;
/** Documento crudo de Identity.profesionales. */
export interface IdentityProfesional {
    id: string;
    uid?: string;
    nombre?: string;
    apellidos?: string;
    email?: string;
    tratamiento?: string;
    especialidad?: string;
    telefono?: string;
    clinicaIds?: string[];
    activo?: boolean;
    [key: string]: unknown;
}
/**
 * Configura el host LAN del servidor local (e.g. "192.168.1.42"). Se llama
 * típicamente desde el `useAuth` de cada app cuando carga la config de
 * clínica desde `tenants/{clinicaId}/config/fiscal.localServerHost`.
 */
export declare function setLocalServerHost(host: string | null | undefined): void;
/**
 * Configura el host por túnel exterior (Tailscale/VPN). Solo se prueba
 * si fallan localhost + LAN host. Permite que dispositivos remotos en
 * la mesh VPN del clínic alcancen el acelerador sin sacrificar la
 * latencia de los PCs internos.
 */
export declare function setLocalServerHostExternal(host: string | null | undefined): void;
/**
 * ¿Hay algún host de acelerador configurado?
 *
 * Sirve para NO sondear cuando no hay nada que sondear. Una clínica sin
 * acelerador —el caso más común— no tiene por qué intentar tres conexiones cada
 * minuto para siempre: no hay servidor, o no se quiere usar. Sin esto, el
 * testigo del acelerador convierte el caso normal en ruido de red permanente.
 *
 * `localhost` no cuenta como configuración: se prueba igualmente cuando hay
 * algún host puesto, porque el PC servidor se alcanza a sí mismo por ahí.
 */
export declare function hayAceleradorConfigurado(): boolean;
export declare function getLocalServerUrl(): string;
export declare function isLocalServerAvailable(): boolean | null;
export declare function getLocalServerStats(): {
    isAvailable: boolean | null;
    localHits: number;
    cloudFallbacks: number;
};
/** Fuerza un re-check al siguiente intento (e.g. tras reiniciar el servidor). */
export declare function resetLocalServerCheck(): void;
/**
 * Garantiza que el probe de disponibilidad se ha ejecutado al menos una vez
 * y devuelve el resultado. Útil para flujos que no hacen llamadas HTTP previas
 * (e.g. `acceleratorWS.connect()`): sin esto, `getLocalServerUrl()` puede
 * devolver el default `https://localhost:3501` antes de haber probado LAN /
 * external, y los PCs remotos abren WSS contra un host incorrecto.
 */
export declare function ensureLocalServerChecked(): Promise<boolean>;
/** Lo llama cada app al cargar la configuración de su clínica. */
export declare function setAcceleratorToken(token: string | null | undefined): void;
export declare function getAcceleratorToken(): string | null;
export declare function localPost<T>(path: string, body: Record<string, unknown>): Promise<T | null>;
export declare function localGet<T>(path: string): Promise<T | null>;
export declare function mapPacienteToCliente(p: RawPaciente, clinicaId?: string): Cliente;
export declare function mapEmpresaToCliente(e: RawEmpresa): Cliente;
/**
 * Busca clientes (pacientes y/o empresas) en el servidor local.
 * Por NIF/CIF cae a `null` (cloud) porque el local solo conoce los de la
 * propia clínica y se perdería la búsqueda cross-tenant.
 */
export declare function localBuscarClientes(termino: string, tipo?: 'todos' | 'pacientes' | 'empresas', limite?: number): Promise<Cliente[] | null>;
/**
 * Últimos clientes añadidos/modificados (modo "__recientes__").
 * Si el local server está actualizado por el listener de Identity, refleja
 * cambios de cualquier app del ecosistema.
 */
export declare function localClientesRecientes(tipo?: 'todos' | 'pacientes' | 'empresas', limite?: number): Promise<Cliente[] | null>;
export declare function localObtenerCliente(id: string, tipo: 'PACIENTE' | 'EMPRESA'): Promise<Cliente | null | undefined>;
export declare function localBuscarPacientes(termino: string, limite?: number): Promise<IdentityPaciente[] | null>;
export declare function localObtenerPaciente(identityId: string): Promise<IdentityPaciente | null | undefined>;
export declare function localListarPacientesRecientes(limite?: number): Promise<IdentityPaciente[] | null>;
export declare function localListarProfesionales(limite?: number, soloActivos?: boolean): Promise<IdentityProfesional[] | null>;
export declare function localBuscarProfesionales(query: string, limite?: number): Promise<IdentityProfesional[] | null>;
export declare function localObtenerProfesional(profesionalId: string): Promise<IdentityProfesional | null | undefined>;
export declare function localBuscarProfesionalPorUID(uid: string): Promise<IdentityProfesional | null | undefined>;
export declare function localGetClinicConfig(): Promise<Record<string, unknown> | null>;
export { normalizarIdentificador, canonizarIdentificador, tipoDeIdentificador, validarIdentificador, identificadorAceptable, } from './identificador';
export type { TipoIdentificador, ResultadoValidacion } from './identificador';
export { OPCIONES_SEXO, sexoADisplay, displayASexo, comoSexoIdentity, esHombre, esMujer, sexoDesdeExterno, } from './sexo';
export type { SexoIdentity, SexoDisplay } from './sexo';
export { comprimirParaIA, type ImagenParaIA } from './ui/imagen';
export { FORM_ALTA_VACIO, PERFILES_ALTA, pide, aplicarLecturaAlAlta, validarAlta, construirDatosAlta, avisoIdiomaNacionalidad, } from './ui/altaPaciente';
export type { AppAlta, CampoAlta, FormularioAlta, PerfilAlta, OpcionesAlta, } from './ui/altaPaciente';
export { configurarTextosUI, textosUI, TEXTOS_UI_ES } from './ui/textos';
export type { TextosUI } from './ui/textos';
//# sourceMappingURL=index.d.ts.map