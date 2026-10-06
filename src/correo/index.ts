// @saluhold/identity-client/correo — marco único de los correos de la suite.
//
// JS puro (sin Firebase, sin DOM, sin dependencias): lo importan igual las
// Cloud Functions por la subruta CommonJS que un script de render en local.

export { renderCorreo, remitenteDelCentro, escaparHtml, sanearHtmlCorreo } from './render';
export type {
  VarianteCorreo,
  TenantCorreo,
  RemitenteCorreo,
  FilaDato,
  CeldaRejilla,
  AccionCorreo,
  EnlaceCorreo,
  PasoCorreo,
  BloqueCorreo,
  OpcionesCorreo,
  CorreoRenderizado,
} from './render';
export { MARCAS, APPS_DEL_PIE, NEUTROS, TONOS, FUENTES } from './marcas';
export type { AppCorreo, MarcaCorreo, TonoCaja } from './marcas';
export { contraste, normalizarHex, resolverAcento, CONTRASTE_MINIMO, OSCURECIDO_MAXIMO } from './color';
export type { AcentoResuelto } from './color';
export { TEXTOS_MARCO, IDIOMAS_SUITE, idiomaDelMarco, esRtl } from './textos';
export type { TextosMarco } from './textos';
export {
  ALMACEN_LOGOS, RUTA_LOGO, APPS_CON_RUTA_DE_LOGO, LOGO_MAX_BYTES, hostDeImagenes, partesDeLogo, logoEnDominioDeLaApp,
  imagenDelDominio, imagenesFueraDelDominio, tipoDeImagen, manejarLogoCentro,
  RUTA_FUENTE_MARCA, APPS_CON_FUENTE_DE_MARCA, fuenteDeMarcaEnDominio, estiloFuenteDeMarca, recursosFueraDelDominio,
} from './imagenes';
export type { PeticionLogo, RespuestaLogo } from './imagenes';
