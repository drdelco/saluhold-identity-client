"use strict";
// imageForAI.ts — preparar una foto para enviarla a un modelo de visión.
//
// NO confundir con `imageNormalize.ts`, que tiene el contrato OPUESTO a
// propósito: aquel convierte a PNG sin pérdida y sin reescalar porque son
// imágenes clínicas sobre las que se diagnostica, y ahí perder detalle es
// perder información médica. Aquí la foto solo sirve para que un modelo lea
// unos caracteres y se descarta acto seguido, así que interesa lo contrario:
// que pese poco.
//
// Tres cosas que resuelve y que no son obvias:
//  - EXIF: una foto tomada en vertical con el móvil llega girada. Un modelo no
//    lee un documento tumbado, y el síntoma es "la IA no devuelve nada", sin
//    más pistas. `imageOrientation: 'from-image'` lo aplica al decodificar.
//  - Tamaño: la imagen viaja en base64 dentro de la llamada, no por Storage.
//    Una foto de 12 MP son ~4 MB, y en base64 crece un tercio más.
//  - Resolución: 1600 px de lado mayor bastan para leer un documento de 85 mm.
//    Subir a 2048 encarece la llamada sin mejorar la lectura.
Object.defineProperty(exports, "__esModule", { value: true });
exports.comprimirParaIA = void 0;
const textos_1 = require("./textos");
const POR_DEFECTO = {
    maxLado: 1600,
    calidad: 0.82,
    maxBytes: 1100000, // el backend rechaza por encima de 1,5 MB
};
/** Decodifica respetando la orientación EXIF, con respaldo para navegadores viejos. */
async function decodificar(file) {
    if (typeof createImageBitmap === 'function') {
        try {
            const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
            return { fuente: bmp, ancho: bmp.width, alto: bmp.height };
        }
        catch {
            // Safari antiguo no admite imageOrientation: se cae al respaldo.
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight };
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
function aBase64(dataUrl) {
    const coma = dataUrl.indexOf(',');
    return coma >= 0 ? dataUrl.slice(coma + 1) : dataUrl;
}
function bytesDeBase64(b64) {
    const limpio = b64.replace(/=+$/, '');
    return Math.floor((limpio.length * 3) / 4);
}
/**
 * Comprime una foto para enviarla a un modelo de visión.
 *
 * Si al primer intento no cabe, baja la calidad y, en último extremo, la
 * resolución. Bajar calidad antes que resolución es deliberado: un JPEG algo
 * más sucio se sigue leyendo, uno pequeño pierde los caracteres finos.
 */
async function comprimirParaIA(file, opts = {}) {
    const { maxLado, calidad, maxBytes } = { ...POR_DEFECTO, ...opts };
    const { fuente, ancho, alto } = await decodificar(file);
    const dibujar = (lado, q) => {
        const escala = Math.min(1, lado / Math.max(ancho, alto));
        const w = Math.max(1, Math.round(ancho * escala));
        const h = Math.max(1, Math.round(alto * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error((0, textos_1.textosUI)().errorPrepararImagen);
        ctx.drawImage(fuente, 0, 0, w, h);
        return { base64: aBase64(canvas.toDataURL('image/jpeg', q)), w, h };
    };
    // Calidad primero, resolución después.
    const intentos = [
        [maxLado, calidad],
        [maxLado, 0.72],
        [maxLado, 0.62],
        [1280, 0.7],
        [1024, 0.7],
    ];
    let ultimo = dibujar(intentos[0][0], intentos[0][1]);
    for (const [lado, q] of intentos) {
        ultimo = dibujar(lado, q);
        if (bytesDeBase64(ultimo.base64) <= maxBytes)
            break;
    }
    if (typeof ImageBitmap !== 'undefined' && fuente instanceof ImageBitmap)
        fuente.close();
    return {
        base64: ultimo.base64,
        mimeType: 'image/jpeg',
        bytes: bytesDeBase64(ultimo.base64),
        ancho: ultimo.w,
        alto: ultimo.h,
    };
}
exports.comprimirParaIA = comprimirParaIA;
//# sourceMappingURL=imagen.js.map