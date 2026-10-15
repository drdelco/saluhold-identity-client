/**
 * tipoDocumento.ts — EL vocabulario del tipo de documento de una ficha de
 * Identity (`pacientes.tipoIdentificador`, `empresas.tipoIdentificador`) y su
 * validación.
 *
 * POR QUÉ EXISTE (aprobado por Diego el 2026-10-15: «Guardar en Identity el
 * tipo de documento ok»)
 * Hasta ahora el tipo se DEDUCÍA de la forma del número (DNI, NIE y, todo lo
 * demás, pasaporte). Para VERI*FACTU eso no basta: un destinatario sin NIF
 * español se declara con `IDOtro` y su IDType de la lista L7 de la AEAT
 * (Orden HAC/1177/2024), y un pasaporte, un documento de identidad de otro país
 * y un certificado de residencia pueden escribirse exactamente igual. Lo que
 * distingue uno de otro lo sabe quien tiene el documento delante, no el número.
 *
 * UN SOLO VOCABULARIO para pacientes y empresas, el mismo nombre de campo que ya
 * existía y los valores de siempre (DNI, NIE, PASAPORTE, OTRO) más los que hacen
 * falta para cubrir L7. Los nombres son los que SaluFact ya espera
 * (`verifactu/destinatario-registro.ts`, PLAN-VERIFACTU §5.11).
 *
 *   valor                   L7   qué es
 *   DNI                     —    DNI español (va en <NIF>)
 *   NIE                     —    NIE (va en <NIF>)
 *   NIF                     —    NIF de una empresa o entidad (el antiguo CIF),
 *                                o NIF especial K/L/M de una persona (va en <NIF>)
 *   NIF_IVA                 02   NIF-IVA de otro Estado de la UE (FR…, DE…)
 *   PASAPORTE               03   pasaporte
 *   DOCUMENTO_PAIS          04   documento oficial de identificación del país
 *                                o territorio de residencia
 *   CERTIFICADO_RESIDENCIA  05   certificado de residencia
 *   OTRO_DOCUMENTO          06   otro documento probatorio
 *   NO_CENSADO              07   NIF de una persona física no censada en la AEAT
 *   OTRO                    —    de antes: tipo sin especificar. No se elige; para
 *                                facturar hay que concretarlo
 *   PROVISIONAL             —    ficha sin documento (`PEND-n`). Lo pone el servidor
 *
 * No hay un «CIF» aparte: desde 2008 es un NIF (RD 1065/2007) y SaluFact ya lo
 * espera como NIF. La forma de CIF se sigue reconociendo, y se comprueba su
 * carácter de control.
 *
 * Este fichero es PURO (sin React, sin Firebase) y vive en el SDK para que los
 * frontends, la app nativa y las Cloud Functions de Identity —que es donde la
 * validación es autoritativa— apliquen la misma regla. Identity lleva una copia
 * del código en `functions/src/utils/tipo-documento.ts` vigilada por
 * `verificar-paridad-identificador.cjs`: no puede divergir.
 */
/** Los valores que se guardan en `tipoIdentificador`. Ninguno más. */
export declare const TIPOS_IDENTIFICADOR: readonly ["DNI", "NIE", "NIF", "NIF_IVA", "PASAPORTE", "DOCUMENTO_PAIS", "CERTIFICADO_RESIDENCIA", "OTRO_DOCUMENTO", "NO_CENSADO", "OTRO", "PROVISIONAL"];
export type TipoIdentificador = (typeof TIPOS_IDENTIFICADOR)[number];
/** Ficha a la que pertenece el documento: no todo tipo vale para todo. */
export type EntidadDocumento = 'paciente' | 'empresa';
/** IDType de la lista L7 de la AEAT (los de NIF español no llevan IDOtro). */
export type IdTypeAeat = '02' | '03' | '04' | '05' | '06' | '07';
export interface OpcionTipoIdentificador {
    valor: TipoIdentificador;
    /** Lo que lee un administrativo en el selector. */
    etiqueta: string;
    /** Una línea de ayuda bajo el selector: cuándo se usa. */
    ayuda: string;
    /** IDType de la AEAT; null si va como NIF español o no se puede declarar. */
    idTypeAeat: IdTypeAeat | null;
    /** Se ofrece en el selector. OTRO y PROVISIONAL no: solo se enseñan si ya están. */
    elegible: boolean;
    /** Fichas en las que tiene sentido. */
    para: readonly EntidadDocumento[];
}
/** En el orden en que se ofrecen: lo español primero, lo frecuente antes. */
export declare const OPCIONES_TIPO_IDENTIFICADOR: readonly OpcionTipoIdentificador[];
/** ¿Es uno de los valores del vocabulario? (mayúsculas exactas, como se guarda) */
export declare function esTipoIdentificador(valor: unknown): valor is TipoIdentificador;
/** Etiqueta para pintar un valor guardado; el propio valor si no es del vocabulario. */
export declare function etiquetaTipoIdentificador(valor: string | null | undefined): string;
/** IDType de la AEAT de un valor guardado (null: NIF español, OTRO, PROVISIONAL o desconocido). */
export declare function idTypeAeatDe(valor: string | null | undefined): IdTypeAeat | null;
/** ¿Se declara en <NIF> (documento español con NIF censado)? */
export declare function esNifEspanol(valor: string | null | undefined): boolean;
/**
 * Las opciones de un selector, en la forma de Mantine (`value`, `label`,
 * `description`). Solo las elegibles para esa ficha y, si el valor actual no lo
 * es (OTRO, PROVISIONAL), también él: un selector que no puede enseñar lo que
 * hay guardado lo «cambia» al abrirse.
 */
export declare function opcionesTipoIdentificador(entidad: EntidadDocumento, actual?: string | null): {
    value: string;
    label: string;
    description: string;
}[];
/** Prefijos de NIF-IVA admitidos (los 26 Estados miembro distintos de España, con EL, y XI). */
export declare const PREFIJOS_NIF_IVA: readonly string[];
/** País ISO 3166-1 alfa-2 de un NIF-IVA, por su prefijo (EL → GR, XI → GB). null si no lo es. */
export declare function paisDeNifIva(valor: string | null | undefined): string | null;
/** Longitud máxima de un documento extranjero: la del ID de IDOtro (XSD TextMax20). */
export declare const LARGO_MAXIMO_DOCUMENTO = 20;
export type ResultadoDocumento = {
    valido: true;
    tipo: TipoIdentificador;
    normalizado: string;
} | {
    valido: false;
    tipo: TipoIdentificador;
    normalizado: string;
    mensaje: string;
};
/** Forma en la que se GUARDA el número de un documento de ese tipo. */
export declare function normalizarDocumento(tipo: TipoIdentificador, valor: string | null | undefined): string;
/**
 * Comprueba que el número tiene la forma del tipo elegido.
 *
 *  - DNI, NIE, NIF (entidad o K/L/M) y NO_CENSADO: con su carácter de control.
 *  - NIF_IVA: prefijo de un Estado de la UE (no ES; GB solo como XI) y la
 *    estructura de ese país.
 *  - PROVISIONAL: solo un `PEND-n`.
 *  - El resto (pasaporte, documento del país, certificado, otro documento,
 *    OTRO): libre, de 3 a 20 letras o cifras.
 */
export declare function validarDocumento(tipo: TipoIdentificador, valor: string | null | undefined): ResultadoDocumento;
/**
 * El tipo que corresponde a la FORMA del número, cuando nadie lo ha elegido.
 * null si la forma no lo dice (cualquier cosa que no sea española).
 */
export declare function tipoPorForma(valor: string | null | undefined): TipoIdentificador | null;
export type ResolucionDocumento = {
    ok: true;
    tipo: TipoIdentificador;
    normalizado: string;
} | {
    ok: false;
    mensaje: string;
};
/**
 * EL tipo y el número que se guardan, a partir de lo que llega. Lo usan el alta
 * y la edición canónicas de Identity (pacientes y empresas).
 *
 *  - Con tipo elegido: tiene que ser del vocabulario, valer para esa ficha y
 *    cuadrar con el número. OTRO solo se admite si ya era el guardado (no se
 *    elige: se concreta), y PROVISIONAL solo con un `PEND-n`.
 *  - Sin tipo elegido: lo dice la forma si es española (DNI, NIE, NIF,
 *    provisional); si no, se conserva el tipo guardado si es de los que la
 *    forma no deja deducir y el número lo cumple; si tampoco, un paciente queda
 *    como PASAPORTE (lo que se ha hecho siempre) y una empresa obliga a elegir.
 */
export declare function resolverDocumento(entrada: {
    entidad: EntidadDocumento;
    valor: string | null | undefined;
    /** El tipo elegido. undefined/null/'' = nadie lo ha elegido. */
    tipo?: string | null;
    /** El tipo que ya tiene la ficha (en una edición). */
    tipoActual?: string | null;
}): ResolucionDocumento;
//# sourceMappingURL=tipoDocumento.d.ts.map