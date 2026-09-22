// altaPaciente.ts — el formulario de alta, una sola vez para toda la suite.
//
// El PROCEDIMIENTO del alta ya estaba unificado: buscar primero en Identity y
// crear después por `crearPacienteCanonico` / `crearPacienteProvisionalCanonico`,
// que es quien acuña el número de historia, normaliza la dirección española y
// comprueba duplicados en todo el ecosistema.
//
// Lo que seguía divergiendo era lo de más abajo: QUÉ campos pide cada app y CÓMO
// los traduce al payload. Había cuatro copias del mismo formulario, y de esa
// clase de divergencia salieron ya dos averías reales: SaluFact borrando la
// fecha de nacimiento en cada edición porque mandaba `null` por un campo que su
// formulario no cargaba, y SaluFirst escribiendo 'M' de masculino donde Identity
// entiende MUJER.
//
// Aquí están el estado del formulario, el perfil de cada app y la traducción al
// payload. La PANTALLA se queda en cada app a propósito: los pasos alrededor del
// formulario sí son distintos de verdad (SaluFile firma vinculaciones
// presenciales, SaluFirst asigna médico e idioma, el portal elige clínica), y
// meterlos todos en un componente con huecos sería peor que tener tres modales.
import { textosUI, interpolar } from './textos';
export const FORM_ALTA_VACIO = {
    nif: '', nombre: '', apellidos: '', sexo: '', fechaNacimiento: '',
    nacionalidad: '', prefijoTelefono: '+34', telefono: '', email: '',
    calle: '', codigoPostal: '', poblacion: '', provincia: '', pais: 'España',
    idiomaInforme: 'es',
};
/**
 * Qué pide cada app.
 *
 * SaluFact no pide sexo ni fecha de nacimiento y no es un olvido: para emitir
 * una factura no hacen falta, y pedir un dato de salud o una edad que no se va
 * a usar es recoger datos personales sin motivo. Está aquí como dato y no como
 * comentario en un JSX para que no vuelva a colarse al copiar un formulario.
 *
 * El idioma lo piden las cuatro desde 2026-09-14. Antes solo SaluFirst, y como
 * se guardaba en la ficha local del centro, el mismo paciente podía ser 'en' en
 * una app y 'es' en otra: a quien estaba marcado en inglés la teleconsulta le
 * llegaba en español. Ahora es dato maestro de la persona en Identity
 * (`idiomaInformes`), igual que el del profesional.
 */
export const PERFILES_ALTA = {
    saluFile: {
        campos: ['nif', 'nombre', 'apellidos', 'sexo', 'fechaNacimiento', 'nacionalidad', 'telefono', 'email', 'direccion', 'idiomaInforme'],
        obligatorios: ['nif'],
    },
    saluFirst: {
        campos: ['nif', 'nombre', 'apellidos', 'sexo', 'fechaNacimiento', 'nacionalidad', 'telefono', 'email', 'direccion', 'idiomaInforme'],
        obligatorios: ['nif'],
    },
    // La dirección NO es obligatoria en el alta aunque una factura la exija: la
    // exige `emitir-factura`, y allí la regla tiene un matiz que un formulario no
    // puede tener — a un cliente extranjero con pasaporte no se le pide domicilio
    // español, porque VERI*FACTU admite destinatarios extranjeros sin él. Bloquear
    // el alta aquí impediría dar de alta a esos clientes.
    saluFact: {
        campos: ['nif', 'nombre', 'apellidos', 'nacionalidad', 'telefono', 'email', 'direccion', 'idiomaInforme'],
        obligatorios: ['nif'],
    },
    saluHold: {
        campos: ['nif', 'nombre', 'apellidos', 'sexo', 'fechaNacimiento', 'nacionalidad', 'telefono', 'email', 'direccion', 'idiomaInforme'],
        obligatorios: ['nif'],
    },
};
export function pide(perfil, campo) {
    return perfil.campos.includes(campo);
}
/**
 * Lo que el lector del documento dejó en el formulario.
 *
 * El sexo llega YA en el contrato de Identity porque lo traduce el lector, así
 * que se copia tal cual y NO se marca `sexoDesdeDocumento`: marcarlo lo
 * invertiría, porque en un documento la "M" es masculino y en Identity es mujer.
 */
export function aplicarLecturaAlAlta(actual, leido) {
    const dir = leido.direccion;
    return {
        ...actual,
        nif: leido.nif ?? actual.nif,
        nombre: leido.nombre ?? actual.nombre,
        apellidos: leido.apellidos ?? actual.apellidos,
        sexo: leido.sexo ?? actual.sexo,
        fechaNacimiento: leido.fechaNacimiento ?? actual.fechaNacimiento,
        nacionalidad: leido.nacionalidad ?? actual.nacionalidad,
        calle: dir?.calle ?? actual.calle,
        codigoPostal: dir?.codigoPostal ?? actual.codigoPostal,
        poblacion: dir?.poblacion ?? actual.poblacion,
        provincia: dir?.provincia ?? actual.provincia,
        pais: dir?.pais ?? actual.pais,
    };
}
/**
 * Qué falta para poder guardar. Devuelve el aviso, o null si está listo.
 *
 * Sin documento el criterio cambia: lo único que permite volver a encontrar a
 * esa persona es el nombre y una forma de contacto, así que se exige una de las
 * dos. El servidor lo vuelve a comprobar; esto es para no hacer ir y volver.
 *
 * El aviso sale del diccionario y se lee al llamar, no al importar: quien enseña
 * este texto es SaluFirst, que cambia de idioma sin recargar.
 */
export function validarAlta(form, perfil, opciones = {}) {
    const t = textosUI();
    if (!form.nombre.trim() || !form.apellidos.trim()) {
        return t.validacionNombreApellidos;
    }
    if (opciones.provisional) {
        if (!form.email.trim() && !form.telefono.trim()) {
            return t.validacionContactoSinDocumento;
        }
        return null;
    }
    for (const campo of perfil.obligatorios) {
        if (campo === 'nif' && !form.nif.trim()) {
            return t.validacionNifObligatorio;
        }
        if (campo === 'direccion' && !form.calle.trim()) {
            return t.validacionDireccionObligatoria;
        }
        if (campo === 'email' && !form.email.trim())
            return t.validacionEmailObligatorio;
        if (campo === 'telefono' && !form.telefono.trim())
            return t.validacionTelefonoObligatorio;
    }
    return null;
}
/**
 * El payload de la callable canónica.
 *
 * Un campo que el perfil no pide NO viaja, ni siquiera como null. Es la
 * diferencia entre "esta app no gestiona este dato" y "este dato está vacío":
 * mandar null por lo segundo es lo que borró la fecha de nacimiento de los
 * pacientes en cada edición hecha desde SaluFact.
 *
 * `app` no se manda desde aquí: lo pone quien llama, porque es lo que decide el
 * prefijo del número de historia (SC-, SF-, FA-, o ID- si el alta se hizo en el
 * portal).
 */
export function construirDatosAlta(form, perfil, opciones = {}) {
    const dato = (campo, valor) => pide(perfil, campo) && valor.trim() ? { [campo]: valor.trim() } : {};
    return {
        ...(opciones.clinicaId ? { clinicaId: opciones.clinicaId } : {}),
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        // Sin documento no se manda NIF: lo acuña el servidor como PEND-N.
        ...(opciones.provisional ? {} : dato('nif', form.nif.toUpperCase())),
        ...dato('sexo', form.sexo),
        ...dato('fechaNacimiento', form.fechaNacimiento),
        ...dato('nacionalidad', form.nacionalidad),
        // El formulario lo llama `idiomaInforme` y el dato maestro de Identity
        // `idiomaInformes`. Se traduce aqui, que es la frontera, en vez de
        // renombrar el campo del formulario: lo usan cuatro apps y la APK.
        ...(pide(perfil, 'idiomaInforme') && form.idiomaInforme.trim()
            ? { idiomaInformes: form.idiomaInforme.trim() }
            : {}),
        ...dato('telefono', form.telefono),
        ...(pide(perfil, 'telefono') ? { prefijoTelefono: form.prefijoTelefono || '+34' } : {}),
        ...dato('email', form.email),
        ...(pide(perfil, 'direccion')
            ? {
                direccion: {
                    calle: form.calle.trim(),
                    codigoPostal: form.codigoPostal.trim(),
                    poblacion: form.poblacion.trim(),
                    provincia: form.provincia.trim(),
                    pais: form.pais.trim() || 'España',
                },
            }
            : {}),
    };
}
// ═══════════════════════════════════════════════════════════════════════════
// AVISO: NACIONALIDAD EXTRANJERA Y CORREO EN ESPAÑOL
// ═══════════════════════════════════════════════════════════════════════════
//
// El idioma en que se le escribe a un paciente se elige en el alta y el valor
// por defecto es español. Con un británico con NIE eso salió mal y nadie lo vio
// (2026-09-22): el selector estaba ahí, pero en español ya, y no llamaba la
// atención. Este aviso es solo eso, un aviso: no deduce el idioma de la
// nacionalidad ni cambia nada — hay extranjeros que prefieren el español.
//
// No se avisa con las nacionalidades de habla hispana: preguntar a un mexicano
// si le escribimos en español es ruido, y un aviso que salta sin motivo se
// aprende a ignorar.
/** Nacionalidades de lengua española, normalizadas con `claveNacionalidad`. */
const NACIONALIDADES_HISPANAS = new Set([
    'espana', 'mexico', 'colombia', 'argentina', 'peru', 'venezuela', 'chile',
    'ecuador', 'guatemala', 'cuba', 'bolivia', 'republica dominicana', 'honduras',
    'paraguay', 'el salvador', 'nicaragua', 'costa rica', 'panama', 'uruguay',
    'puerto rico', 'guinea ecuatorial',
]);
/** Minúsculas, sin tildes ni espacios sobrantes: «España» y «ESPAÑA» son la misma. */
function claveNacionalidad(nacionalidad) {
    return nacionalidad
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * El aviso que toca enseñar junto al selector de idioma, o null si no toca.
 *
 * Salta cuando la nacionalidad está puesta, no es de habla hispana y el idioma
 * elegido es español (o no hay ninguno, que en Identity equivale a español).
 */
export function avisoIdiomaNacionalidad(nacionalidad, idioma) {
    const pais = (nacionalidad || '').trim();
    if (!pais)
        return null;
    if (NACIONALIDADES_HISPANAS.has(claveNacionalidad(pais)))
        return null;
    if ((idioma || 'es') !== 'es')
        return null;
    return interpolar(textosUI().avisoIdiomaNacionalidad, { pais });
}
//# sourceMappingURL=altaPaciente.js.map