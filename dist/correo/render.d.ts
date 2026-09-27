import { type AppCorreo, type TonoCaja } from './marcas';
import { type AcentoResuelto } from './color';
export type VarianteCorreo = 'A' | 'B' | 'C';
export interface TenantCorreo {
    nombre: string;
    /** PNG/JPG por https. Se pinta a 56 px de alto como máximo. */
    logoUrl?: string | null;
    /** Color del centro (`#rrggbb`). Si no llega a 4,5:1 sobre blanco se oscurece o se cae al de la app. */
    colorPrimario?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    web?: string | null;
}
/** Membrete de la variante B (por defecto, el nombre del tenant). */
export interface RemitenteCorreo {
    nombre: string;
    /** Especialidad, cargo o centro, en una línea. */
    detalle?: string | null;
}
export interface FilaDato {
    etiqueta: string;
    valor: string;
    /** Segunda línea, más pequeña, bajo el valor. */
    detalle?: string | null;
    /** Importe o dato principal: un punto más grande y en negrita. */
    destacado?: boolean;
    /** IBAN, códigos: letra de ancho fijo. */
    mono?: boolean;
}
export type CeldaRejilla = string | {
    texto: string;
    detalle?: string | null;
    fuerte?: boolean;
};
export type BloqueCorreo = {
    tipo: 'parrafo';
    texto: string;
    suave?: boolean;
} | {
    tipo: 'boton';
    texto: string;
    url: string;
    secundario?: boolean;
    alternativo?: boolean;
} | {
    tipo: 'tabla';
    filas: FilaDato[];
} | {
    tipo: 'rejilla';
    columnas: string[];
    filas: CeldaRejilla[][];
} | {
    tipo: 'lista';
    items: string[];
    titulo?: string | null;
    ordenada?: boolean;
} | {
    tipo: 'caja';
    tono?: TonoCaja;
    titulo?: string | null;
    texto?: string | null;
    filas?: FilaDato[];
} | {
    tipo: 'separador';
} | {
    tipo: 'firma';
    nombre: string;
    despedida?: string | null;
    detalle?: string | null;
} | {
    tipo: 'nota';
    texto: string;
};
export interface OpcionesCorreo {
    app: AppCorreo;
    variante: VarianteCorreo;
    /** Idioma del destinatario (dos letras). Pie, remitente y enlace alternativo salen en él. */
    idioma?: string | null;
    tenant?: TenantCorreo | null;
    /** Solo variante B: quién firma (por defecto, el tenant). */
    remitente?: RemitenteCorreo | null;
    /** Texto oculto que la bandeja muestra tras el asunto. */
    preheader?: string | null;
    titulo?: string | null;
    antetitulo?: string | null;
    bloques: BloqueCorreo[];
    /** Línea del pie antes de la marca («Recibe este correo porque…»). Ya en su idioma. */
    pieAviso?: string | null;
}
export interface CorreoRenderizado {
    html: string;
    text: string;
    /** Nombre del remitente (sin dirección): `{fromName} <salufile@saluhold.com>`. */
    fromName: string;
    meta: {
        idioma: string;
        dir: 'ltr' | 'rtl';
        acento: AcentoResuelto;
    };
}
/** Escapa texto para HTML (contenido y atributos). */
export declare function escaparHtml(valor: unknown): string;
/**
 * Compone un correo completo de la suite.
 *
 * @returns `html` (documento completo), `text` (alternativa sin HTML para el
 *          `text` de Resend) y `fromName` (sin la dirección).
 */
export declare function renderCorreo(o: OpcionesCorreo): CorreoRenderizado;
//# sourceMappingURL=render.d.ts.map