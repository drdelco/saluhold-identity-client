"use strict";
// @saluhold/identity-client/correo — marco único de los correos de la suite.
//
// JS puro (sin Firebase, sin DOM, sin dependencias): lo importan igual las
// Cloud Functions por la subruta CommonJS que un script de render en local.
Object.defineProperty(exports, "__esModule", { value: true });
exports.enlacesFueraDelDominio = exports.recursosFueraDelDominio = exports.estiloFuenteDeMarca = exports.fuenteDeMarcaEnDominio = exports.APPS_CON_FUENTE_DE_MARCA = exports.RUTA_FUENTE_MARCA = exports.manejarLogoCentro = exports.tipoDeImagen = exports.imagenesFueraDelDominio = exports.imagenDelDominio = exports.logoEnDominioDeLaApp = exports.partesDeLogo = exports.hostDeImagenes = exports.LOGO_MAX_BYTES = exports.APPS_CON_RUTA_DE_LOGO = exports.RUTA_LOGO = exports.ALMACEN_LOGOS = exports.esRtl = exports.idiomaDelMarco = exports.IDIOMAS_SUITE = exports.TEXTOS_MARCO = exports.OSCURECIDO_MAXIMO = exports.CONTRASTE_MINIMO = exports.resolverAcento = exports.normalizarHex = exports.contraste = exports.FUENTES = exports.TONOS = exports.NEUTROS = exports.APPS_DEL_PIE = exports.MARCAS = exports.sanearHtmlCorreo = exports.escaparHtml = exports.remitenteDelCentro = exports.renderCorreo = void 0;
var render_1 = require("./render");
Object.defineProperty(exports, "renderCorreo", { enumerable: true, get: function () { return render_1.renderCorreo; } });
Object.defineProperty(exports, "remitenteDelCentro", { enumerable: true, get: function () { return render_1.remitenteDelCentro; } });
Object.defineProperty(exports, "escaparHtml", { enumerable: true, get: function () { return render_1.escaparHtml; } });
Object.defineProperty(exports, "sanearHtmlCorreo", { enumerable: true, get: function () { return render_1.sanearHtmlCorreo; } });
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
var imagenes_1 = require("./imagenes");
Object.defineProperty(exports, "ALMACEN_LOGOS", { enumerable: true, get: function () { return imagenes_1.ALMACEN_LOGOS; } });
Object.defineProperty(exports, "RUTA_LOGO", { enumerable: true, get: function () { return imagenes_1.RUTA_LOGO; } });
Object.defineProperty(exports, "APPS_CON_RUTA_DE_LOGO", { enumerable: true, get: function () { return imagenes_1.APPS_CON_RUTA_DE_LOGO; } });
Object.defineProperty(exports, "LOGO_MAX_BYTES", { enumerable: true, get: function () { return imagenes_1.LOGO_MAX_BYTES; } });
Object.defineProperty(exports, "hostDeImagenes", { enumerable: true, get: function () { return imagenes_1.hostDeImagenes; } });
Object.defineProperty(exports, "partesDeLogo", { enumerable: true, get: function () { return imagenes_1.partesDeLogo; } });
Object.defineProperty(exports, "logoEnDominioDeLaApp", { enumerable: true, get: function () { return imagenes_1.logoEnDominioDeLaApp; } });
Object.defineProperty(exports, "imagenDelDominio", { enumerable: true, get: function () { return imagenes_1.imagenDelDominio; } });
Object.defineProperty(exports, "imagenesFueraDelDominio", { enumerable: true, get: function () { return imagenes_1.imagenesFueraDelDominio; } });
Object.defineProperty(exports, "tipoDeImagen", { enumerable: true, get: function () { return imagenes_1.tipoDeImagen; } });
Object.defineProperty(exports, "manejarLogoCentro", { enumerable: true, get: function () { return imagenes_1.manejarLogoCentro; } });
Object.defineProperty(exports, "RUTA_FUENTE_MARCA", { enumerable: true, get: function () { return imagenes_1.RUTA_FUENTE_MARCA; } });
Object.defineProperty(exports, "APPS_CON_FUENTE_DE_MARCA", { enumerable: true, get: function () { return imagenes_1.APPS_CON_FUENTE_DE_MARCA; } });
Object.defineProperty(exports, "fuenteDeMarcaEnDominio", { enumerable: true, get: function () { return imagenes_1.fuenteDeMarcaEnDominio; } });
Object.defineProperty(exports, "estiloFuenteDeMarca", { enumerable: true, get: function () { return imagenes_1.estiloFuenteDeMarca; } });
Object.defineProperty(exports, "recursosFueraDelDominio", { enumerable: true, get: function () { return imagenes_1.recursosFueraDelDominio; } });
Object.defineProperty(exports, "enlacesFueraDelDominio", { enumerable: true, get: function () { return imagenes_1.enlacesFueraDelDominio; } });
//# sourceMappingURL=index.js.map