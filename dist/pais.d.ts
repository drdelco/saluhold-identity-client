/**
 * pais.ts — traductor ÚNICO entre el nombre de un país y su código ISO 3166-1
 * alfa-2.
 *
 * POR QUÉ
 * Identity guarda el país de pacientes y empresas como TEXTO en
 * `direccion.pais` («España», «Francia»: lo que pinta el selector de las apps),
 * y así se queda (Diego, 2026-10-15: «el país ya se guarda»). Pero VERI*FACTU
 * declara el país de un destinatario extranjero con su código ISO (CodigoPais
 * de IDOtro), y SaluFact lo necesita al emitir. La traducción se hace en la
 * FRONTERA, en quien la necesita, y con una sola tabla: si cada app adivina por
 * su cuenta, una reconoce «Luxemburgo» y otra lo declara español (le pasó a
 * SaluFact hasta el 2026-10-15).
 *
 * LA TABLA: los 249 códigos de la ISO 3166-1 más XK (Kosovo, que ofrecen los
 * selectores de la suite). El nombre es el que escriben esos selectores (la
 * lista `PAISES` de las apps) y, para los territorios que no están en ella, el
 * de CLDR en castellano. Cada país reconoce además su nombre CLDR en castellano
 * y en inglés y unos pocos alias de uso común (Holanda, EE. UU., Inglaterra…).
 * La tabla está escrita aquí, no se calcula con `Intl.DisplayNames`: CLDR
 * cambia nombres entre versiones («República Checa» → «Chequia») y la app
 * nativa no siempre lo tiene; un traductor que da resultados distintos según
 * el motor no es un traductor.
 *
 * Se compara sin tildes, sin mayúsculas y sin signos: «PAÍSES BAJOS», «paises
 * bajos» y «Países-Bajos» son lo mismo. Lo que no se reconoce devuelve null:
 * NUNCA se supone España.
 */
export interface PaisISO {
    /** ISO 3166-1 alfa-2 (XK para Kosovo). */
    codigo: string;
    /** Nombre en castellano, el de los selectores de la suite. */
    nombre: string;
}
/** Todos los países, ordenados por nombre en castellano. */
export declare const PAISES_ISO: readonly PaisISO[];
/** ¿Es un código ISO 3166-1 alfa-2 de la tabla? (mayúsculas exactas) */
export declare function esCodigoPais(codigo: unknown): boolean;
/**
 * El código ISO 3166-1 alfa-2 de un país escrito: «España» → ES, «paises
 * bajos» → NL, «United States» → US, «fr» → FR. null si no se reconoce (o si
 * viene vacío): nunca supone España.
 */
export declare function codigoPaisDe(texto: string | null | undefined): string | null;
/** El nombre en castellano de un código ISO (el que guarda `direccion.pais`): FR → «Francia». */
export declare function nombrePaisDe(codigo: string | null | undefined): string | null;
//# sourceMappingURL=pais.d.ts.map