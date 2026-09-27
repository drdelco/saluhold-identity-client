// @saluhold/identity-client/correo — marco único de los correos de la suite.
//
// JS puro (sin Firebase, sin DOM, sin dependencias): lo importan igual las
// Cloud Functions por la subruta CommonJS que un script de render en local.
export { renderCorreo, escaparHtml, sanearHtmlCorreo } from './render';
export { MARCAS, APPS_DEL_PIE, NEUTROS, TONOS, FUENTES } from './marcas';
export { contraste, normalizarHex, resolverAcento, CONTRASTE_MINIMO, OSCURECIDO_MAXIMO } from './color';
export { TEXTOS_MARCO, IDIOMAS_SUITE, idiomaDelMarco, esRtl } from './textos';
//# sourceMappingURL=index.js.map