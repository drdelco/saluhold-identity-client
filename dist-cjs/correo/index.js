"use strict";
// @saluhold/identity-client/correo — marco único de los correos de la suite.
//
// JS puro (sin Firebase, sin DOM, sin dependencias): lo importan igual las
// Cloud Functions por la subruta CommonJS que un script de render en local.
Object.defineProperty(exports, "__esModule", { value: true });
exports.esRtl = exports.idiomaDelMarco = exports.IDIOMAS_SUITE = exports.TEXTOS_MARCO = exports.OSCURECIDO_MAXIMO = exports.CONTRASTE_MINIMO = exports.resolverAcento = exports.normalizarHex = exports.contraste = exports.FUENTES = exports.TONOS = exports.NEUTROS = exports.APPS_DEL_PIE = exports.MARCAS = exports.escaparHtml = exports.renderCorreo = void 0;
var render_1 = require("./render");
Object.defineProperty(exports, "renderCorreo", { enumerable: true, get: function () { return render_1.renderCorreo; } });
Object.defineProperty(exports, "escaparHtml", { enumerable: true, get: function () { return render_1.escaparHtml; } });
var marcas_1 = require("./marcas");
Object.defineProperty(exports, "MARCAS", { enumerable: true, get: function () { return marcas_1.MARCAS; } });
Object.defineProperty(exports, "APPS_DEL_PIE", { enumerable: true, get: function () { return marcas_1.APPS_DEL_PIE; } });
Object.defineProperty(exports, "NEUTROS", { enumerable: true, get: function () { return marcas_1.NEUTROS; } });
Object.defineProperty(exports, "TONOS", { enumerable: true, get: function () { return marcas_1.TONOS; } });
Object.defineProperty(exports, "FUENTES", { enumerable: true, get: function () { return marcas_1.FUENTES; } });
var color_1 = require("./color");
Object.defineProperty(exports, "contraste", { enumerable: true, get: function () { return color_1.contraste; } });
Object.defineProperty(exports, "normalizarHex", { enumerable: true, get: function () { return color_1.normalizarHex; } });
Object.defineProperty(exports, "resolverAcento", { enumerable: true, get: function () { return color_1.resolverAcento; } });
Object.defineProperty(exports, "CONTRASTE_MINIMO", { enumerable: true, get: function () { return color_1.CONTRASTE_MINIMO; } });
Object.defineProperty(exports, "OSCURECIDO_MAXIMO", { enumerable: true, get: function () { return color_1.OSCURECIDO_MAXIMO; } });
var textos_1 = require("./textos");
Object.defineProperty(exports, "TEXTOS_MARCO", { enumerable: true, get: function () { return textos_1.TEXTOS_MARCO; } });
Object.defineProperty(exports, "IDIOMAS_SUITE", { enumerable: true, get: function () { return textos_1.IDIOMAS_SUITE; } });
Object.defineProperty(exports, "idiomaDelMarco", { enumerable: true, get: function () { return textos_1.idiomaDelMarco; } });
Object.defineProperty(exports, "esRtl", { enumerable: true, get: function () { return textos_1.esRtl; } });
//# sourceMappingURL=index.js.map