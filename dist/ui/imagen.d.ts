export interface ImagenParaIA {
    base64: string;
    mimeType: 'image/jpeg';
    bytes: number;
    ancho: number;
    alto: number;
}
interface Opciones {
    maxLado?: number;
    calidad?: number;
    maxBytes?: number;
}
/**
 * Comprime una foto para enviarla a un modelo de visión.
 *
 * Si al primer intento no cabe, baja la calidad y, en último extremo, la
 * resolución. Bajar calidad antes que resolución es deliberado: un JPEG algo
 * más sucio se sigue leyendo, uno pequeño pierde los caracteres finos.
 */
export declare function comprimirParaIA(file: File, opts?: Opciones): Promise<ImagenParaIA>;
export {};
//# sourceMappingURL=imagen.d.ts.map