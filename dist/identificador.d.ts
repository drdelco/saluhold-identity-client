/**
 * identificador.ts — normalización y validación del identificador personal.
 *
 * FUENTE ÚNICA del ecosistema. Vive en el SDK compartido y no en cada app
 * porque el precedente está a la vista: `iban.ts` se copió a frontend y backend
 * de SaluFact y las dos copias ya han divergido. Un algoritmo duplicado no es
 * un algoritmo compartido; es dos algoritmos que empiezan iguales.
 *
 * Lo consumen los tres frontends (SaluFile, SaluFact, SaluFirst) y las Cloud
 * Functions de Identity, que es donde la validación es autoritativa.
 *
 * El DNI y el NIE llevan letra de control: se calcula a partir del número, así
 * que un dígito mal tecleado o mal leído por OCR produce una letra que no
 * cuadra y se detecta al instante. Es el mismo argumento que en `iban.ts` —un
 * IBAN con un dígito cambiado es una transferencia perdida—, y aquí pesa más
 * todavía: el NIF es el identificador ÚNICO UNIVERSAL del ecosistema. Un NIF
 * equivocado no es un campo con una errata; es un paciente que se duplica en
 * SaluFile, SaluFact y SaluFirst, y que a partir de ahí es muy caro de unir.
 *
 * NO TODO IDENTIFICADOR ES VALIDABLE, y por eso esto no devuelve un booleano:
 *   - Un PASAPORTE es alfanumérico libre, distinto en cada país. No hay nada
 *     que comprobar.
 *   - Un CIF de empresa lleva dígito de control, pero con OTRO algoritmo y otra
 *     tabla; aplicarle el del DNI lo marcaría inválido siempre.
 *   - Los provisionales `PEND-xxxx` son internos y no pretenden ser un NIF.
 * En los tres casos la respuesta correcta es "no procede", no "inválido".
 * Confundirlas convertiría la validación en un obstáculo que la gente
 * aprendería a saltarse, que es como mueren las validaciones.
 */
export type TipoIdentificador = 'DNI' | 'NIE' | 'PASAPORTE' | 'CIF' | 'PROVISIONAL' | 'OTRO';
export type ResultadoValidacion = 
/** DNI o NIE con letra de control correcta. */
{
    estado: 'valido';
    tipo: 'DNI' | 'NIE';
    normalizado: string;
}
/** DNI o NIE cuya letra NO corresponde al número: hay una errata. */
 | {
    estado: 'invalido';
    tipo: 'DNI' | 'NIE';
    normalizado: string;
    letraEsperada: string;
    mensaje: string;
}
/** No es comprobable (pasaporte, CIF, provisional, vacío): NO es un error. */
 | {
    estado: 'no-aplica';
    tipo: TipoIdentificador;
    normalizado: string;
};
/** Mayúsculas y sin separadores. Es la forma en la que se ALMACENA. */
export declare function normalizarIdentificador(valor: string | null | undefined): string;
/**
 * Tipo de identificador deducido del propio valor.
 *
 * Se deduce y no se pregunta porque el dato viene de sitios muy distintos
 * (teclado, lector de DNI, importación, otra app) y en la mitad de ellos nadie
 * ha elegido un tipo. La forma del identificador ya lo dice.
 *
 * Canoniza ANTES de clasificar: un DNI tecleado sin el cero inicial
 * ("5004388W") no cumple el patrón de 8 dígitos y se tomaría por pasaporte,
 * con lo que se libraría de la validación justo en el caso en que más falta
 * hace. El padding es parte de reconocerlo, no un adorno de presentación.
 */
export declare function tipoDeIdentificador(valor: string | null | undefined): TipoIdentificador;
/**
 * Comprueba el identificador.
 *
 * Solo dictamina sobre DNI y NIE. Todo lo demás sale como `no-aplica`, que
 * significa "no tengo forma de saberlo", no "está mal".
 */
export declare function validarIdentificador(valor: string | null | undefined): ResultadoValidacion;
/** Atajo booleano para condiciones. `no-aplica` cuenta como aceptable. */
export declare function identificadorAceptable(valor: string | null | undefined): boolean;
/**
 * Forma canónica para almacenar: mayúsculas, sin separadores y con el número
 * padeado a 8 dígitos.
 *
 * El padding importa más de lo que parece: `5004388W` y `05004388W` son el
 * mismo DNI, y sin normalizar se crean dos fichas de la misma persona que
 * ninguna búsqueda relaciona.
 */
export declare function canonizarIdentificador(valor: string | null | undefined): string;
//# sourceMappingURL=identificador.d.ts.map