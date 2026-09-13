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
exports.acunarNumeroHistoria = exports.clinicasDelGrupo = exports.vincularPacienteEnIdentity = void 0;
var vinculacion_1 = require("./vinculacion");
Object.defineProperty(exports, "vincularPacienteEnIdentity", { enumerable: true, get: function () { return vinculacion_1.vincularPacienteEnIdentity; } });
Object.defineProperty(exports, "clinicasDelGrupo", { enumerable: true, get: function () { return vinculacion_1.clinicasDelGrupo; } });
Object.defineProperty(exports, "acunarNumeroHistoria", { enumerable: true, get: function () { return vinculacion_1.acunarNumeroHistoria; } });
//# sourceMappingURL=index.js.map