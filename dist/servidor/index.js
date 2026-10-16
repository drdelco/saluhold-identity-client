// @saluhold/identity-client/servidor — lo que corre en Cloud Functions.
//
// Entrada aparte del núcleo porque presupone Admin SDK y Firestore de servidor.
// Nada de aquí debe acabar en un navegador.
//
// Se compila a CommonJS además de a ESM (ver `tsconfig.cjs.json`), que es lo que
// permite a las functions de las cuatro apps —todas CommonJS— compartir estas
// reglas en vez de tener cada una su copia.
export { vincularPacienteEnIdentity, clinicasDelGrupo, acunarNumeroHistoria, } from './vinculacion';
export { liberarNifEnIdentity, } from './liberarNif';
export { darDeAltaPacienteDesdeServidor, } from './altaServidor';
export { darDeAltaEmpresaDesdeServidor, } from './altaEmpresaServidor';
export { vincularEmpresaEnIdentity, } from './vinculacionEmpresa';
export { vincularEmpresaDesdeServidor, actualizarEmpresaDesdeServidor, crearTenantDesdeServidor, actualizarTenantDesdeServidor, accesoAppDesdeServidor, subirLogoDeTenantDesdeServidor, } from './canonicosServidor';
export { ErrorDeIdentity, codigoDeEstadoIdentity, } from './canonicosServidor';
// 0.14.0 — SaluFile y SaluFirst: personal, cuentas, fotos, acelerador,
// complementos y edición de paciente desde el servidor.
export { publicarAceleradorDesdeServidor, sincronizarComplementosDesdeServidor, altaProfesionalDesdeServidor, vincularProfesionalDesdeServidor, desvincularProfesionalDesdeServidor, actualizarProfesionalDesdeServidor, eliminarProfesionalDesdeServidor, cuentaDeInvitacionDesdeServidor, enlaceDeContrasenaDesdeServidor, activarCuentaDesdeServidor, suspenderCuentaDesdeServidor, subirFotoDesdeServidor, actualizarPacienteDesdeServidor, } from './canonicosApps';
export { cambiosDeComplementos, APPS_DE_COMPLEMENTO, } from './complementos';
export { desvincularPacienteEnIdentity, asegurarNumeroHistoriaEnIdentity, } from './pacienteServidor';
//# sourceMappingURL=index.js.map