/**
 * sexo.ts — codificación del sexo, ÚNICA para toda la suite.
 *
 * Identity almacena 'H' (hombre), 'M' (mujer) y 'O' (otro). Ese es el contrato
 * y no cambia por app.
 *
 * Por qué vive aquí y no en cada app: había tres convenios conviviendo.
 * SaluFile usaba H/M; SaluFirst y SaluFact tipaban 'M' | 'F' y SaluFirst
 * llegó a escribir 'M' (masculino) crudo en Identity, donde 'M' es MUJER — cada
 * hombre dado de alta desde allí quedaba registrado como mujer. Con un solo
 * codec compartido no hay convenio que traducir mal.
 *
 * Decisión 2026-05-19, vigente: NO migrar Identity a M/F (ISO 5218). Las
 * integraciones externas que lo exijan mapean en su frontera.
 */
/** Lo que se ALMACENA en Identity. */
export type SexoIdentity = 'H' | 'M' | 'O';
/** Lo que se MUESTRA. */
export type SexoDisplay = 'Hombre' | 'Mujer' | 'Otro';
/** Opciones listas para un <Select>. Mismo orden y rótulos en las tres apps. */
export declare const OPCIONES_SEXO: ReadonlyArray<{
    value: SexoIdentity;
    label: SexoDisplay;
}>;
/** 'H' → 'Hombre'. Cualquier otra cosa → undefined. */
export declare function sexoADisplay(sexo: string | null | undefined): SexoDisplay | undefined;
/** 'Hombre' → 'H'. Cualquier otra cosa → undefined. */
export declare function displayASexo(display: string | null | undefined): SexoIdentity | undefined;
/**
 * Estrecha un string genérico al contrato de Identity. Para cuando un campo
 * viene tipado como string y el consumidor exige la unión estricta.
 */
export declare function comoSexoIdentity(valor: string | null | undefined): SexoIdentity | undefined;
export declare function esHombre(valor: string | null | undefined): boolean;
export declare function esMujer(valor: string | null | undefined): boolean;
/**
 * Traduce un literal EXTERNO (documento de identidad, MRZ, HL7, formulario en
 * inglés) al contrato de Identity. En esas fuentes "M" es masculino; aquí se
 * convierte en 'H'. NO usar sobre valores que ya vengan de Identity: para ellos
 * 'M' significa mujer y este mapeo lo invertiría — usar `comoSexoIdentity`.
 */
export declare function sexoDesdeExterno(literal: string | null | undefined): SexoIdentity | undefined;
//# sourceMappingURL=sexo.d.ts.map