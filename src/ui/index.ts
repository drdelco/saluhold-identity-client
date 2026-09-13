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
  leerSesion,
  marcarEscaneando,
  completarSesion,
  urlDeSesion,
  sesionCaducada,
  SCAN_SESSION_TTL_MIN,
  type ScanSession,
  type EstadoSesion,
} from './sesionEscaneo';

export { default as ScanIdButton } from './ScanIdButton';
export { default as DocumentFacesPicker, type OrigenFoto } from './DocumentFacesPicker';
export { default as WebcamCaptureModal } from './WebcamCaptureModal';
export { default as QrHandoffModal } from './QrHandoffModal';
