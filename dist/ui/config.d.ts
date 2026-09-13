import type { Functions } from 'firebase/functions';
import type { Firestore } from 'firebase/firestore';
/**
 * Un paciente que ya existe con ese documento.
 *
 * El tipo es deliberadamente abierto: el escáner no interpreta la ficha, la
 * recibe de la búsqueda de la app y la devuelve tal cual a la pantalla de alta,
 * que sí conoce su propio tipo. Cerrarlo aquí obligaría a las tres apps a
 * convertir en los dos sentidos para nada.
 */
export type PacienteCoincidente = Record<string, any>;
export interface ResultadoBusquedaNif {
    conAcceso: PacienteCoincidente[];
    sinAcceso: PacienteCoincidente[];
}
export interface ConfigEscaner {
    /** Cloud Functions de IDENTITY: allí vive el lector (`leerDocumentoIdentidad`). */
    identityFunctions: () => Functions;
    /** Si la app abre Identity de forma perezosa, se llama antes de cada lectura. */
    initIdentity?: () => Promise<void>;
    /** Clínica activa; Identity la valida contra las del profesional. */
    clinicaId: () => string | null | undefined;
    /** Qué app está leyendo. Queda en la auditoría del lector. */
    app: string;
    /**
     * Búsqueda global por documento. Es la pieza que evita duplicados, así que la
     * pone la app: cada una llama a su propia capa (con su caché y sus permisos).
     */
    buscarPorNif: (nif: string) => Promise<ResultadoBusquedaNif>;
    /**
     * Traspaso al móvil por QR. Si no se configura, el botón no ofrece esa vía
     * —mejor no enseñar un camino que no lleva a ninguna parte—.
     */
    qr?: {
        /** Firestore de IDENTITY: las sesiones viven allí, no en la base de la app.
         *  Función, como todo lo demás: Identity no existe hasta después del login. */
        db: () => Firestore;
        /** URL que codifica el QR: la página donde el móvil hace la foto. */
        urlSesion: (clinicaId: string, sessionId: string) => string;
    };
}
/** Se llama una vez, al arrancar la app. */
export declare function configurarEscanerDocumentos(config: ConfigEscaner): void;
export declare function escanerConfigurado(): boolean;
export declare function hayTraspasoQr(): boolean;
export declare function config(): ConfigEscaner;
/**
 * Mensaje de error presentable.
 *
 * Las callables devuelven el motivo en `message`; lo que no sirve es enseñar un
 * "internal" pelado o un stack. Si no hay nada legible, se usa el respaldo que
 * da el llamante, que sabe qué estaba intentando el usuario.
 */
export declare function mensajeDeError(e: unknown, respaldo: string): string;
//# sourceMappingURL=config.d.ts.map