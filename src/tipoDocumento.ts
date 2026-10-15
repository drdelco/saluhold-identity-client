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

import { canonizarIdentificador, normalizarIdentificador } from './identificador';

/** Los valores que se guardan en `tipoIdentificador`. Ninguno más. */
export const TIPOS_IDENTIFICADOR = [
  'DNI',
  'NIE',
  'NIF',
  'NIF_IVA',
  'PASAPORTE',
  'DOCUMENTO_PAIS',
  'CERTIFICADO_RESIDENCIA',
  'OTRO_DOCUMENTO',
  'NO_CENSADO',
  'OTRO',
  'PROVISIONAL',
] as const;

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

const AMBAS: readonly EntidadDocumento[] = ['paciente', 'empresa'];

/** En el orden en que se ofrecen: lo español primero, lo frecuente antes. */
export const OPCIONES_TIPO_IDENTIFICADOR: readonly OpcionTipoIdentificador[] = [
  { valor: 'DNI', etiqueta: 'DNI', ayuda: 'Documento Nacional de Identidad español: 8 cifras y letra.', idTypeAeat: null, elegible: true, para: AMBAS },
  { valor: 'NIE', etiqueta: 'NIE', ayuda: 'Número de Identidad de Extranjero: X, Y o Z, 7 cifras y letra.', idTypeAeat: null, elegible: true, para: AMBAS },
  { valor: 'NIF', etiqueta: 'NIF de empresa o entidad (CIF)', ayuda: 'NIF español de una sociedad, asociación o entidad (el antiguo CIF), o un NIF K, L o M.', idTypeAeat: null, elegible: true, para: AMBAS },
  { valor: 'NIF_IVA', etiqueta: 'NIF-IVA de otro país de la UE', ayuda: 'Número de IVA intracomunitario, con el prefijo del país y sin espacios (FR12345678901).', idTypeAeat: '02', elegible: true, para: AMBAS },
  { valor: 'PASAPORTE', etiqueta: 'Pasaporte', ayuda: 'Pasaporte de cualquier país.', idTypeAeat: '03', elegible: true, para: AMBAS },
  { valor: 'DOCUMENTO_PAIS', etiqueta: 'Documento de identidad de su país', ayuda: 'Documento oficial de identificación expedido por el país donde reside (no español).', idTypeAeat: '04', elegible: true, para: AMBAS },
  { valor: 'CERTIFICADO_RESIDENCIA', etiqueta: 'Certificado de residencia', ayuda: 'Certificado de residencia fiscal expedido por su país.', idTypeAeat: '05', elegible: true, para: AMBAS },
  { valor: 'OTRO_DOCUMENTO', etiqueta: 'Otro documento acreditativo', ayuda: 'Cualquier otro documento que acredite su identidad (p. ej. el número fiscal de una empresa de fuera de la UE).', idTypeAeat: '06', elegible: true, para: AMBAS },
  { valor: 'NO_CENSADO', etiqueta: 'NIF no censado en Hacienda', ayuda: 'Persona con DNI o NIE español que no está dada de alta en el censo de la AEAT.', idTypeAeat: '07', elegible: true, para: AMBAS },
  { valor: 'OTRO', etiqueta: 'Otro (sin especificar)', ayuda: 'Tipo sin concretar, de antes. Para facturar hay que elegir uno de la lista.', idTypeAeat: null, elegible: false, para: AMBAS },
  { valor: 'PROVISIONAL', etiqueta: 'Provisional (sin documento)', ayuda: 'Ficha creada sin documento. Se completa escribiendo su documento.', idTypeAeat: null, elegible: false, para: ['paciente'] },
];

const POR_VALOR = new Map<string, OpcionTipoIdentificador>(OPCIONES_TIPO_IDENTIFICADOR.map((o) => [o.valor, o]));

/** ¿Es uno de los valores del vocabulario? (mayúsculas exactas, como se guarda) */
export function esTipoIdentificador(valor: unknown): valor is TipoIdentificador {
  return typeof valor === 'string' && POR_VALOR.has(valor);
}

/** Etiqueta para pintar un valor guardado; el propio valor si no es del vocabulario. */
export function etiquetaTipoIdentificador(valor: string | null | undefined): string {
  if (!valor) return '';
  return POR_VALOR.get(valor)?.etiqueta ?? valor;
}

/** IDType de la AEAT de un valor guardado (null: NIF español, OTRO, PROVISIONAL o desconocido). */
export function idTypeAeatDe(valor: string | null | undefined): IdTypeAeat | null {
  return (valor && POR_VALOR.get(valor)?.idTypeAeat) || null;
}

/** ¿Se declara en <NIF> (documento español con NIF censado)? */
export function esNifEspanol(valor: string | null | undefined): boolean {
  return valor === 'DNI' || valor === 'NIE' || valor === 'NIF';
}

/**
 * Las opciones de un selector, en la forma de Mantine (`value`, `label`,
 * `description`). Solo las elegibles para esa ficha y, si el valor actual no lo
 * es (OTRO, PROVISIONAL), también él: un selector que no puede enseñar lo que
 * hay guardado lo «cambia» al abrirse.
 */
export function opcionesTipoIdentificador(
  entidad: EntidadDocumento,
  actual?: string | null,
): { value: string; label: string; description: string }[] {
  return OPCIONES_TIPO_IDENTIFICADOR
    .filter((o) => o.para.includes(entidad) && (o.elegible || o.valor === actual))
    .map((o) => ({ value: o.valor, label: o.etiqueta, description: o.ayuda }));
}

// ── NIF-IVA ─────────────────────────────────────────────────────────────────

/**
 * Estructura del NIF-IVA de cada Estado miembro (sin el prefijo): tabla
 * «Estructura NIF-IVA» de las Validaciones VERI*FACTU de la AEAT (v1.2.2, con
 * Croacia desde la 1.1.0). Es la misma que usa SaluFact al emitir. Grecia usa el
 * prefijo EL e Irlanda del Norte XI.
 *
 * Fuera a propósito: ES (un NIF español va como DNI, NIE o NIF) y GB (desde el
 * 1-1-2021 el Reino Unido no tiene NIF-IVA comunitario; solo Irlanda del Norte,
 * con XI). Sin consultar el VIES: se comprueba la forma, no que esté de alta.
 */
const ESTRUCTURAS_NIF_IVA: Record<string, RegExp> = {
  AT: /^[A-Z0-9]{9}$/, BE: /^\d{10}$/, BG: /^\d{9,10}$/, CY: /^[A-Z0-9]{9}$/, CZ: /^\d{8,10}$/,
  DE: /^\d{9}$/, DK: /^\d{8}$/, EE: /^\d{9}$/, EL: /^\d{9}$/, FI: /^\d{8}$/, FR: /^[A-Z0-9]{11}$/,
  HR: /^\d{11}$/, HU: /^\d{8}$/, IE: /^[A-Z0-9]{8,9}$/, IT: /^\d{11}$/, LT: /^(\d{9}|\d{12})$/,
  LU: /^\d{8}$/, LV: /^\d{11}$/, MT: /^\d{8}$/, NL: /^[A-Z0-9]{12}$/, PL: /^\d{10}$/, PT: /^\d{9}$/,
  RO: /^[1-9]\d{1,9}$/, SE: /^\d{12}$/, SI: /^\d{8}$/, SK: /^\d{10}$/,
  XI: /^([A-Z0-9]{5}|[A-Z0-9]{9}|[A-Z0-9]{12})$/,
};

/** Prefijos de NIF-IVA admitidos (los 26 Estados miembro distintos de España, con EL, y XI). */
export const PREFIJOS_NIF_IVA: readonly string[] = Object.keys(ESTRUCTURAS_NIF_IVA);

/** País ISO 3166-1 alfa-2 de un NIF-IVA, por su prefijo (EL → GR, XI → GB). null si no lo es. */
export function paisDeNifIva(valor: string | null | undefined): string | null {
  const prefijo = String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
  if (!ESTRUCTURAS_NIF_IVA[prefijo]) return null;
  if (prefijo === 'EL') return 'GR';
  if (prefijo === 'XI') return 'GB';
  return prefijo;
}

// ── NIF de entidad (CIF) ────────────────────────────────────────────────────

/** Primeras letras de un NIF de entidad. */
const LETRAS_ENTIDAD = 'ABCDEFGHJNPQRSUVW';
/** Las que llevan siempre LETRA de control… */
const CONTROL_LETRA = 'NPQRSW';
/** …y las que llevan siempre CIFRA. Las demás admiten las dos. */
const CONTROL_CIFRA = 'ABEH';
const LETRAS_CONTROL_ENTIDAD = 'JABCDEFGHI';
const LETRAS_CONTROL_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Carácter de control de un NIF de entidad (letra + 7 cifras): [cifra, letra]. */
function controlEntidad(siete: string): [string, string] {
  let suma = 0;
  for (let i = 0; i < 7; i++) {
    const d = Number(siete[i]);
    if (i % 2 === 1) suma += d;
    else { const doble = d * 2; suma += Math.floor(doble / 10) + (doble % 10); }
  }
  const c = (10 - (suma % 10)) % 10;
  return [String(c), LETRAS_CONTROL_ENTIDAD[c]];
}

/** Mensaje si el NIF de entidad o K/L/M no cuadra; null si está bien. */
function errorNifEntidad(v: string): string | null {
  const klm = v.match(/^([KLM])(\d{7})([A-Z])$/);
  if (klm) {
    const esperada = LETRAS_CONTROL_DNI[parseInt(klm[2], 10) % 23];
    return klm[3] === esperada ? null : `La letra del NIF no corresponde al número: debería terminar en ${esperada}, no en ${klm[3]}.`;
  }
  const m = v.match(/^([A-Z])(\d{7})([0-9A-J])$/);
  if (!m || !LETRAS_ENTIDAD.includes(m[1])) {
    return 'No es un NIF de empresa o entidad: es una letra, 7 cifras y un carácter de control (B12345674).';
  }
  const [cifra, letra] = controlEntidad(m[2]);
  const puesto = m[3];
  const vale = CONTROL_LETRA.includes(m[1]) ? puesto === letra
    : CONTROL_CIFRA.includes(m[1]) ? puesto === cifra
      : puesto === cifra || puesto === letra;
  if (vale) return null;
  const esperado = CONTROL_LETRA.includes(m[1]) ? letra : CONTROL_CIFRA.includes(m[1]) ? cifra : `${cifra} o ${letra}`;
  return `El carácter de control del NIF no corresponde: debería terminar en ${esperado}, no en ${puesto}.`;
}

/** Mensaje si el DNI o NIE no cuadra con su letra (o no tiene esa forma); null si está bien. */
function errorDniNie(v: string, tipo: 'DNI' | 'NIE'): string | null {
  if (tipo === 'DNI') {
    if (!/^\d{8}[A-Z]$/.test(v)) return 'No es un DNI: son 8 cifras y una letra.';
    const esperada = LETRAS_CONTROL_DNI[parseInt(v.slice(0, 8), 10) % 23];
    return v[8] === esperada ? null
      : `La letra del DNI no corresponde al número: ${v.slice(0, 8)} termina en ${esperada}, no en ${v[8]}.`;
  }
  if (!/^[XYZ]\d{7}[A-Z]$/.test(v)) return 'No es un NIE: es X, Y o Z, 7 cifras y una letra.';
  const numero = String('XYZ'.indexOf(v[0])) + v.slice(1, 8);
  const esperada = LETRAS_CONTROL_DNI[parseInt(numero, 10) % 23];
  return v[8] === esperada ? null
    : `La letra del NIE no corresponde al número: debería terminar en ${esperada}, no en ${v[8]}.`;
}

// ── Validación por tipo ─────────────────────────────────────────────────────

/** Longitud máxima de un documento extranjero: la del ID de IDOtro (XSD TextMax20). */
export const LARGO_MAXIMO_DOCUMENTO = 20;
const LARGO_MINIMO_DOCUMENTO = 3;

export type ResultadoDocumento =
  | { valido: true; tipo: TipoIdentificador; normalizado: string }
  | { valido: false; tipo: TipoIdentificador; normalizado: string; mensaje: string };

/** Forma en la que se GUARDA el número de un documento de ese tipo. */
export function normalizarDocumento(tipo: TipoIdentificador, valor: string | null | undefined): string {
  if (tipo === 'NIF_IVA') return String(valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (tipo === 'DNI' || tipo === 'NIE' || tipo === 'NIF' || tipo === 'NO_CENSADO') return canonizarIdentificador(valor);
  return normalizarIdentificador(valor);
}

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
export function validarDocumento(tipo: TipoIdentificador, valor: string | null | undefined): ResultadoDocumento {
  const normalizado = normalizarDocumento(tipo, valor);
  const mal = (mensaje: string): ResultadoDocumento => ({ valido: false, tipo, normalizado, mensaje });
  const bien: ResultadoDocumento = { valido: true, tipo, normalizado };
  if (!normalizado) return mal('Falta el número del documento.');

  switch (tipo) {
    case 'DNI':
    case 'NIE': {
      const e = errorDniNie(normalizado, tipo);
      return e ? mal(e) : bien;
    }
    case 'NIF': {
      if (/^\d{8}[A-Z]$/.test(normalizado)) return mal('Es un DNI: elija «DNI» como tipo de documento.');
      if (/^[XYZ]\d{7}[A-Z]$/.test(normalizado)) return mal('Es un NIE: elija «NIE» como tipo de documento.');
      const e = errorNifEntidad(normalizado);
      return e ? mal(e) : bien;
    }
    case 'NO_CENSADO': {
      if (/^\d{8}[A-Z]$/.test(normalizado)) { const e = errorDniNie(normalizado, 'DNI'); return e ? mal(e) : bien; }
      if (/^[XYZ]\d{7}[A-Z]$/.test(normalizado)) { const e = errorDniNie(normalizado, 'NIE'); return e ? mal(e) : bien; }
      if (/^[KLM]\d{7}[A-Z]$/.test(normalizado)) { const e = errorNifEntidad(normalizado); return e ? mal(e) : bien; }
      return mal('«NIF no censado» es para una persona con DNI o NIE español (o NIF K, L o M).');
    }
    case 'NIF_IVA': {
      const prefijo = normalizado.slice(0, 2);
      if (prefijo === 'ES') return mal('Un NIF español no es un NIF-IVA de otro país: elija DNI, NIE o NIF.');
      if (prefijo === 'GB') {
        return mal('El Reino Unido no tiene NIF-IVA comunitario desde 2021 (solo Irlanda del Norte, con el prefijo XI). Elija otro tipo de documento.');
      }
      const regla = ESTRUCTURAS_NIF_IVA[prefijo];
      if (!/^[A-Z]{2}/.test(normalizado) || !regla) {
        return mal('El NIF-IVA empieza por el código del país de la UE (FR, DE, IT, PT…) seguido del número, sin espacios.');
      }
      if (!regla.test(normalizado.slice(2))) {
        return mal(`El NIF-IVA no tiene la forma de los de su país (${prefijo}). Revise que el número esté completo y sin espacios.`);
      }
      return bien;
    }
    case 'PROVISIONAL':
      return /^PEND-\d+$/.test(normalizado) ? bien
        : mal('«Provisional» es solo para fichas sin documento: elija el tipo del documento que va a escribir.');
    default: {
      if (normalizado.length < LARGO_MINIMO_DOCUMENTO || normalizado.length > LARGO_MAXIMO_DOCUMENTO) {
        return mal(`El número del documento tiene que tener entre ${LARGO_MINIMO_DOCUMENTO} y ${LARGO_MAXIMO_DOCUMENTO} letras o cifras.`);
      }
      if (/^PEND-/.test(normalizado)) return mal('Un número provisional (PEND-…) no es un documento.');
      return bien;
    }
  }
}

/**
 * El tipo que corresponde a la FORMA del número, cuando nadie lo ha elegido.
 * null si la forma no lo dice (cualquier cosa que no sea española).
 */
export function tipoPorForma(valor: string | null | undefined): TipoIdentificador | null {
  const v = canonizarIdentificador(valor);
  if (!v) return null;
  if (/^PEND-?\d+$/.test(v)) return 'PROVISIONAL';
  if (/^\d{8}[A-Z]$/.test(v)) return 'DNI';
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) return 'NIE';
  if (/^[KLM]\d{7}[A-Z]$/.test(v)) return 'NIF';
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) return 'NIF';
  return null;
}

/** Tipos cuyo número no deja deducir el tipo: si ya está guardado uno de estos, se conserva. */
const TIPOS_NO_DEDUCIBLES: readonly TipoIdentificador[] = [
  'NIF_IVA', 'PASAPORTE', 'DOCUMENTO_PAIS', 'CERTIFICADO_RESIDENCIA', 'OTRO_DOCUMENTO', 'OTRO',
];

export type ResolucionDocumento =
  | { ok: true; tipo: TipoIdentificador; normalizado: string }
  | { ok: false; mensaje: string };

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
export function resolverDocumento(entrada: {
  entidad: EntidadDocumento;
  valor: string | null | undefined;
  /** El tipo elegido. undefined/null/'' = nadie lo ha elegido. */
  tipo?: string | null;
  /** El tipo que ya tiene la ficha (en una edición). */
  tipoActual?: string | null;
}): ResolucionDocumento {
  const { entidad, valor } = entrada;
  const pedido = String(entrada.tipo ?? '').trim().toUpperCase();
  const actual = String(entrada.tipoActual ?? '').trim().toUpperCase();

  if (pedido) {
    if (!esTipoIdentificador(pedido)) return { ok: false, mensaje: 'El tipo de documento no es válido.' };
    const opcion = POR_VALOR.get(pedido)!;
    if (!opcion.para.includes(entidad)) {
      return { ok: false, mensaje: `«${opcion.etiqueta}» no es un tipo de documento para una ${entidad === 'empresa' ? 'empresa' : 'ficha de paciente'}.` };
    }
    if (pedido === 'OTRO' && actual !== 'OTRO') {
      return { ok: false, mensaje: 'Elija el tipo concreto del documento (pasaporte, documento de su país…).' };
    }
    const r = validarDocumento(pedido, valor);
    return r.valido ? { ok: true, tipo: pedido, normalizado: r.normalizado } : { ok: false, mensaje: r.mensaje };
  }

  const porForma = tipoPorForma(valor);
  if (porForma === 'PROVISIONAL' && entidad === 'empresa') {
    return { ok: false, mensaje: 'Una empresa no puede tener un número provisional.' };
  }
  if (porForma) {
    const r = validarDocumento(porForma, valor);
    return r.valido ? { ok: true, tipo: porForma, normalizado: r.normalizado } : { ok: false, mensaje: r.mensaje };
  }

  if (esTipoIdentificador(actual) && TIPOS_NO_DEDUCIBLES.includes(actual)) {
    const r = validarDocumento(actual, valor);
    if (r.valido) return { ok: true, tipo: actual, normalizado: r.normalizado };
  }

  if (entidad === 'paciente') {
    const r = validarDocumento('PASAPORTE', valor);
    return r.valido ? { ok: true, tipo: 'PASAPORTE', normalizado: r.normalizado } : { ok: false, mensaje: r.mensaje };
  }
  return {
    ok: false,
    mensaje: 'Indique el tipo de documento de la empresa (NIF-IVA, documento de su país, otro documento…): por el número no se puede saber.',
  };
}
