import { type AppServidorPersonal } from './canonicosServidor';
export interface DatosAceleradorServidor {
    /** Secreto del acelerador: solo al activarlo. */
    token?: string;
    ips?: string[];
    ipsExternas?: string[];
    version?: string | null;
}
export interface ResultadoAceleradorServidor {
    tenantId: string;
    publicado: true;
    campos: string[];
}
/**
 * Publica en `tenants/{id}.acelerador` lo que las demás apps necesitan para
 * hablar con el acelerador de la clínica. Parche: lo que no se manda no se
 * toca. Identity resuelve el tenant (por id o por `idsLocales.salufile`).
 */
export declare function publicarAceleradorDesdeServidor(app: 'salufile', clinicaId: string, acelerador: DatosAceleradorServidor): Promise<ResultadoAceleradorServidor>;
/** Apps que SaluFile vende como complemento de su suscripción. */
export type AppComplemento = 'saluFact' | 'saluFirst';
export interface CambioDeComplemento {
    accion: 'conceder' | 'marcar' | 'respetar' | 'desmarcar' | 'retirar';
    app: AppComplemento;
    profesionalId: string;
    motivo: string;
}
/**
 * Refleja en `appsActivas` los complementos que valen AHORA en la clínica
 * (`activos`), con la regla «concede, no revoca a quien la tenía por su
 * cuenta» (`cambiosDeComplementos`). `revisar` acota a esos complementos (la
 * prueba de SaluFirst no tiene por qué tocar SaluFact); sin él, todos.
 */
export declare function sincronizarComplementosDesdeServidor(app: 'salufile', clinicaId: string, opciones: {
    activos: AppComplemento[];
    revisar?: AppComplemento[] | null;
}): Promise<{
    clinicaId: string;
    cambios: CambioDeComplemento[];
}>;
/** La persona. El ROL no va: vive en la app. Se normaliza en Identity. */
export interface DatosProfesionalServidor {
    nif?: string;
    nombre?: string;
    apellidos?: string;
    email?: string;
    tratamiento?: string | null;
    especialidad?: string | null;
    colegiado?: string | null;
    telefono?: string | null;
    prefijoTelefono?: string | null;
    idiomaInformes?: string | null;
    /** Cuenta activa en TODA la suite: solo si no trabaja en otra clínica, o un superadmin. */
    activo?: boolean;
    /** Colegiado comprobado por la plataforma: solo un superadmin. */
    colegiadoVerificado?: boolean;
}
/**
 * Alta de una persona en la clínica. Si su documento (o su email) ya es de una
 * ficha, Identity responde 409 con `detalles {profesionalId, enLaClinica}`
 * (`ErrorDeIdentity`): quien llama decide si la vincula.
 */
export declare function altaProfesionalDesdeServidor(app: AppServidorPersonal, clinicaId: string, datos: DatosProfesionalServidor & {
    nif: string;
    nombre: string;
    apellidos: string;
    email: string;
}, opciones: {
    actuaPor: string;
    idLocal?: string | null;
}): Promise<{
    profesionalId: string;
    creado: true;
}>;
/** Añade la clínica a las de la persona (y su id local si no lo tenía). Idempotente. */
export declare function vincularProfesionalDesdeServidor(app: AppServidorPersonal, clinicaId: string, profesionalId: string, opciones: {
    actuaPor: string;
    idLocal?: string | null;
}): Promise<{
    profesionalId: string;
    yaVinculado: boolean;
    idLocal: string | null;
}>;
/** Quita la clínica de las de la persona. Sin ninguna clínica, la ficha queda inactiva. */
export declare function desvincularProfesionalDesdeServidor(app: AppServidorPersonal, clinicaId: string, profesionalId: string, opciones: {
    actuaPor: string;
}): Promise<{
    profesionalId: string;
    yaDesvinculado: boolean;
    desactivado: boolean;
}>;
/** Parche de la ficha (lo que no se manda no se toca). La persona tiene que ser de la clínica. */
export declare function actualizarProfesionalDesdeServidor(app: AppServidorPersonal, clinicaId: string, profesionalId: string, datos: DatosProfesionalServidor, opciones: {
    actuaPor: string;
}): Promise<{
    profesionalId: string;
    actualizado: boolean;
    campos: string[];
    profesional: Record<string, unknown>;
}>;
/** Borra la ficha por completo (y deshabilita su cuenta). Solo un superadmin (`actuaPor`). */
export declare function eliminarProfesionalDesdeServidor(app: AppServidorPersonal, profesionalId: string, opciones: {
    actuaPor: string;
}): Promise<{
    profesionalId: string;
    eliminado: true;
}>;
/**
 * La cuenta de Identity Auth de una persona a la que la clínica invita: la
 * misma si ya existe (puede usar otra app de la suite), o una nueva sin
 * contraseña usable y con el correo sin confirmar. Si su ficha no tenía la
 * cuenta enlazada (`idExterno`), se enlaza y queda con la invitación pendiente.
 */
export declare function cuentaDeInvitacionDesdeServidor(app: AppServidorPersonal, clinicaId: string, persona: {
    email: string;
    nombre?: string | null;
}, opciones: {
    actuaPor: string;
}): Promise<{
    uid: string;
    creada: boolean;
}>;
/**
 * Código (`oobCode`, 1 h) para que la persona fije su contraseña en Identity
 * Auth. Solo de una ficha de esa clínica. La app lo pide al canjear SU enlace
 * de invitación, que es la credencial.
 */
export declare function enlaceDeContrasenaDesdeServidor(app: AppServidorPersonal, clinicaId: string, email: string): Promise<{
    oobCode: string;
}>;
/**
 * Activa la cuenta de una persona de la clínica al canjear la invitación de la
 * app: correo confirmado y, si se da, la contraseña (≥ 8). La invitación queda
 * aceptada en su ficha.
 */
export declare function activarCuentaDesdeServidor(app: AppServidorPersonal, clinicaId: string, uid: string, opciones?: {
    password?: string | null;
}): Promise<{
    uid: string;
    emailVerificado: true;
    contrasena: boolean;
}>;
/** Suspende (o reactiva) una cuenta en TODA la suite. Solo un superadmin (`actuaPor`). */
export declare function suspenderCuentaDesdeServidor(app: AppServidorPersonal, uid: string, suspendida: boolean, opciones: {
    actuaPor: string;
}): Promise<{
    uid: string;
    suspendida: boolean;
}>;
/**
 * Sube (o quita, con `null`) la foto de carnet de un paciente o de un
 * profesional en el Storage de Identity: objeto nuevo con token de descarga,
 * `fotoUrl` + `updatedAt`. Identity mira el tipo por los bytes (JPEG, PNG o
 * WEBP) y el tamaño (≤ 2 MB). La propia foto de un profesional: `actuaPor` = él
 * y sin clínica; la de otro, la clínica donde trabajan los dos.
 */
export declare function subirFotoDesdeServidor(app: AppServidorPersonal, entidad: 'paciente' | 'profesional', id: string, imagenBase64: string | null, opciones: {
    actuaPor: string;
    clinicaId?: string | null;
}): Promise<{
    url: string | null;
}>;
/**
 * Edita la ficha de un paciente de la clínica SIN sesión de usuario (el
 * chatbot de citas): el mismo parche que `actualizarPacienteCanonico` (lo que
 * no se manda no se toca; vaciar un dato exige `borrar`).
 */
export declare function actualizarPacienteDesdeServidor(app: AppServidorPersonal, clinicaId: string, pacienteId: string, datos: Record<string, unknown>, opciones?: {
    borrar?: string[];
}): Promise<{
    pacienteId: string;
    actualizado: boolean;
    campos?: string[];
}>;
//# sourceMappingURL=canonicosApps.d.ts.map