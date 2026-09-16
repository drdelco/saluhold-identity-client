// @saluhold/identity-client/ui — componentes comunes a SaluFile, SaluFact y
// SaluFirst.
//
// Entrada aparte del núcleo a propósito: esto arrastra React, Mantine y
// lucide-react, y el núcleo lo consumen también sitios sin interfaz. Quien
// importe `@saluhold/identity-client` a secas no paga nada de esto.
//
// Lo primero, una vez al arrancar la app:
//
//   configurarEscanerDocumentos({
//     identityFunctions: () => getIdentityFunctions(),
//     initIdentity,
//     clinicaId: () => CLINIC_ID,
//     app: 'saluFile',
//     buscarPorNif: async (nif) => { … },
//     qr: { db, auth, urlSesion: (c, s) => `${origin}/rx/scan/${s}` },
//   });
//
// Y, solo si la app es multilingüe (SaluFirst), los rótulos en el idioma que
// toque —al arrancar y en cada cambio de idioma—:
//
//   configurarTextosUI({ nombre: t('alta.nombre'), … });

export {
  configurarTextosUI,
  textosUI,
  TEXTOS_UI_ES,
  type TextosUI,
} from './textos';

export {
  configurarEscanerDocumentos,
  escanerConfigurado,
  hayTraspasoQr,
  mensajeDeError,
  type ConfigEscaner,
  type PacienteCoincidente,
  type ResultadoBusquedaNif,
} from './config';

export {
  leerDocumentoIdentidad,
  MENSAJE_FALLO,
  type CaraDocumento,
  type DatosDocumento,
  type DireccionDocumento,
  type LecturaOk,
  type LecturaFallida,
  type ResultadoLectura,
  type MotivoFalloLectura,
} from './documento';

export { comprimirParaIA, type ImagenParaIA } from './imagen';

export {
  useScanIdDocument,
  aplicarBorrador,
  type ResultadoEscaneo,
  type DecisionEscaneo,
  type ProgresoEscaneo,
} from './useScanIdDocument';

export {
  crearSesionEscaneo,
  escucharSesion,
  borrarSesion,
  abrirSesion,
  completarSesion,
  urlDeSesion,
  sesionCaducada,
  SCAN_SESSION_TTL_MIN,
  type ScanSession,
  type EstadoSesion,
} from './sesionEscaneo';

export {
  FORM_ALTA_VACIO,
  PERFILES_ALTA,
  pide,
  aplicarLecturaAlAlta,
  validarAlta,
  construirDatosAlta,
  type AppAlta,
  type CampoAlta,
  type FormularioAlta,
  type PerfilAlta,
  type OpcionesAlta,
} from './altaPaciente';

export { default as CamposAltaPaciente, type CamposAltaPacienteProps } from './CamposAltaPaciente';

export { default as ScanIdButton } from './ScanIdButton';
export { default as DocumentFacesPicker, type OrigenFoto } from './DocumentFacesPicker';
export { default as WebcamCaptureModal } from './WebcamCaptureModal';
export { default as QrHandoffModal } from './QrHandoffModal';
