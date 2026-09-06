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
export const OPCIONES_SEXO: ReadonlyArray<{ value: SexoIdentity; label: SexoDisplay }> = [
  { value: 'H', label: 'Hombre' },
  { value: 'M', label: 'Mujer' },
];

const A_DISPLAY: Record<SexoIdentity, SexoDisplay> = { H: 'Hombre', M: 'Mujer', O: 'Otro' };
const A_IDENTITY: Record<SexoDisplay, SexoIdentity> = { Hombre: 'H', Mujer: 'M', Otro: 'O' };

/** 'H' → 'Hombre'. Cualquier otra cosa → undefined. */
export function sexoADisplay(sexo: string | null | undefined): SexoDisplay | undefined {
  return sexo === 'H' || sexo === 'M' || sexo === 'O' ? A_DISPLAY[sexo] : undefined;
}

/** 'Hombre' → 'H'. Cualquier otra cosa → undefined. */
export function displayASexo(display: string | null | undefined): SexoIdentity | undefined {
  return display === 'Hombre' || display === 'Mujer' || display === 'Otro' ? A_IDENTITY[display] : undefined;
}

/**
 * Estrecha un string genérico al contrato de Identity. Para cuando un campo
 * viene tipado como string y el consumidor exige la unión estricta.
 */
export function comoSexoIdentity(valor: string | null | undefined): SexoIdentity | undefined {
  return valor === 'H' || valor === 'M' || valor === 'O' ? valor : undefined;
}

export function esHombre(valor: string | null | undefined): boolean {
  return valor === 'H' || valor === 'Hombre';
}

export function esMujer(valor: string | null | undefined): boolean {
  return valor === 'M' || valor === 'Mujer';
}

/**
 * Traduce un literal EXTERNO (documento de identidad, MRZ, HL7, formulario en
 * inglés) al contrato de Identity. En esas fuentes "M" es masculino; aquí se
 * convierte en 'H'. NO usar sobre valores que ya vengan de Identity: para ellos
 * 'M' significa mujer y este mapeo lo invertiría — usar `comoSexoIdentity`.
 */
export function sexoDesdeExterno(literal: string | null | undefined): SexoIdentity | undefined {
  if (!literal) return undefined;
  const k = String(literal).trim().toUpperCase().replace(/\.$/, '');
  switch (k) {
    case 'M': case 'MALE': case 'MASCULINO': case 'H': case 'HOMBRE': case 'V': case 'VARON': case 'VARÓN':
      return 'H';
    case 'F': case 'FEMALE': case 'FEMENINO': case 'MUJER':
      return 'M';
    case 'O': case 'OTRO': case 'X':
      return 'O';
    default:
      return undefined;
  }
}
