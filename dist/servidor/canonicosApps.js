// canonicosApps.ts — clientes de los endpoints de servidor de Identity para
// SaluFile y SaluFirst (0.14.0, 16-10-2026: «todo canónico» también en las dos
// apps clínicas).
//
// El censo de sus escrituras en Identity encontró a mano, con la cuenta de
// servicio de cada una: el personal (alta, vínculo, edición, baja), las cuentas
// de Auth de las invitaciones, las fotos de carnet, el acelerador, los
// complementos de la suscripción y la edición de un paciente sin sesión (el
// chatbot). Cada cliente es una puerta de Identity que comprueba quién llama
// (la cuenta de las functions de la app, por IAM) y, cuando lo decide una
// persona, quién lo hace (`actuaPor`, su id de Identity): la app ha comprobado
// su ROL (vive en la app); Identity comprueba que su ficha esté activa y
// trabaje en esa clínica con esa app, o que sea superadmin.
//
// Misma puerta que las altas de servidor: ID token del servidor de metadatos,
// sin claves. Fuera de Google Cloud la llamada falla, a propósito. Un rechazo
// es un `ErrorDeIdentity` (estado, código y detalles).
import { llamar } from './canonicosServidor';
/**
 * Publica en `tenants/{id}.acelerador` lo que las demás apps necesitan para
 * hablar con el acelerador de la clínica. Parche: lo que no se manda no se
 * toca. Identity resuelve el tenant (por id o por `idsLocales.salufile`).
 */
export function publicarAceleradorDesdeServidor(app, clinicaId, acelerador) {
    return llamar('publicarAceleradorServidor', { app, clinicaId, acelerador }, 'publicar el acelerador');
}
/**
 * Refleja en `appsActivas` los complementos que valen AHORA en la clínica
 * (`activos`), con la regla «concede, no revoca a quien la tenía por su
 * cuenta» (`cambiosDeComplementos`). `revisar` acota a esos complementos (la
 * prueba de SaluFirst no tiene por qué tocar SaluFact); sin él, todos.
 */
export function sincronizarComplementosDesdeServidor(app, clinicaId, opciones) {
    return llamar('complementosServidor', {
        app, clinicaId, activos: opciones.activos, revisar: opciones.revisar ?? null,
    }, 'reflejar los complementos');
}
/**
 * Alta de una persona en la clínica. Si su documento (o su email) ya es de una
 * ficha, Identity responde 409 con `detalles {profesionalId, enLaClinica}`
 * (`ErrorDeIdentity`): quien llama decide si la vincula.
 */
export function altaProfesionalDesdeServidor(app, clinicaId, datos, opciones) {
    return llamar('altaProfesionalServidor', {
        app, clinicaId, actuaPor: opciones.actuaPor, idLocal: opciones.idLocal ?? null, datos,
    }, 'dar de alta al profesional');
}
/** Añade la clínica a las de la persona (y su id local si no lo tenía). Idempotente. */
export function vincularProfesionalDesdeServidor(app, clinicaId, profesionalId, opciones) {
    return llamar('vincularProfesionalServidor', {
        app, clinicaId, profesionalId, actuaPor: opciones.actuaPor, idLocal: opciones.idLocal ?? null,
    }, 'vincular al profesional');
}
/** Quita la clínica de las de la persona. Sin ninguna clínica, la ficha queda inactiva. */
export function desvincularProfesionalDesdeServidor(app, clinicaId, profesionalId, opciones) {
    return llamar('desvincularProfesionalServidor', {
        app, clinicaId, profesionalId, actuaPor: opciones.actuaPor,
    }, 'desvincular al profesional');
}
/** Parche de la ficha (lo que no se manda no se toca). La persona tiene que ser de la clínica. */
export function actualizarProfesionalDesdeServidor(app, clinicaId, profesionalId, datos, opciones) {
    return llamar('actualizarProfesionalServidor', {
        app, clinicaId, profesionalId, actuaPor: opciones.actuaPor, datos,
    }, 'actualizar al profesional');
}
/** Borra la ficha por completo (y deshabilita su cuenta). Solo un superadmin (`actuaPor`). */
export function eliminarProfesionalDesdeServidor(app, profesionalId, opciones) {
    return llamar('eliminarProfesionalServidor', {
        app, profesionalId, actuaPor: opciones.actuaPor,
    }, 'eliminar al profesional');
}
// ── Cuentas de Identity Auth ─────────────────────────────────────────────────
/**
 * La cuenta de Identity Auth de una persona a la que la clínica invita: la
 * misma si ya existe (puede usar otra app de la suite), o una nueva sin
 * contraseña usable y con el correo sin confirmar. Si su ficha no tenía la
 * cuenta enlazada (`authUid`), se enlaza y queda con la invitación pendiente.
 */
export function cuentaDeInvitacionDesdeServidor(app, clinicaId, persona, opciones) {
    return llamar('cuentaInvitacionServidor', {
        app, clinicaId, actuaPor: opciones.actuaPor, email: persona.email, nombre: persona.nombre ?? null,
    }, 'preparar la cuenta del invitado');
}
/**
 * Código (`oobCode`, 1 h) para que la persona fije su contraseña en Identity
 * Auth. Solo de una ficha de esa clínica. La app lo pide al canjear SU enlace
 * de invitación, que es la credencial.
 */
export function enlaceDeContrasenaDesdeServidor(app, clinicaId, email) {
    return llamar('enlaceContrasenaServidor', { app, clinicaId, email }, 'preparar el cambio de contraseña');
}
/**
 * Activa la cuenta de una persona de la clínica al canjear la invitación de la
 * app: correo confirmado y, si se da, la contraseña (≥ 8). La invitación queda
 * aceptada en su ficha.
 */
export function activarCuentaDesdeServidor(app, clinicaId, uid, opciones = {}) {
    return llamar('activarCuentaServidor', {
        app, clinicaId, uid, password: opciones.password ?? null,
    }, 'activar la cuenta');
}
/** Suspende (o reactiva) una cuenta en TODA la suite. Solo un superadmin (`actuaPor`). */
export function suspenderCuentaDesdeServidor(app, uid, suspendida, opciones) {
    return llamar('suspenderCuentaServidor', {
        app, uid, suspendida, actuaPor: opciones.actuaPor,
    }, suspendida ? 'suspender la cuenta' : 'reactivar la cuenta');
}
// ── Fotos de carnet ──────────────────────────────────────────────────────────
/**
 * Sube (o quita, con `null`) la foto de carnet de un paciente o de un
 * profesional en el Storage de Identity: objeto nuevo con token de descarga,
 * `fotoUrl` + `updatedAt`. Identity mira el tipo por los bytes (JPEG, PNG o
 * WEBP) y el tamaño (≤ 2 MB). La propia foto de un profesional: `actuaPor` = él
 * y sin clínica; la de otro, la clínica donde trabajan los dos.
 */
export function subirFotoDesdeServidor(app, entidad, id, imagenBase64, opciones) {
    return llamar('subirFotoServidor', {
        app, entidad, id, imagenBase64, actuaPor: opciones.actuaPor, clinicaId: opciones.clinicaId ?? null,
    }, imagenBase64 ? 'subir la foto' : 'quitar la foto');
}
// ── Pacientes ────────────────────────────────────────────────────────────────
/**
 * Edita la ficha de un paciente de la clínica SIN sesión de usuario (el
 * chatbot de citas): el mismo parche que `actualizarPacienteCanonico` (lo que
 * no se manda no se toca; vaciar un dato exige `borrar`).
 */
export function actualizarPacienteDesdeServidor(app, clinicaId, pacienteId, datos, opciones = {}) {
    return llamar('actualizarPacienteServidor', {
        app, clinicaId, pacienteId, datos, borrar: opciones.borrar ?? [],
    }, 'actualizar el paciente');
}
//# sourceMappingURL=canonicosApps.js.map