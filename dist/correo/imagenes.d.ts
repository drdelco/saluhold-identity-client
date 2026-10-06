import { type AppCorreo } from './marcas';
/** Dónde guardan las tres apps (y el panel de Identity) el logo de un centro. */
export declare const ALMACEN_LOGOS: {
    readonly bucket: "identity-44874.firebasestorage.app";
    readonly carpeta: "tenant_logos";
};
/** Ruta del Hosting de cada app que sirve el logo: `/logo/{tenantId}/{fichero}`. */
export declare const RUTA_LOGO = "/logo";
/** Apps cuyo Hosting tiene el rewrite `/logo/**` → `manejarLogoCentro`. */
export declare const APPS_CON_RUTA_DE_LOGO: readonly AppCorreo[];
/** Tope de tamaño (el de la regla de Storage de `tenant_logos`). */
export declare const LOGO_MAX_BYTES: number;
/** Host (sin `www.`) desde el que tienen que servirse las imágenes de un correo de `app`. */
export declare function hostDeImagenes(app: AppCorreo): string;
/**
 * `{tenantId, fichero}` de la dirección de un logo de centro, venga como
 * dirección de Firebase Storage (`/v0/b/{bucket}/o/tenant_logos%2F…`), de
 * Cloud Storage (`storage.googleapis.com/{bucket}/tenant_logos/…`) o ya como
 * `/logo/{tenantId}/{fichero}` de una app. `null` si no es un logo del almacén.
 */
export declare function partesDeLogo(valor: unknown): {
    tenantId: string;
    fichero: string;
} | null;
/**
 * La dirección del logo del centro en el dominio de `app`
 * (`https://salufile.com/logo/{tenantId}/logo_{ts}.png`), o `null` si el logo
 * no está en el almacén de la suite o la app no tiene la ruta: entonces el
 * correo sale sin imagen.
 */
export declare function logoEnDominioDeLaApp(app: AppCorreo, logoUrl: unknown): string | null;
/** Imagen del cuerpo: https EN EL DOMINIO DE LA APP, o `cid:` (adjunto en línea). */
export declare function imagenDelDominio(app: AppCorreo, valor: unknown): string | null;
/**
 * Las imágenes de un correo ya compuesto que NO se sirven desde el dominio de
 * `app` (ni son `cid:`): `<img src>`, `background="…"` y `url(…)` de un fondo.
 * Para las pruebas de cada app: tiene que devolver `[]`.
 */
export declare function imagenesFueraDelDominio(app: AppCorreo, html: string): string[];
/** Lo mínimo de `http.IncomingMessage` / `ServerResponse` (Express incluido) que usa el manejador. */
export interface PeticionLogo {
    method?: string;
    path?: string;
    url?: string;
    originalUrl?: string;
}
export interface RespuestaLogo {
    statusCode: number;
    setHeader(nombre: string, valor: string | number): unknown;
    end(cuerpo?: unknown): unknown;
}
/** Tipo real por los primeros bytes (no por lo que diga Storage ni la extensión). */
export declare function tipoDeImagen(b: Uint8Array): string | null;
/**
 * `GET /logo/{tenantId}/{fichero}` → el logo del centro, tal cual está en el
 * Storage de Identity. Solo lectura, sin credenciales (el objeto ya es
 * público), sin Firestore y sin nada más que la imagen:
 *   - solo GET/HEAD (405 lo demás);
 *   - `tenantId` y `fichero` validados contra su forma: no se puede pedir
 *     ningún otro objeto ni ningún otro host;
 *   - ≤ 2 MB y PNG/JPEG/GIF/WEBP por sus primeros bytes (un SVG o un HTML
 *     subido como «logo» no se sirve);
 *   - `Cache-Control` de 30 días (la CDN del Hosting lo cachea: una invocación
 *     por objeto y nodo, no por apertura); 404 cacheado 5 min; si Storage no
 *     responde, 502 sin caché.
 *
 * Uso: `onRequest({ region: 'europe-west1', cors: false }, manejarLogoCentro)`
 * + rewrite de Hosting `/logo/**`.
 */
export declare function manejarLogoCentro(req: PeticionLogo, res: RespuestaLogo): Promise<void>;
//# sourceMappingURL=imagenes.d.ts.map