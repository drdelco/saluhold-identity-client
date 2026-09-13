import { type Timestamp, type Unsubscribe } from 'firebase/firestore';
import type { LecturaOk } from './documento';
export declare const SCAN_SESSION_TTL_MIN = 10;
export type EstadoSesion = 'pending' | 'scanning' | 'done';
export interface ScanSession {
    clinicaId: string;
    createdBy: string;
    status: EstadoSesion;
    createdAt: Timestamp | null;
    expiresAt: Timestamp;
    /** Resultado de la lectura hecha en el móvil. Solo campos, nunca la imagen. */
    lectura: LecturaOk | null;
    scanningBy: string | null;
    doneBy: string | null;
    doneAt: Timestamp | null;
}
/** URL que codifica el QR: la página donde el móvil hace la foto. */
export declare function urlDeSesion(sessionId: string): string;
export declare function sesionCaducada(s: Pick<ScanSession, 'expiresAt'>): boolean;
/** Escritorio: abre una sesión nueva en la clínica activa. */
export declare function crearSesionEscaneo(): Promise<{
    id: string;
    expiresAt: Date;
}>;
/**
 * Escritorio: escucha su sesión hasta que el móvil la complete.
 *
 * Va directo a Firestore de Identity: las reglas dejan leer solo las sesiones
 * que uno mismo ha abierto, que es justo este caso.
 */
export declare function escucharSesion(sessionId: string, onCambio: (s: ScanSession | null) => void, onError: (e: Error) => void): Unsubscribe;
/** Escritorio: la sesión ya se consumió (o se cerró el modal). */
export declare function borrarSesion(sessionId: string): Promise<void>;
/** Móvil: abre la sesión del QR y avisa al escritorio de que hay alguien. */
export declare function abrirSesion(sessionId: string): Promise<{
    id: string;
    status: EstadoSesion;
    expiresAt: string;
}>;
/** Móvil: deja el resultado de la lectura para el escritorio. */
export declare function completarSesion(sessionId: string, lectura: LecturaOk): Promise<void>;
//# sourceMappingURL=sesionEscaneo.d.ts.map