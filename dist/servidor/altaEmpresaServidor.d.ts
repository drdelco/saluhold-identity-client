/** Origen del alta (traza `source` de la ficha). Identity solo acepta los de la cuenta que llama. */
export type OrigenAltaEmpresaServidor = 'salufact' | 'salufirst-comisiones';
/** Lo que admite la ficha canónica. Se valida y normaliza en Identity, no aquí. */
export interface DatosAltaEmpresaServidor {
    /** El documento. Vacío solo con `tipoIdentificador: 'SIN_IDENTIFICADOR'`. */
    cif: string;
    /** Tipo del documento (`TIPOS_IDENTIFICADOR`). Sin él, lo dice la forma del número. */
    tipoIdentificador?: string | null;
    /** Razón social. */
    nombre: string;
    nombreComercial?: string | null;
    tipos?: string[] | null;
    /** `pais` es TEXTO («España», «Francia»…). */
    direccion?: {
        calle?: string | null;
        codigoPostal?: string | null;
        poblacion?: string | null;
        provincia?: string | null;
        pais?: string | null;
    } | null;
    contactos?: Array<{
        id?: string | null;
        etiqueta?: string | null;
        email?: string | null;
        telefono?: string | null;
        prefijoTelefono?: string | null;
        principal?: boolean | null;
    }> | null;
    /** Atajo: sin `contactos`, forman el contacto principal. */
    email?: string | null;
    telefono?: string | null;
    prefijoTelefono?: string | null;
}
export type ResultadoAltaEmpresaServidor = 
/** Ficha nueva, en la clínica y sus heredadas. */
{
    creada: true;
    empresaId: string;
    cif: string | null;
    tipoIdentificador: string | null;
}
/** Ya había una empresa con ese documento: no se crea otra; quien llama la vincula si no es suya. */
 | {
    creada: false;
    empresaId: string;
    enSuClinica: boolean;
};
/**
 * Da de alta una empresa en Identity por el camino canónico.
 *
 * Lanza `Error` con el motivo si Identity rechaza los datos (un NIF con el
 * carácter de control mal, un país que no reconoce…) o no responde; una
 * empresa que ya existe NO es error.
 */
export declare function darDeAltaEmpresaDesdeServidor(app: OrigenAltaEmpresaServidor, clinicaId: string, datos: DatosAltaEmpresaServidor): Promise<ResultadoAltaEmpresaServidor>;
//# sourceMappingURL=altaEmpresaServidor.d.ts.map