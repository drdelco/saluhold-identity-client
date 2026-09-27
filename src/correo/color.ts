// Contraste WCAG y oscurecido de un color, para el acento del centro
// (variante A). Sin dependencias: corre igual en navegador, Metro y Node.

/** `#abc` / `#aabbcc` (con o sin almohadilla) → `#aabbcc` en minúsculas, o null. */
export function normalizarHex(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const s = valor.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s.split('').map((c) => c + c).join('')}`;
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`;
  return null;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG 2.x entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const x = luminancia(a);
  const y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function aHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function deHsl(h: number, s: number, l: number): string {
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = f(p, q, h + 1 / 3);
    g = f(p, q, h);
    b = f(p, q, h - 1 / 3);
  }
  return `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Contraste mínimo del acento sobre blanco (texto normal, WCAG AA). */
export const CONTRASTE_MINIMO = 4.5;

/**
 * Máximo que se oscurece el color del centro (en luminosidad HSL) antes de
 * darlo por perdido. Pasado este punto el tono ya no se reconoce como «su»
 * color y queda más digno el de la app.
 */
export const OSCURECIDO_MAXIMO = 0.3;

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
export function resolverAcento(colorCentro: unknown, accionApp: string, acentoApp: string): AcentoResuelto {
  const hex = normalizarHex(colorCentro);
  if (!hex) return { accion: accionApp, filete: acentoApp, origen: 'app' };
  if (contraste(hex, '#ffffff') >= CONTRASTE_MINIMO) return { accion: hex, filete: hex, origen: 'centro' };
  const [h, s, l] = aHsl(hex);
  for (let paso = 0.02; paso <= OSCURECIDO_MAXIMO + 1e-9; paso += 0.02) {
    const candidato = deHsl(h, s, Math.max(0, l - paso));
    if (contraste(candidato, '#ffffff') >= CONTRASTE_MINIMO) {
      return { accion: candidato, filete: hex, origen: 'centro-oscurecido' };
    }
  }
  return { accion: accionApp, filete: acentoApp, origen: 'app' };
}
