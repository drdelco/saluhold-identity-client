export { configurarTextosUI, textosUI, TEXTOS_UI_ES, type TextosUI, } from './textos';
export { configurarEscanerDocumentos, escanerConfigurado, hayTraspasoQr, mensajeDeError, type ConfigEscaner, type PacienteCoincidente, type ResultadoBusquedaNif, } from './config';
export { leerDocumentoIdentidad, MENSAJE_FALLO, type CaraDocumento, type DatosDocumento, type DireccionDocumento, type LecturaOk, type LecturaFallida, type ResultadoLectura, type MotivoFalloLectura, } from './documento';
export { comprimirParaIA, type ImagenParaIA } from './imagen';
export { useScanIdDocument, aplicarBorrador, type ResultadoEscaneo, type DecisionEscaneo, type ProgresoEscaneo, } from './useScanIdDocument';
export { crearSesionEscaneo, escucharSesion, borrarSesion, abrirSesion, completarSesion, urlDeSesion, sesionCaducada, SCAN_SESSION_TTL_MIN, type ScanSession, type EstadoSesion, } from './sesionEscaneo';
export { FORM_ALTA_VACIO, PERFILES_ALTA, pide, aplicarLecturaAlAlta, validarAlta, construirDatosAlta, type AppAlta, type CampoAlta, type FormularioAlta, type PerfilAlta, type OpcionesAlta, } from './altaPaciente';
export { default as CamposAltaPaciente, type CamposAltaPacienteProps } from './CamposAltaPaciente';
export { default as ScanIdButton } from './ScanIdButton';
export { default as DocumentFacesPicker, type OrigenFoto } from './DocumentFacesPicker';
export { default as WebcamCaptureModal } from './WebcamCaptureModal';
export { default as QrHandoffModal } from './QrHandoffModal';
//# sourceMappingURL=index.d.ts.map