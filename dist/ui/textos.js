// textos.ts — todos los rótulos que este paquete pinta, en un solo sitio.
//
// POR QUÉ
// SaluFirst es la única app de la suite que ha de ser multilingüe siempre, para
// profesionales y para pacientes, y monta desde aquí el formulario de alta y el
// escáner de documentos. Con los rótulos escritos dentro de cada componente, por
// mucho que SaluFirst tradujera su modal, «Nombre», «Apellidos», «Sin
// coincidencias» o los avisos del escáner seguían saliendo en castellano.
//
// El defecto es el castellano EXACTO que había antes, carácter a carácter:
// SaluFile, SaluFact y el portal son monolingües, no llaman a
// `configurarTextosUI` y no cambia nada para ellos.
//
// REGLA DE USO: se lee con `textosUI()` en el momento de pintar o de construir
// el mensaje, nunca en el cuerpo de un módulo. Leerlo al importar congelaría el
// idioma que hubiera al arrancar y el cambio de idioma en caliente no haría nada.
export const TEXTOS_UI_ES = {
    seccionIdentidad: 'Identidad',
    seccionContacto: 'Contacto',
    seccionDireccion: 'Dirección',
    nif: 'Documento de identidad',
    nifPlaceholder: '12345678Z',
    nifValido: '{{tipo}} correcto',
    nifLetraIncorrectaDni: 'La letra del DNI no corresponde al número: {{numero}} termina en {{esperada}}, no en {{letra}}.',
    nifLetraIncorrectaNie: 'La letra del NIE no corresponde al número: debería terminar en {{esperada}}, no en {{letra}}.',
    nombre: 'Nombre',
    apellidos: 'Apellidos',
    email: 'Email',
    telefono: 'Teléfono',
    sexo: 'Sexo',
    sexoHombre: 'Hombre',
    sexoMujer: 'Mujer',
    sexoOtro: 'Otro',
    seleccionar: '-- Seleccionar --',
    fechaNacimiento: 'Fecha de nacimiento',
    idiomaInformes: 'Idioma de los informes',
    avisoIdiomaNacionalidad: 'Su nacionalidad es {{pais}}. ¿Le escribimos en español?',
    nacionalidad: 'Nacionalidad',
    direccion: 'Dirección',
    codigoPostal: 'C. Postal',
    poblacion: 'Población',
    provincia: 'Provincia',
    pais: 'País',
    sinCoincidencias: 'Sin coincidencias',
    sinEspecificar: 'Sin especificar',
    avisoRevisar: 'El lector no lo leyó con seguridad: compruébalo.',
    contactoObligatorioProvisional: 'Indica al menos uno de los dos: sin documento, es lo único con lo que se podrá volver a identificar al paciente para completar su ficha.',
    avisoNormalizacionEspana: 'Si el país es España, la provincia y el municipio se normalizan solos al guardar.',
    validacionNombreApellidos: 'El nombre y los apellidos son obligatorios.',
    validacionContactoSinDocumento: 'Sin documento hace falta al menos un email o un teléfono para poder completar la ficha más adelante.',
    validacionNifObligatorio: 'El documento de identidad es obligatorio.',
    validacionDireccionObligatoria: 'La dirección es obligatoria.',
    validacionEmailObligatorio: 'El email es obligatorio.',
    validacionTelefonoObligatorio: 'El teléfono es obligatorio.',
    escanearDni: 'Escanear DNI',
    subirFotos: 'Subir fotos',
    fotografiarCon: 'Fotografiar el documento con',
    camaraEquipo: 'Cámara de este equipo',
    camaraMovilQr: 'Cámara del móvil (QR)',
    subirFotosDocumento: 'Subir fotos del documento',
    avisoEscanerPie: 'Anverso y, si quieres el domicilio, también el reverso. La foto no se guarda: se procesa y se descarta.',
    avisoSinReverso: 'Leído. Para el domicilio hace falta también el reverso del documento.',
    avisoDocumentoCaducado: 'Ojo: el documento está caducado. Los datos se han extraído igualmente.',
    repetir: 'Repetir',
    progresoComprimiendo: 'Preparando la imagen…',
    progresoLeyendo: 'Leyendo el documento…',
    progresoBuscando: 'Comprobando si ya existe…',
    progresoGenerico: 'Leyendo…',
    fotografiarDocumento: 'Fotografiar el documento',
    anverso: 'Anverso',
    reverso: 'Reverso',
    ayudaAnverso: 'La cara con la foto y el número.',
    ayudaReverso: 'Opcional. Solo hace falta para el domicilio.',
    hacerFoto: 'Hacer foto',
    elegirFoto: 'Elegir foto',
    cambiar: 'Cambiar',
    quitarCara: 'Quitar {{cara}}',
    avisoFotoNoSeGuarda: 'La foto no se guarda: se procesa y se descarta.',
    cancelar: 'Cancelar',
    leerDocumento: 'Leer documento',
    camara: 'Cámara',
    camaraNumerada: 'Cámara {{n}}',
    instruccionesWebcam: 'Coloca el documento plano, bien iluminado y ocupando la imagen. Primero el anverso; el reverso solo hace falta para el domicilio. La foto no se guarda: se procesa y se descarta.',
    capturarAnverso: 'Capturar anverso',
    capturarReverso: 'Capturar reverso',
    repetirAnverso: 'Repetir anverso',
    repetirReverso: 'Repetir reverso',
    reintentar: 'Reintentar',
    camaraPermisoDenegado: 'Permiso de cámara denegado. Actívalo en el navegador para este sitio.',
    camaraNoEncontrada: 'No se ha encontrado ninguna cámara en este equipo.',
    camaraEnUso: 'La cámara está en uso por otra aplicación.',
    camaraNoDisponible: 'La cámara seleccionada no está disponible.',
    camaraNoSoportada: 'Este navegador no permite usar la cámara.',
    errorAbrirCamara: 'No se ha podido abrir la cámara.',
    camaraMovil: 'Cámara del móvil',
    instruccionesQr: 'Escanea el código con la cámara del móvil. Se abrirá la página para fotografiar el documento (hay que estar identificado en esta clínica) y los datos aparecerán aquí automáticamente.',
    altQr: 'Código QR para el móvil',
    movilConectado: 'Móvil conectado, esperando la foto…',
    esperandoMovil: 'Esperando al móvil…',
    documentoRecibido: 'Documento recibido.',
    qrCaducado: 'El código ha caducado.',
    generarOtroQr: 'Generar otro',
    avisoQrPie: 'La foto se lee en el móvil y no se guarda. Aquí solo llegan los datos extraídos.',
    errorConexionSesion: 'Se ha perdido la conexión con la sesión.',
    errorCrearSesion: 'No se ha podido crear la sesión de escaneo.',
    lecturaIlegible: 'No se lee bien el documento. Acerca la cámara, evita reflejos y vuelve a intentarlo.',
    lecturaNoEsDocumento: 'La imagen no parece un documento de identidad.',
    lecturaIncompleta: 'No se ha podido completar la lectura. Inténtalo de nuevo.',
    lecturaBloqueada: 'No se ha podido procesar esta imagen. Prueba con otra foto.',
    errorLeerDocumento: 'No se ha podido leer el documento.',
    errorComprobarDocumento: 'No se ha podido comprobar el documento.',
    errorPrepararImagen: 'No se pudo preparar la imagen en este navegador.',
    errorEscanerNoConfigurado: 'El escáner de documentos no está configurado: llama a configurarEscanerDocumentos() al arrancar la app.',
    errorQrNoConfigurado: 'El traspaso por QR no está configurado en esta app.',
};
let _textos = TEXTOS_UI_ES;
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
export function configurarTextosUI(parcial) {
    const dados = Object.entries(parcial).filter(([, v]) => typeof v === 'string');
    _textos = { ...TEXTOS_UI_ES, ...Object.fromEntries(dados) };
}
/** Los textos vigentes. Se llama al pintar, no al importar. */
export function textosUI() {
    return _textos;
}
/**
 * Rellena los marcadores `{{campo}}`.
 *
 * Un marcador sin valor se deja tal cual y no se borra: así una traducción que
 * usa un campo que no existe se ve a la primera, en vez de dejar un hueco mudo.
 */
export function interpolar(texto, vars) {
    return texto.replace(/\{\{(\w+)\}\}/g, (marcador, campo) => campo in vars ? String(vars[campo]) : marcador);
}
//# sourceMappingURL=textos.js.map