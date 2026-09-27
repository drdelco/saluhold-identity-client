import { type AppCorreo, type TonoCaja } from './marcas';
import { type AcentoResuelto } from './color';
export type VarianteCorreo = 'A' | 'B' | 'C';
export interface TenantCorreo {
    nombre: string;
    /**
     * PNG/JPG por https. En A, centrado arriba (56 px de alto como máximo); en C,
     * a la derecha de la marca de la app (40 px como máximo).
     */
    logoUrl?: string | null;
    /** Medidas naturales del logo (px), si se conocen: fijan `width`/`height` exactos (Outlook ignora `max-height`). */
    logoAncho?: number | null;
    logoAlto?: number | null;
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
/** Botón de un bloque `acciones`. */
export interface AccionCorreo {
    texto: string;
    url: string;
    /** `peligro`: borde y texto del semántico peligro, sin relleno («Cancelar cita»). */
    tono?: 'peligro' | null;
}
/** Enlace suelto (bajo la rejilla del ciclo, por ejemplo). */
export interface EnlaceCorreo {
    texto: string;
    url: string;
}
/** Paso de un bloque `pasos`. */
export interface PasoCorreo {
    titulo: string;
    texto?: string | null;
}
export type BloqueCorreo = {
    tipo: 'parrafo';
    texto: string;
    suave?: boolean;
}
/**
 * Un botón. El primero del correo es el primario (relleno) y lleva debajo su
 * dirección para copiar. Los demás —o uno con `secundario`— son botones
 * secundarios de verdad (borde y texto del acento, fondo blanco) y su enlace
 * alternativo va en la línea común del final. `enlace: true` lo pinta como
 * enlace de texto con flecha, para acciones de poco peso.
 */
 | {
    tipo: 'boton';
    texto: string;
    url: string;
    secundario?: boolean;
    enlace?: boolean;
    tono?: 'peligro' | null;
    alternativo?: boolean;
}
/**
 * Fila de botones que se apila en el móvil: el primero es el primario (si el
 * correo aún no tiene uno), los demás secundarios; `tono: 'peligro'` para
 * cancelar. Sus enlaces alternativos van en UNA línea al final del cuerpo:
 * «Si los botones no se muestran: Confirmar · Cancelar».
 */
 | {
    tipo: 'acciones';
    botones: AccionCorreo[];
}
/**
 * Módulo del ciclo menstrual del recordatorio de cita: título, texto y la
 * rejilla de fechas («Hoy», «Ayer»…) como botones pequeños secundarios, en
 * el acento del correo. `enlaces` va debajo en una línea («Otra fecha ·
 * Ya no tengo la regla»), y `nota` en letra pequeña.
 */
 | {
    tipo: 'ciclo';
    titulo: string;
    texto?: string | null;
    fechas: EnlaceCorreo[];
    enlaces?: EnlaceCorreo[];
    nota?: string | null;
    columnas?: 3 | 4;
}
/** Imagen centrada (QR, firma, imagen clave): `src` https o `cid:`. */
 | {
    tipo: 'imagen';
    src: string;
    alt: string;
    ancho?: number;
    pie?: string | null;
}
/**
 * Cuerpo con formato que escribe un profesional (comunicación, plantillas
 * del centro). Se sanea con `sanearHtmlCorreo`: ver la lista blanca allí.
 */
 | {
    tipo: 'htmlConfianza';
    html: string;
}
/** Lista numerada con título por paso («1. Descargue… 2. …»). */
 | {
    tipo: 'pasos';
    titulo?: string | null;
    items: PasoCorreo[];
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
    /**
     * A: el centro firma el correo (cabecera, color, pie).
     * B: membrete por defecto.
     * C: el centro desde el que se escribe, sin quitarle el protagonismo a la
     *    app: con `logoUrl`, su logo a la derecha de la cabecera; sin logo, su
     *    `nombre` en una línea gris bajo el título (o en el antetítulo, si el
     *    llamador lo pone ahí: entonces no se repite). Acento y pie, de la app.
     */
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
 * Sanea el HTML que escribe un profesional para meterlo en un correo.
 *
 * - Pasan `p, br, b, strong, i, em, u, ul, ol, li, a` SIN atributos (los
 *   estilos los pone el marco); `a` conserva solo un `href` https/mailto/tel.
 * - Titulares, `div`, `blockquote`, filas de tabla… se reducen a párrafo;
 *   `span`, `s`, celdas y demás etiquetas de formato en línea se desenvuelven.
 * - Cualquier otra etiqueta (script, style, iframe, img, svg, form…), un
 *   comentario o un `<` suelto se ESCAPA: se ve como texto, no se ejecuta.
 * - Las etiquetas se equilibran: un cierre sin apertura se ignora y lo que
 *   quede abierto se cierra al final, para que no se coma el resto del correo.
 */
export declare function sanearHtmlCorreo(html: unknown, opciones?: {
    accion?: string;
    rtl?: boolean;
}): string;
/**
 * Compone un correo completo de la suite.
 *
 * @returns `html` (documento completo), `text` (alternativa sin HTML para el
 *          `text` de Resend) y `fromName` (sin la dirección).
 */
export declare function renderCorreo(o: OpcionesCorreo): CorreoRenderizado;
//# sourceMappingURL=render.d.ts.map