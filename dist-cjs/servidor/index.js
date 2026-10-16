"use strict";
// @saluhold/identity-client/servidor — lo que corre en Cloud Functions.
//
// Entrada aparte del núcleo porque presupone Admin SDK y Firestore de servidor.
// Nada de aquí debe acabar en un navegador.
//
// Se compila a CommonJS además de a ESM (ver `tsconfig.cjs.json`), que es lo que
// permite a las functions de las cuatro apps —todas CommonJS— compartir estas
// reglas en vez de tener cada una su copia.
Object.defineProperty(exports, "__esModule", { value: true });
exports.asegurarNumeroHistoriaEnIdentity = exports.desvincularPacienteEnIdentity = exports.APPS_DE_COMPLEMENTO = exports.cambiosDeComplementos = exports.actualizarPacienteDesdeServidor = exports.subirFotoDesdeServidor = exports.suspenderCuentaDesdeServidor = exports.activarCuentaDesdeServidor = exports.enlaceDeContrasenaDesdeServidor = exports.cuentaDeInvitacionDesdeServidor = exports.eliminarProfesionalDesdeServidor = exports.actualizarProfesionalDesdeServidor = exports.desvincularProfesionalDesdeServidor = exports.vincularProfesionalDesdeServidor = exports.altaProfesionalDesdeServidor = exports.sincronizarComplementosDesdeServidor = exports.publicarAceleradorDesdeServidor = exports.codigoDeEstadoIdentity = exports.ErrorDeIdentity = exports.subirLogoDeTenantDesdeServidor = exports.accesoAppDesdeServidor = exports.actualizarTenantDesdeServidor = exports.crearTenantDesdeServidor = exports.actualizarEmpresaDesdeServidor = exports.vincularEmpresaDesdeServidor = exports.vincularEmpresaEnIdentity = exports.darDeAltaEmpresaDesdeServidor = exports.darDeAltaPacienteDesdeServidor = exports.liberarNifEnIdentity = exports.acunarNumeroHistoria = exports.clinicasDelGrupo = exports.vincularPacienteEnIdentity = void 0;
var vinculacion_1 = require("./vinculacion");
Object.defineProperty(exports, "vincularPacienteEnIdentity", { enumerable: true, get: function () { return vinculacion_1.vincularPacienteEnIdentity; } });
Object.defineProperty(exports, "clinicasDelGrupo", { enumerable: true, get: function () { return vinculacion_1.clinicasDelGrupo; } });
Object.defineProperty(exports, "acunarNumeroHistoria", { enumerable: true, get: function () { return vinculacion_1.acunarNumeroHistoria; } });
var liberarNif_1 = require("./liberarNif");
Object.defineProperty(exports, "liberarNifEnIdentity", { enumerable: true, get: function () { return liberarNif_1.liberarNifEnIdentity; } });
var altaServidor_1 = require("./altaServidor");
Object.defineProperty(exports, "darDeAltaPacienteDesdeServidor", { enumerable: true, get: function () { return altaServidor_1.darDeAltaPacienteDesdeServidor; } });
var altaEmpresaServidor_1 = require("./altaEmpresaServidor");
Object.defineProperty(exports, "darDeAltaEmpresaDesdeServidor", { enumerable: true, get: function () { return altaEmpresaServidor_1.darDeAltaEmpresaDesdeServidor; } });
var vinculacionEmpresa_1 = require("./vinculacionEmpresa");
Object.defineProperty(exports, "vincularEmpresaEnIdentity", { enumerable: true, get: function () { return vinculacionEmpresa_1.vincularEmpresaEnIdentity; } });
var canonicosServidor_1 = require("./canonicosServidor");
Object.defineProperty(exports, "vincularEmpresaDesdeServidor", { enumerable: true, get: function () { return canonicosServidor_1.vincularEmpresaDesdeServidor; } });
Object.defineProperty(exports, "actualizarEmpresaDesdeServidor", { enumerable: true, get: function () { return canonicosServidor_1.actualizarEmpresaDesdeServidor; } });
Object.defineProperty(exports, "crearTenantDesdeServidor", { enumerable: true, get: function () { return canonicosServidor_1.crearTenantDesdeServidor; } });
Object.defineProperty(exports, "actualizarTenantDesdeServidor", { enumerable: true, get: function () { return canonicosServidor_1.actualizarTenantDesdeServidor; } });
Object.defineProperty(exports, "accesoAppDesdeServidor", { enumerable: true, get: function () { return canonicosServidor_1.accesoAppDesdeServidor; } });
Object.defineProperty(exports, "subirLogoDeTenantDesdeServidor", { enumerable: true, get: function () { return canonicosServidor_1.subirLogoDeTenantDesdeServidor; } });
var canonicosServidor_2 = require("./canonicosServidor");
Object.defineProperty(exports, "ErrorDeIdentity", { enumerable: true, get: function () { return canonicosServidor_2.ErrorDeIdentity; } });
Object.defineProperty(exports, "codigoDeEstadoIdentity", { enumerable: true, get: function () { return canonicosServidor_2.codigoDeEstadoIdentity; } });
// 0.14.0 — SaluFile y SaluFirst: personal, cuentas, fotos, acelerador,
// complementos y edición de paciente desde el servidor.
var canonicosApps_1 = require("./canonicosApps");
Object.defineProperty(exports, "publicarAceleradorDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.publicarAceleradorDesdeServidor; } });
Object.defineProperty(exports, "sincronizarComplementosDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.sincronizarComplementosDesdeServidor; } });
Object.defineProperty(exports, "altaProfesionalDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.altaProfesionalDesdeServidor; } });
Object.defineProperty(exports, "vincularProfesionalDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.vincularProfesionalDesdeServidor; } });
Object.defineProperty(exports, "desvincularProfesionalDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.desvincularProfesionalDesdeServidor; } });
Object.defineProperty(exports, "actualizarProfesionalDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.actualizarProfesionalDesdeServidor; } });
Object.defineProperty(exports, "eliminarProfesionalDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.eliminarProfesionalDesdeServidor; } });
Object.defineProperty(exports, "cuentaDeInvitacionDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.cuentaDeInvitacionDesdeServidor; } });
Object.defineProperty(exports, "enlaceDeContrasenaDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.enlaceDeContrasenaDesdeServidor; } });
Object.defineProperty(exports, "activarCuentaDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.activarCuentaDesdeServidor; } });
Object.defineProperty(exports, "suspenderCuentaDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.suspenderCuentaDesdeServidor; } });
Object.defineProperty(exports, "subirFotoDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.subirFotoDesdeServidor; } });
Object.defineProperty(exports, "actualizarPacienteDesdeServidor", { enumerable: true, get: function () { return canonicosApps_1.actualizarPacienteDesdeServidor; } });
var complementos_1 = require("./complementos");
Object.defineProperty(exports, "cambiosDeComplementos", { enumerable: true, get: function () { return complementos_1.cambiosDeComplementos; } });
Object.defineProperty(exports, "APPS_DE_COMPLEMENTO", { enumerable: true, get: function () { return complementos_1.APPS_DE_COMPLEMENTO; } });
var pacienteServidor_1 = require("./pacienteServidor");
Object.defineProperty(exports, "desvincularPacienteEnIdentity", { enumerable: true, get: function () { return pacienteServidor_1.desvincularPacienteEnIdentity; } });
Object.defineProperty(exports, "asegurarNumeroHistoriaEnIdentity", { enumerable: true, get: function () { return pacienteServidor_1.asegurarNumeroHistoriaEnIdentity; } });
//# sourceMappingURL=index.js.map