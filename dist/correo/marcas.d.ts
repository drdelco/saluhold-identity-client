export type AppCorreo = 'saluFile' | 'saluFirst' | 'saluFact' | 'factronia' | 'saluHold';
export interface MarcaCorreo {
    /** Nombre comercial tal cual se escribe. */
    nombre: string;
    /** Wordmark en dos tramos, con el color de cada uno (como Branding.tsx). */
    wordmark: [{
        texto: string;
        color: string;
    }, {
        texto: string;
        color: string;
    }];
    /** Icono PNG cuadrado, 192 px, alojado en el dominio de la app. */
    iconoUrl: string;
    /** Web pública. */
    web: string;
    /** Color de marca puro: filete superior de la tarjeta (decorativo). */
    acento: string;
    /** Botones, enlaces y antetítulo: ≥ 4,5:1 con blanco. */
    accion: string;
    /** Tono oscuro de la paleta (títulos de marca, hover). */
    oscuro: string;
    /** Fondo suave de la paleta (tono 0). Reservado; hoy ningún bloque lo usa. */
    fondoSuave: string;
    /** Fondo de la página (el `--mantine-color-body` claro de la app). */
    fondoPagina: string;
}
export declare const MARCAS: Record<AppCorreo, MarcaCorreo>;
/** Apps hermanas que se nombran en el pie de la variante C, en este orden. */
export declare const APPS_DEL_PIE: AppCorreo[];
/**
 * Colores comunes a toda la suite. Los semánticos son las escalas
 * salu-green / salu-yellow / salu-red de salu-theme.ts (tonos 0, 5 y 7): los
 * mismos en las cinco marcas, para que «aviso» signifique lo mismo en todas.
 * No hay azul «informativo» ni caja de acento: lo que no es éxito, aviso o
 * peligro va en la caja neutra.
 */
export declare const NEUTROS: {
    readonly texto: "#1f2937";
    readonly textoSuave: "#4b5563";
    readonly gris: "#6b7280";
    readonly borde: "#e9e7df";
    readonly lineaTabla: "#eeece6";
    readonly fondoPie: "#faf9f6";
    readonly cajaFondo: "#f7f6f2";
    readonly cajaBorde: "#e9e7df";
    readonly blanco: "#ffffff";
};
export type TonoCaja = 'neutra' | 'exito' | 'aviso' | 'peligro';
export declare const TONOS: Record<TonoCaja, {
    fondo: string;
    borde: string;
    texto: string;
}>;
/** Tipografías: sistema para el cuerpo, Mulish 800 (con respaldo) para el wordmark. */
export declare const FUENTES: {
    readonly cuerpo: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    readonly marca: "Mulish, 'Segoe UI', Arial, Helvetica, sans-serif";
    /** Nombre del centro sin logo (variante A) y remitente (variante B). */
    readonly sobria: "Georgia, 'Times New Roman', serif";
    readonly mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";
};
//# sourceMappingURL=marcas.d.ts.map