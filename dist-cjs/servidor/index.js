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
exports.subirLogoDeTenantDesdeServidor = exports.accesoAppDesdeServidor = exports.actualizarTenantDesdeServidor = exports.crearTenantDesdeServidor = exports.actualizarEmpresaDesdeServidor = exports.vincularEmpresaDesdeServidor = exports.vincularEmpresaEnIdentity = exports.darDeAltaEmpresaDesdeServidor = exports.darDeAltaPacienteDesdeServidor = exports.liberarNifEnIdentity = exports.acunarNumeroHistoria = exports.clinicasDelGrupo = exports.vincularPacienteEnIdentity = void 0;
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
//# sourceMappingURL=index.js.map