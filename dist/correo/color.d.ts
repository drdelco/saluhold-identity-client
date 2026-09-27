/** `#abc` / `#aabbcc` (con o sin almohadilla) → `#aabbcc` en minúsculas, o null. */
export declare function normalizarHex(valor: unknown): string | null;
/** Relación de contraste WCAG 2.x entre dos colores (1 a 21). */
export declare function contraste(a: string, b: string): number;
/** Contraste mínimo del acento sobre blanco (texto normal, WCAG AA). */
export declare const CONTRASTE_MINIMO = 4.5;
/**
 * Máximo que se oscurece el color del centro (en luminosidad HSL) antes de
 * darlo por perdido. Pasado este punto el tono ya no se reconoce como «su»
 * color y queda más digno el de la app.
 */
export declare const OSCURECIDO_MAXIMO = 0.3;
export interface AcentoResuelto {
    /** Color para botones, enlaces y antetítulo (≥ 4,5:1 sobre blanco). */
    accion: string;
    /** Color para el filete decorativo (el del centro tal cual, si lo hay). */
    filete: string;
    origen: 'centro' | 'centro-oscurecido' | 'app';
}
/**
 * Acento del centro: su color si contrasta; si no, el mismo tono oscurecido
 * poco a poco hasta llegar a 4,5:1; si ni así (o no es un color válido), el de
 * la app.
 */
export declare function resolverAcento(colorCentro: unknown, accionApp: string, acentoApp: string): AcentoResuelto;
//# sourceMappingURL=color.d.ts.map