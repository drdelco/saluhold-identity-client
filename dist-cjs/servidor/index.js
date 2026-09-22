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
exports.darDeAltaPacienteDesdeServidor = exports.liberarNifEnIdentity = exports.acunarNumeroHistoria = exports.clinicasDelGrupo = exports.vincularPacienteEnIdentity = void 0;
var vinculacion_1 = require("./vinculacion");
Object.defineProperty(exports, "vincularPacienteEnIdentity", { enumerable: true, get: function () { return vinculacion_1.vincularPacienteEnIdentity; } });
Object.defineProperty(exports, "clinicasDelGrupo", { enumerable: true, get: function () { return vinculacion_1.clinicasDelGrupo; } });
Object.defineProperty(exports, "acunarNumeroHistoria", { enumerable: true, get: function () { return vinculacion_1.acunarNumeroHistoria; } });
var liberarNif_1 = require("./liberarNif");
Object.defineProperty(exports, "liberarNifEnIdentity", { enumerable: true, get: function () { return liberarNif_1.liberarNifEnIdentity; } });
var altaServidor_1 = require("./altaServidor");
Object.defineProperty(exports, "darDeAltaPacienteDesdeServidor", { enumerable: true, get: function () { return altaServidor_1.darDeAltaPacienteDesdeServidor; } });
//# sourceMappingURL=index.js.map