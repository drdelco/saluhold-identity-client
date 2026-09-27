export declare const IDIOMAS_SUITE: readonly ["es", "ca", "en", "fr", "pt", "it", "de", "nl", "sv", "no", "ru", "zh"];
export interface TextosMarco {
    /** `{saluhold}` = la marca de la suite, que no se traduce. */
    universo: string;
    derechos: string;
    /** Variante A: «Enviado con {app}». */
    enviadoCon: string;
    /** Variante B: «Enviado mediante {app}». */
    enviadoMediante: string;
    /** Remitente de la variante A: «Centro (vía SaluFile)». */
    via: string;
    /** Debajo del botón principal. */
    enlaceAlternativo: string;
    tel: string;
}
export declare const TEXTOS_MARCO: Record<string, TextosMarco>;
/** Código de dos letras del idioma pedido, o `es` si no hay textos para él. */
export declare function idiomaDelMarco(idioma: unknown): string;
export declare function esRtl(idioma: string): boolean;
//# sourceMappingURL=textos.d.ts.map