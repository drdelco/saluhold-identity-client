// cuentasBancarias.ts — las cuentas bancarias de una ficha de Identity (0.12.0).
//
// `empresas.cuentasBancarias[]` y `pacientes.cuentasBancarias[]` (una persona
// física que factura, un autónomo, es tan proveedor como una sociedad).
//
// UN SOLO SITIO para la regla. Vivía triplicada —Identity, las functions de
// SaluFact y su frontend— y el canónico de Identity guardaba las cuentas TAL
// CUAL: el día que SaluFact pasara a escribir por él, la garantía bajaba. Ahora
// la aplica Identity (en sus canónicos) y la pueden usar los frontales para
// avisar antes de mandar. No importa nada: corre en el navegador y en servidor.
//
// Lo que impone:
//   - IBAN normalizado (mayúsculas, sin separadores) y VÁLIDO: longitud del
//     país y dígito de control (ISO 13616, mod-97). El OCR de una factura
//     escaneada falla un dígito, y un IBAN casi bueno es una transferencia
//     perdida.
//   - Sin duplicados, y exactamente UNA predeterminada mientras haya alguna.
//   - La lista es un HISTÓRICO, no un campo: añadir nunca sustituye. Un
//     proveedor que de pronto factura con otro IBAN es la señal nº 1 del
//     fraude de suplantación, y solo se detecta si se conservan las cuentas
//     conocidas y se pregunta a una persona antes de añadir otra
//     (`decidirRegistroDeCuenta`). Lo que haya en la ficha es lo que se paga.

/** Una cuenta de la lista. Fechas en ISO: Firestore no admite serverTimestamp dentro de un array. */
export interface CuentaBancaria {
  id: string;
  /** Normalizado: mayúsculas, sin espacios. */
  iban: string;
  /** «BBVA principal», «Cuenta de domiciliación»… */
  alias: string | null;
  /** Si difiere de la razón social. */
  titular: string | null;
  /** La que se ofrece por defecto para pagar. */
  predeterminada: boolean;
  /** Alta a mano o leída de una factura. */
  origen: 'manual' | 'ia';
  /** Confirmada por una persona. */
  verificada: boolean;
  /** Factura de la que salió («¿de dónde salió este IBAN?»). */
  facturaOrigen: { id: string; numero: string; fecha: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** Lo que llega de un formulario o de la lectura de una factura. */
export interface EntradaCuenta {
  id?: string | null;
  iban: string;
  alias?: string | null;
  titular?: string | null;
  predeterminada?: boolean | null;
  origen?: 'manual' | 'ia' | null;
  verificada?: boolean | null;
  facturaOrigen?: { id: string; numero: string; fecha: string } | null;
  createdAt?: string | null;
}

/** Longitudes oficiales por país (los que aparecen en las facturas de la suite). */
const LONGITUD_IBAN: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18,
  EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GI: 23, GR: 27, HR: 21, HU: 28,
  IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31,
  NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27,
};

/** Mayúsculas y sin separadores: la forma en la que se GUARDA. */
export function normalizarIban(valor: string | null | undefined): string {
  return String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** De 4 en 4 para leerlo en pantalla: ES91 2100 0418 … */
export function formatearIban(valor: string | null | undefined): string {
  return normalizarIban(valor).replace(/(.{4})/g, '$1 ').trim();
}

/** Resto de dividir el IBAN reordenado entre 97, por trozos (no cabe en un double). Debe dar 1. */
function mod97(iban: string): number {
  const reordenado = iban.slice(4) + iban.slice(0, 4);
  const numerico = reordenado.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let resto = 0;
  for (const digito of numerico) resto = (resto * 10 + Number(digito)) % 97;
  return resto;
}

/** ¿IBAN estructuralmente válido? País y longitud conocidos, y el dígito de control. */
export function esIbanValido(valor: string | null | undefined): boolean {
  const iban = normalizarIban(valor);
  if (iban.length < 15 || iban.length > 34) return false;
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return false;
  const esperada = LONGITUD_IBAN[iban.slice(0, 2)];
  if (esperada && iban.length !== esperada) return false;
  return mod97(iban) === 1;
}

/** Un id nuevo: `crypto.randomUUID` (Node ≥ 19 y navegadores) y, si no lo hay, uno v4 al azar. */
function idNuevo(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (x) => {
    const r = Math.floor(Math.random() * 16);
    return (x === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

const textoONull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Una cuenta nueva, sin ningún `undefined`. */
export function crearCuenta(entrada: EntradaCuenta, ahora: Date = new Date()): CuentaBancaria {
  const iso = ahora.toISOString();
  return {
    id: textoONull(entrada.id) || idNuevo(),
    iban: normalizarIban(entrada.iban),
    alias: textoONull(entrada.alias),
    titular: textoONull(entrada.titular),
    predeterminada: entrada.predeterminada === true,
    origen: entrada.origen === 'ia' ? 'ia' : 'manual',
    verificada: entrada.verificada === true,
    facturaOrigen: entrada.facturaOrigen || null,
    createdAt: textoONull(entrada.createdAt) || iso,
    updatedAt: iso,
  };
}

/** Exactamente una predeterminada: la primera marcada, o la primera si ninguna lo está. Muta y devuelve. */
function fijarPredeterminada(cuentas: CuentaBancaria[]): CuentaBancaria[] {
  if (!cuentas.length) return cuentas;
  const marcada = cuentas.findIndex((c) => c.predeterminada);
  const elegida = marcada >= 0 ? marcada : 0;
  cuentas.forEach((c, i) => { c.predeterminada = i === elegida; });
  return cuentas;
}

/**
 * La lista completa que manda un formulario, saneada: fuera las filas vacías,
 * los IBAN inválidos (devueltos en `rechazados`, para avisar en vez de
 * perderlos en silencio) y los duplicados; una predeterminada.
 *
 * Con `actuales` (la lista guardada), una cuenta que ya estaba CONSERVA lo que
 * la ficha sabía de ella —su id, su origen, la factura de la que salió, su alta
 * y si alguien la verificó— aunque el formulario no lo reenvíe: editar el alias
 * no puede borrar el rastro de dónde salió un IBAN. Si no cambia nada, tampoco
 * su `updatedAt`.
 */
export function normalizarCuentas(
  valor: unknown,
  actuales?: ReadonlyArray<Partial<CuentaBancaria>> | null,
  ahora: Date = new Date(),
): { cuentas: CuentaBancaria[]; rechazados: string[] } {
  if (!Array.isArray(valor)) return { cuentas: [], rechazados: [] };
  const guardadas = new Map<string, Partial<CuentaBancaria>>();
  for (const c of actuales || []) {
    const iban = normalizarIban(c?.iban);
    if (iban && !guardadas.has(iban)) guardadas.set(iban, c);
  }

  const cuentas: CuentaBancaria[] = [];
  const rechazados: string[] = [];
  const vistos = new Set<string>();
  for (const bruto of valor as Array<EntradaCuenta | null | undefined>) {
    const iban = normalizarIban(bruto?.iban);
    if (!iban) continue;
    if (!esIbanValido(iban)) { rechazados.push(iban); continue; }
    if (vistos.has(iban)) continue;
    vistos.add(iban);
    const entrada = bruto as EntradaCuenta;
    const previa = guardadas.get(iban);
    if (!previa) {
      cuentas.push(crearCuenta({ ...entrada, iban }, ahora));
      continue;
    }
    const base = crearCuenta({
      id: previa.id || entrada.id,
      iban,
      alias: entrada.alias !== undefined ? entrada.alias : previa.alias,
      titular: entrada.titular !== undefined ? entrada.titular : previa.titular,
      predeterminada: entrada.predeterminada === true,
      origen: previa.origen === 'ia' ? 'ia' : 'manual',
      verificada: previa.verificada === true || entrada.verificada === true,
      facturaOrigen: previa.facturaOrigen || null,
      createdAt: previa.createdAt || entrada.createdAt,
    }, ahora);
    const cambia = base.alias !== (previa.alias ?? null) || base.titular !== (previa.titular ?? null)
      || base.verificada !== (previa.verificada === true);
    if (!cambia && typeof previa.updatedAt === 'string') base.updatedAt = previa.updatedAt;
    cuentas.push(base);
  }
  return { cuentas: fijarPredeterminada(cuentas), rechazados };
}

export type ResultadoAltaCuenta = 'anadida' | 'ya_existia' | 'iban_invalido';

/**
 * Añade una cuenta CONSERVANDO las existentes (no muta la lista recibida). Un
 * IBAN ya registrado no se duplica: solo se marca verificado si la entrada lo
 * está (una persona lo ha confirmado). La primera queda predeterminada.
 */
export function anadirCuenta(
  actuales: ReadonlyArray<CuentaBancaria> | null | undefined,
  entrada: EntradaCuenta,
  ahora: Date = new Date(),
): { cuentas: CuentaBancaria[]; resultado: ResultadoAltaCuenta } {
  const lista = Array.isArray(actuales) ? actuales.map((c) => ({ ...c })) : [];
  const iban = normalizarIban(entrada.iban);
  if (!esIbanValido(iban)) return { cuentas: lista, resultado: 'iban_invalido' };

  const existente = lista.find((c) => normalizarIban(c.iban) === iban);
  if (existente) {
    if (entrada.verificada === true && !existente.verificada) {
      existente.verificada = true;
      existente.updatedAt = ahora.toISOString();
    }
    return { cuentas: fijarPredeterminada(lista), resultado: 'ya_existia' };
  }
  lista.push(crearCuenta({ ...entrada, iban, predeterminada: lista.length === 0 }, ahora));
  return { cuentas: fijarPredeterminada(lista), resultado: 'anadida' };
}

/** Cotejo del IBAN de una factura contra las cuentas conocidas del proveedor. */
export type EstadoIban =
  | 'sin_iban'       // la factura no traía IBAN legible
  | 'primera'        // el proveedor no tenía ninguna cuenta
  | 'conocido'       // coincide con una ya registrada
  | 'discrepante';   // tiene cuentas y esta NO es ninguna de ellas

export function evaluarIban(
  ibanFactura: string | null | undefined,
  conocidas: ReadonlyArray<{ iban?: string | null }> | null | undefined,
): EstadoIban {
  const iban = normalizarIban(ibanFactura);
  if (!iban) return 'sin_iban';
  const lista = Array.isArray(conocidas) ? conocidas : [];
  if (!lista.length) return 'primera';
  return lista.some((c) => normalizarIban(c?.iban) === iban) ? 'conocido' : 'discrepante';
}

export type ResultadoRegistroCuenta = ResultadoAltaCuenta | 'requiere_confirmacion';

/**
 * LA POLÍTICA ANTIFRAUDE de una cuenta que llega de fuera (la lectura de una
 * factura recibida, o una persona que la añade suelta). No relajarla:
 *
 *   · proveedor SIN cuentas          → se añade sola, sin verificar;
 *   · IBAN ya registrado             → no duplica (confirmado: se verifica);
 *   · proveedor CON otras cuentas    → NO se escribe y `requiere_confirmacion`,
 *                                      salvo que una persona lo confirme;
 *   · IBAN inválido                  → nunca se escribe.
 *
 * `escribir` dice si hay que guardar `cuentas`. La cuenta es `ia` si trae
 * `facturaOrigen` y `verificada` solo si viene confirmada.
 */
export function decidirRegistroDeCuenta(
  actuales: ReadonlyArray<CuentaBancaria> | null | undefined,
  entrada: EntradaCuenta & { confirmada?: boolean | null },
  ahora: Date = new Date(),
): { resultado: ResultadoRegistroCuenta; cuentas: CuentaBancaria[]; escribir: boolean } {
  const lista = Array.isArray(actuales) ? actuales.map((c) => ({ ...c })) : [];
  const iban = normalizarIban(entrada.iban);
  const confirmada = entrada.confirmada === true;
  if (!esIbanValido(iban)) return { resultado: 'iban_invalido', cuentas: lista, escribir: false };

  const yaEsta = lista.some((c) => normalizarIban(c.iban) === iban);
  if (!yaEsta && lista.length > 0 && !confirmada) {
    return { resultado: 'requiere_confirmacion', cuentas: lista, escribir: false };
  }
  const { cuentas, resultado } = anadirCuenta(lista, {
    iban,
    alias: entrada.alias ?? null,
    titular: entrada.titular ?? null,
    origen: entrada.facturaOrigen ? 'ia' : 'manual',
    verificada: confirmada,
    facturaOrigen: entrada.facturaOrigen || null,
  }, ahora);
  if (resultado === 'ya_existia' && !confirmada) return { resultado, cuentas, escribir: false };
  return { resultado, cuentas, escribir: resultado !== 'iban_invalido' };
}
