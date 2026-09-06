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

/** Letras de control del DNI, en el orden que exige el algoritmo (resto % 23). */
const LETRAS_CONTROL = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Primera letra del NIE y su valor numérico. */
const PREFIJO_NIE: Record<string, string> = { X: '0', Y: '1', Z: '2' };

export type TipoIdentificador = 'DNI' | 'NIE' | 'PASAPORTE' | 'CIF' | 'PROVISIONAL' | 'OTRO';

export type ResultadoValidacion =
  /** DNI o NIE con letra de control correcta. */
  | { estado: 'valido'; tipo: 'DNI' | 'NIE'; normalizado: string }
  /** DNI o NIE cuya letra NO corresponde al número: hay una errata. */
  | { estado: 'invalido'; tipo: 'DNI' | 'NIE'; normalizado: string; letraEsperada: string; mensaje: string }
  /** No es comprobable (pasaporte, CIF, provisional, vacío): NO es un error. */
  | { estado: 'no-aplica'; tipo: TipoIdentificador; normalizado: string };

/** Mayúsculas y sin separadores. Es la forma en la que se ALMACENA. */
export function normalizarIdentificador(valor: string | null | undefined): string {
  return String(valor || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-(?!\d)/g, '');
}

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
export function tipoDeIdentificador(valor: string | null | undefined): TipoIdentificador {
  const v = canonizarIdentificador(valor);
  if (!v) return 'OTRO';
  if (/^PEND-?\d+$/.test(v)) return 'PROVISIONAL';
  if (/^\d{8}[A-Z]$/.test(v)) return 'DNI';
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) return 'NIE';
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) return 'CIF';
  return 'PASAPORTE';
}

/** Letra que corresponde a un número de DNI/NIE (ya convertido a 8 dígitos). */
function letraDe(numero: string): string {
  return LETRAS_CONTROL[parseInt(numero, 10) % 23];
}

/**
 * Comprueba el identificador.
 *
 * Solo dictamina sobre DNI y NIE. Todo lo demás sale como `no-aplica`, que
 * significa "no tengo forma de saberlo", no "está mal".
 */
export function validarIdentificador(valor: string | null | undefined): ResultadoValidacion {
  // Se valida sobre la forma canónica, la misma que se almacena: si no, un DNI
  // sin el cero inicial escaparía a la comprobación.
  const normalizado = canonizarIdentificador(valor);
  const tipo = tipoDeIdentificador(normalizado);

  if (tipo === 'DNI') {
    const numero = normalizado.slice(0, 8);
    const letra = normalizado.slice(8);
    const esperada = letraDe(numero);
    if (letra === esperada) return { estado: 'valido', tipo: 'DNI', normalizado };
    return {
      estado: 'invalido',
      tipo: 'DNI',
      normalizado,
      letraEsperada: esperada,
      mensaje: `La letra del DNI no corresponde al número: ${numero} termina en ${esperada}, no en ${letra}.`,
    };
  }

  if (tipo === 'NIE') {
    // La letra inicial se sustituye por su dígito y el resto es idéntico al DNI.
    const numero = PREFIJO_NIE[normalizado[0]] + normalizado.slice(1, 8);
    const letra = normalizado.slice(8);
    const esperada = letraDe(numero);
    if (letra === esperada) return { estado: 'valido', tipo: 'NIE', normalizado };
    return {
      estado: 'invalido',
      tipo: 'NIE',
      normalizado,
      letraEsperada: esperada,
      mensaje: `La letra del NIE no corresponde al número: debería terminar en ${esperada}, no en ${letra}.`,
    };
  }

  return { estado: 'no-aplica', tipo, normalizado };
}

/** Atajo booleano para condiciones. `no-aplica` cuenta como aceptable. */
export function identificadorAceptable(valor: string | null | undefined): boolean {
  return validarIdentificador(valor).estado !== 'invalido';
}

/**
 * Forma canónica para almacenar: mayúsculas, sin separadores y con el número
 * padeado a 8 dígitos.
 *
 * El padding importa más de lo que parece: `5004388W` y `05004388W` son el
 * mismo DNI, y sin normalizar se crean dos fichas de la misma persona que
 * ninguna búsqueda relaciona.
 */
export function canonizarIdentificador(valor: string | null | undefined): string {
  const v = normalizarIdentificador(valor);
  if (!v) return '';

  const dni = v.match(/^(\d+)([A-Z])$/);
  if (dni) return dni[1].padStart(8, '0') + dni[2];

  const nie = v.match(/^([XYZ])(\d+)([A-Z])$/);
  if (nie) return nie[1] + nie[2].padStart(7, '0') + nie[3];

  return v;
}
