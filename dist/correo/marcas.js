// Tokens de marca de los correos de la suite SaluHold.
//
// UNA fuente para los cinco remitentes. Cada valor sale de lo que pinta la
// app, no de memoria:
//
//   - SaluFile:  sanacloud/src/theme/salu-theme.ts (paleta `serene`) y
//                sanacloud/src/components/brand/Branding.tsx («Salu» serene.8 +
//                «File» serene.5).
//   - SaluFirst: salufirst/src/theme/salu-theme.ts (paleta `amber`,
//                AMBER_LOGO) y su Branding.tsx («Salu» amber.8 + «First»
//                AMBER_LOGO).
//   - SaluFact:  salufact/src/config/variant.ts (sage #5f8a5e / #3b5a3b),
//                salu-theme.ts (`sage`) y su Branding.tsx («Salu» #8a7e6b +
//                «Fact» sage.5).
//   - Factronia: variant.ts (índigo #4338a0 / #312e81) y /Factronia.svg
//                («actron» #4338A0 + «ia» #CCCCFF junto al glifo F).
//   - SaluHold / Identity: admin-frontend/src/theme.ts (`salu`, el 6 es el
//                corporativo #2154A0) y SaluHoldLogo.tsx («Salu» + «Hold»
//                salu.3).
//
// Reglas del correo (más estrictas que las de la app, a propósito):
//   - Los botones y enlaces usan el tono de la paleta que da ≥ 4,5:1 con
//     texto blanco / sobre blanco (WCAG AA). Por eso SaluFirst no pinta el
//     botón en amber.5 (#ed7a1a, 2,8:1) sino en amber.7, y SaluFact en sage.6.
//   - El color «de marca» puro (acento) solo se usa en elementos decorativos:
//     el filete superior de la tarjeta y el wordmark.
//   - Los iconos son los PNG de 192 px que ya sirve el hosting de cada app
//     (Gmail y Outlook no pintan SVG). Se muestran a 32 px (retina ×6).
export const MARCAS = {
    saluFile: {
        nombre: 'SaluFile',
        wordmark: [{ texto: 'Salu', color: '#273d52' }, { texto: 'File', color: '#4e7fa8' }],
        iconoUrl: 'https://salufile.com/icon-192.png',
        web: 'https://salufile.com',
        acento: '#4e7fa8', // serene.5
        accion: '#3d6589', // serene.6 — 6,1:1
        oscuro: '#273d52', // serene.8
        fondoSuave: '#eef3f8',
        fondoPagina: '#f1f0ec',
    },
    saluFirst: {
        nombre: 'SaluFirst',
        wordmark: [{ texto: 'Salu', color: '#663112' }, { texto: 'First', color: '#E7A94A' }],
        iconoUrl: 'https://salufirst.com/logo192.png',
        web: 'https://salufirst.com',
        acento: '#E7A94A', // AMBER_LOGO
        accion: '#a14a05', // amber.7 — 6,0:1 (amber.5 #ed7a1a da 2,8:1)
        oscuro: '#663112', // amber.8
        fondoSuave: '#fff4e8',
        fondoPagina: '#f1f0ec',
    },
    saluFact: {
        nombre: 'SaluFact',
        wordmark: [{ texto: 'Salu', color: '#8a7e6b' }, { texto: 'Fact', color: '#5f8a5e' }],
        iconoUrl: 'https://salufact.com/icon-192.png',
        web: 'https://salufact.com',
        acento: '#5f8a5e', // sage.5
        accion: '#4a7049', // sage.6 — 5,7:1 (sage.5 da 3,97:1)
        oscuro: '#3b5a3b', // sage.7
        fondoSuave: '#f2f5f0',
        fondoPagina: '#f6f6f4',
    },
    factronia: {
        nombre: 'Factronia',
        wordmark: [{ texto: 'Factron', color: '#4338a0' }, { texto: 'ia', color: '#CCCCFF' }],
        iconoUrl: 'https://factronia.com/icon-factronia-192.png',
        web: 'https://factronia.com',
        acento: '#4338a0',
        accion: '#4338a0', // 9,1:1
        oscuro: '#312e81',
        fondoSuave: '#f0effa',
        fondoPagina: '#f4f0f7',
    },
    saluHold: {
        nombre: 'SaluHold',
        wordmark: [{ texto: 'Salu', color: '#2154A0' }, { texto: 'Hold', color: '#6890d3' }],
        // PENDIENTE DE ALOJAR: Identity (saluhold.com) solo sirve un favicon SVG.
        // El PNG se genera del mismo dibujo (SaluHoldLogo.tsx) con las puntas en
        // los colores vigentes de cada app y hay que subirlo a
        // identity/admin-frontend/public/icon-192.png antes de usar esta marca.
        iconoUrl: 'https://saluhold.com/icon-192.png',
        web: 'https://saluhold.com',
        acento: '#2154A0',
        accion: '#2154A0', // 7,4:1
        oscuro: '#143a72',
        fondoSuave: '#e8f0fb',
        fondoPagina: '#f1f0ec',
    },
};
/** Apps hermanas que se nombran en el pie de la variante C, en este orden. */
export const APPS_DEL_PIE = ['saluFile', 'saluFirst', 'saluFact'];
/**
 * Colores comunes a toda la suite. Los semánticos son las escalas
 * salu-green / salu-yellow / salu-red de salu-theme.ts (tonos 0, 5 y 7): los
 * mismos en las cinco marcas, para que «aviso» signifique lo mismo en todas.
 * No hay azul «informativo» ni caja de acento: lo que no es éxito, aviso o
 * peligro va en la caja neutra.
 */
export const NEUTROS = {
    texto: '#1f2937',
    textoSuave: '#4b5563', // 7,6:1
    gris: '#6b7280', // 4,8:1 — pies y notas: el gris más claro que se usa en texto
    borde: '#e9e7df', // borde cálido de la tarjeta (tema Salu)
    lineaTabla: '#eeece6',
    fondoPie: '#faf9f6',
    cajaFondo: '#f7f6f2',
    cajaBorde: '#e9e7df',
    blanco: '#ffffff',
};
export const TONOS = {
    neutra: { fondo: NEUTROS.cajaFondo, borde: NEUTROS.cajaBorde, texto: NEUTROS.texto },
    exito: { fondo: '#eef6f0', borde: '#5a9e6f', texto: '#3a6847' },
    aviso: { fondo: '#faf3e8', borde: '#c4923a', texto: '#7d5c26' },
    peligro: { fondo: '#faeaea', borde: '#c25d5d', texto: '#7e3b3b' },
};
/** Tipografías: sistema para el cuerpo, Mulish 800 (con respaldo) para el wordmark. */
export const FUENTES = {
    cuerpo: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    marca: "Mulish, 'Segoe UI', Arial, Helvetica, sans-serif",
    /** Nombre del centro sin logo (variante A) y remitente (variante B). */
    sobria: "Georgia, 'Times New Roman', serif",
    mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
};
//# sourceMappingURL=marcas.js.map