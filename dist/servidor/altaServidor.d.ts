/** Origen del alta: fija el prefijo del número de historia (SF-, SC-). */
export type OrigenAltaServidor = 'salufirst' | 'sanacloud' | 'chatbot';
/** Lo que admite la ficha canónica. Se normaliza en Identity, no aquí. */
export interface DatosAltaServidor {
    nif: string;
    nombre: string;
    apellidos: string;
    email?: string | null;
    telefono?: string | null;
    prefijoTelefono?: string | null;
    /** 'YYYY-MM-DD'. */
    fechaNacimiento?: string | null;
    sexo?: string | null;
    nacionalidad?: string | null;
    /** Lengua en la que se le escribe al paciente ('es', 'en', …). */
    idiomaInformes?: string | null;
    aseguradora?: string | null;
    numeroPoliza?: string | null;
    direccion?: {
        calle?: string | null;
        codigoPostal?: string | null;
        poblacion?: string | null;
        provincia?: string | null;
        pais?: string | null;
    } | null;
}
export type ResultadoAltaServidor = 
/** Ficha nueva, con su número de historia ya acuñado en todo el grupo de clínicas. */
{
    creado: true;
    pacienteId: string;
    nif: string;
    idLocal: string;
}
/** Ya había una ficha con ese documento: no se crea otra; quien llama la vincula. */
 | {
    creado: false;
    pacienteId: string;
    enSuClinica: boolean;
};
/**
 * Da de alta un paciente en Identity por el camino canónico.
 *
 * Lanza `Error` con el motivo si Identity rechaza los datos (p.ej. un DNI con
 * la letra mal) o no responde; un paciente que ya existe NO es error.
 */
export declare function darDeAltaPacienteDesdeServidor(app: OrigenAltaServidor, clinicaId: string, datos: DatosAltaServidor): Promise<ResultadoAltaServidor>;
//# sourceMappingURL=altaServidor.d.ts.map