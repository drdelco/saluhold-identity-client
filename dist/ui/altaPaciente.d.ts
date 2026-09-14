import type { DatosDocumento } from './documento';
/** Las apps que dan altas. 'saluHold' es el portal de administración. */
export type AppAlta = 'saluFile' | 'saluFirst' | 'saluFact' | 'saluHold';
export type CampoAlta = 'nif' | 'nombre' | 'apellidos' | 'sexo' | 'fechaNacimiento' | 'nacionalidad' | 'telefono' | 'email' | 'direccion' | 'idiomaInforme';
export interface FormularioAlta {
    nif: string;
    nombre: string;
    apellidos: string;
    /** Contrato de Identity: 'H' | 'M' | 'O'. Nunca el literal de un documento. */
    sexo: string;
    /** ISO 'YYYY-MM-DD'. */
    fechaNacimiento: string;
    nacionalidad: string;
    prefijoTelefono: string;
    telefono: string;
    email: string;
    calle: string;
    codigoPostal: string;
    poblacion: string;
    provincia: string;
    pais: string;
    /**
     * Lengua en la que se le escribe: emails, informes y formularios.
     *
     * Se llama en singular porque es el campo del FORMULARIO; en Identity el dato
     * maestro es `idiomaInformes`, y la traducción la hace `construirDatosAlta`,
     * que es justo la frontera entre el formulario y el servidor.
     */
    idiomaInforme: string;
}
export declare const FORM_ALTA_VACIO: FormularioAlta;
export interface PerfilAlta {
    /** Qué se pide, en este orden. Lo que no está aquí no se enseña ni se manda. */
    campos: CampoAlta[];
    /**
     * Qué no puede ir vacío en un alta CON documento. Nombre y apellidos lo son
     * siempre, en todas las apps, y no hace falta repetirlos.
     */
    obligatorios: CampoAlta[];
}
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
export declare const PERFILES_ALTA: Record<AppAlta, PerfilAlta>;
export declare function pide(perfil: PerfilAlta, campo: CampoAlta): boolean;
/**
 * Lo que el lector del documento dejó en el formulario.
 *
 * El sexo llega YA en el contrato de Identity porque lo traduce el lector, así
 * que se copia tal cual y NO se marca `sexoDesdeDocumento`: marcarlo lo
 * invertiría, porque en un documento la "M" es masculino y en Identity es mujer.
 */
export declare function aplicarLecturaAlAlta(actual: FormularioAlta, leido: DatosDocumento): FormularioAlta;
export interface OpcionesAlta {
    /** En qué clínica se da de alta. Lo exige la callable canónica. */
    clinicaId?: string;
    /** Ficha sin documento: se le acuña un PEND-N. */
    provisional?: boolean;
}
/**
 * Qué falta para poder guardar. Devuelve el aviso, o null si está listo.
 *
 * Sin documento el criterio cambia: lo único que permite volver a encontrar a
 * esa persona es el nombre y una forma de contacto, así que se exige una de las
 * dos. El servidor lo vuelve a comprobar; esto es para no hacer ir y volver.
 */
export declare function validarAlta(form: FormularioAlta, perfil: PerfilAlta, opciones?: OpcionesAlta): string | null;
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
export declare function construirDatosAlta(form: FormularioAlta, perfil: PerfilAlta, opciones?: OpcionesAlta): Record<string, unknown>;
//# sourceMappingURL=altaPaciente.d.ts.map