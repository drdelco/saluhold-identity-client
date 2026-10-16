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
    facturaOrigen: {
        id: string;
        numero: string;
        fecha: string;
    } | null;
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
    facturaOrigen?: {
        id: string;
        numero: string;
        fecha: string;
    } | null;
    createdAt?: string | null;
}
/** Mayúsculas y sin separadores: la forma en la que se GUARDA. */
export declare function normalizarIban(valor: string | null | undefined): string;
/** De 4 en 4 para leerlo en pantalla: ES91 2100 0418 … */
export declare function formatearIban(valor: string | null | undefined): string;
/** ¿IBAN estructuralmente válido? País y longitud conocidos, y el dígito de control. */
export declare function esIbanValido(valor: string | null | undefined): boolean;
/** Una cuenta nueva, sin ningún `undefined`. */
export declare function crearCuenta(entrada: EntradaCuenta, ahora?: Date): CuentaBancaria;
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
export declare function normalizarCuentas(valor: unknown, actuales?: ReadonlyArray<Partial<CuentaBancaria>> | null, ahora?: Date): {
    cuentas: CuentaBancaria[];
    rechazados: string[];
};
export type ResultadoAltaCuenta = 'anadida' | 'ya_existia' | 'iban_invalido';
/**
 * Añade una cuenta CONSERVANDO las existentes (no muta la lista recibida). Un
 * IBAN ya registrado no se duplica: solo se marca verificado si la entrada lo
 * está (una persona lo ha confirmado). La primera queda predeterminada.
 */
export declare function anadirCuenta(actuales: ReadonlyArray<CuentaBancaria> | null | undefined, entrada: EntradaCuenta, ahora?: Date): {
    cuentas: CuentaBancaria[];
    resultado: ResultadoAltaCuenta;
};
/** Cotejo del IBAN de una factura contra las cuentas conocidas del proveedor. */
export type EstadoIban = 'sin_iban' | 'primera' | 'conocido' | 'discrepante';
export declare function evaluarIban(ibanFactura: string | null | undefined, conocidas: ReadonlyArray<{
    iban?: string | null;
}> | null | undefined): EstadoIban;
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
export declare function decidirRegistroDeCuenta(actuales: ReadonlyArray<CuentaBancaria> | null | undefined, entrada: EntradaCuenta & {
    confirmada?: boolean | null;
}, ahora?: Date): {
    resultado: ResultadoRegistroCuenta;
    cuentas: CuentaBancaria[];
    escribir: boolean;
};
//# sourceMappingURL=cuentasBancarias.d.ts.map