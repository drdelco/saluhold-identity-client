export interface TextosUI {
    seccionIdentidad: string;
    seccionContacto: string;
    seccionDireccion: string;
    nif: string;
    /** Ejemplo dentro del campo. Se traduce porque un DNI español no orienta a quien rellena otro documento. */
    nifPlaceholder: string;
    /** {{tipo}}: DNI o NIE. */
    nifValido: string;
    /** {{numero}}, {{esperada}}, {{letra}}. */
    nifLetraIncorrectaDni: string;
    /** {{esperada}}, {{letra}}. */
    nifLetraIncorrectaNie: string;
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string;
    sexo: string;
    sexoHombre: string;
    sexoMujer: string;
    sexoOtro: string;
    seleccionar: string;
    fechaNacimiento: string;
    idiomaInformes: string;
    nacionalidad: string;
    direccion: string;
    codigoPostal: string;
    poblacion: string;
    provincia: string;
    pais: string;
    sinCoincidencias: string;
    sinEspecificar: string;
    avisoRevisar: string;
    contactoObligatorioProvisional: string;
    avisoNormalizacionEspana: string;
    validacionNombreApellidos: string;
    validacionContactoSinDocumento: string;
    validacionNifObligatorio: string;
    validacionDireccionObligatoria: string;
    validacionEmailObligatorio: string;
    validacionTelefonoObligatorio: string;
    escanearDni: string;
    subirFotos: string;
    fotografiarCon: string;
    camaraEquipo: string;
    camaraMovilQr: string;
    subirFotosDocumento: string;
    avisoEscanerPie: string;
    avisoSinReverso: string;
    avisoDocumentoCaducado: string;
    repetir: string;
    progresoComprimiendo: string;
    progresoLeyendo: string;
    progresoBuscando: string;
    progresoGenerico: string;
    fotografiarDocumento: string;
    anverso: string;
    reverso: string;
    ayudaAnverso: string;
    ayudaReverso: string;
    hacerFoto: string;
    elegirFoto: string;
    cambiar: string;
    /** {{cara}}: anverso o reverso, tal como se rotulan arriba. */
    quitarCara: string;
    avisoFotoNoSeGuarda: string;
    cancelar: string;
    leerDocumento: string;
    camara: string;
    /** {{n}}: número de cámara, cuando el sistema no da nombre. */
    camaraNumerada: string;
    instruccionesWebcam: string;
    capturarAnverso: string;
    capturarReverso: string;
    repetirAnverso: string;
    repetirReverso: string;
    reintentar: string;
    camaraPermisoDenegado: string;
    camaraNoEncontrada: string;
    camaraEnUso: string;
    camaraNoDisponible: string;
    camaraNoSoportada: string;
    errorAbrirCamara: string;
    camaraMovil: string;
    instruccionesQr: string;
    altQr: string;
    movilConectado: string;
    esperandoMovil: string;
    documentoRecibido: string;
    qrCaducado: string;
    generarOtroQr: string;
    avisoQrPie: string;
    errorConexionSesion: string;
    errorCrearSesion: string;
    lecturaIlegible: string;
    lecturaNoEsDocumento: string;
    lecturaIncompleta: string;
    lecturaBloqueada: string;
    errorLeerDocumento: string;
    errorComprobarDocumento: string;
    errorPrepararImagen: string;
    errorEscanerNoConfigurado: string;
    errorQrNoConfigurado: string;
}
export declare const TEXTOS_UI_ES: TextosUI;
/**
 * Sustituye los rótulos. Se puede llamar tantas veces como haga falta: SaluFirst
 * la llama al arrancar y en cada `languageChanged`.
 *
 * El parcial se funde siempre sobre el CASTELLANO, no sobre lo configurado
 * antes. Si no, al pasar de alemán a francés con un diccionario francés
 * incompleto quedarían rótulos en alemán.
 *
 * Una clave con `undefined` se descarta en vez de pisar el defecto: es lo que
 * devuelve un i18n cuando falta la traducción, y dejaría el rótulo en blanco.
 */
export declare function configurarTextosUI(parcial: Partial<TextosUI>): void;
/** Los textos vigentes. Se llama al pintar, no al importar. */
export declare function textosUI(): TextosUI;
/**
 * Rellena los marcadores `{{campo}}`.
 *
 * Un marcador sin valor se deja tal cual y no se borra: así una traducción que
 * usa un campo que no existe se ve a la primera, en vez de dejar un hueco mudo.
 */
export declare function interpolar(texto: string, vars: Record<string, string | number>): string;
//# sourceMappingURL=textos.d.ts.map