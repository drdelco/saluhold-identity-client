// sesionEscaneo.ts — puente escritorio → móvil para leer un documento.
//
// El escritorio no tiene una cámara decente y el móvil sí. El escritorio abre
// una sesión, la enseña como QR y espera; el móvil fotografía el documento, lo
// lee y deja SOLO los campos extraídos en la sesión. El escritorio, que está
// escuchando, los recoge y sigue exactamente el mismo camino que si la foto se
// hubiera hecho allí: búsqueda por NIF primero, y solo después crear.
//
// La sesión vive en IDENTITY (`scan_sessions/{id}`), no en la base de cada app:
// así el mismo código sirve a SaluFile, SaluFirst y SaluFact, y la página donde
// el móvil hace la foto es una sola.
//
// Abrir, crear y completar pasan por callables de Identity porque son las
// únicas que pueden comprobar de qué clínica es quien llama (el claim
// `clinicaId` vive en el Auth de la app destino, no en el de Identity). Lo
// único que se hace directo contra Firestore es ESCUCHAR la sesión propia, que
// es lo que permite al escritorio enterarse al instante.
//
// La foto no viaja por aquí ni se guarda: la lee el móvil. En la sesión solo
// quedan los campos, y el documento muere al consumirse o a los diez minutos.

import { doc, deleteDoc, onSnapshot, type Timestamp, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { config } from './config';
import type { LecturaOk } from './documento';

export const SCAN_SESSION_TTL_MIN = 10;

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

function qr() {
  const c = config();
  if (!c.qr) throw new Error('El traspaso por QR no está configurado en esta app.');
  return c.qr;
}

async function llamar<I, O>(nombre: string, datos: I): Promise<O> {
  const c = config();
  if (c.initIdentity) await c.initIdentity();
  const fn = httpsCallable<I & { clinicaId?: string }, O>(c.identityFunctions(), nombre);
  const res = await fn({ ...datos, clinicaId: c.clinicaId() || undefined } as I & { clinicaId?: string });
  return res.data;
}

/** URL que codifica el QR: la página donde el móvil hace la foto. */
export function urlDeSesion(sessionId: string): string {
  return qr().urlSesion(config().clinicaId() || '', sessionId);
}

export function sesionCaducada(s: Pick<ScanSession, 'expiresAt'>): boolean {
  return s.expiresAt.toMillis() < Date.now();
}

/** Escritorio: abre una sesión nueva en la clínica activa. */
export async function crearSesionEscaneo(): Promise<{ id: string; expiresAt: Date }> {
  const r = await llamar<Record<string, never>, { id: string; expiresAt: string }>(
    'crearSesionEscaneo', {} as Record<string, never>,
  );
  return { id: r.id, expiresAt: new Date(r.expiresAt) };
}

/**
 * Escritorio: escucha su sesión hasta que el móvil la complete.
 *
 * Va directo a Firestore de Identity: las reglas dejan leer solo las sesiones
 * que uno mismo ha abierto, que es justo este caso.
 */
export function escucharSesion(
  sessionId: string,
  onCambio: (s: ScanSession | null) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(qr().db(), 'scan_sessions', sessionId),
    (snap) => onCambio(snap.exists() ? (snap.data() as ScanSession) : null),
    (e) => onError(e),
  );
}

/** Escritorio: la sesión ya se consumió (o se cerró el modal). */
export async function borrarSesion(sessionId: string): Promise<void> {
  try { await deleteDoc(doc(qr().db(), 'scan_sessions', sessionId)); } catch { /* ya no existe */ }
}

/** Móvil: abre la sesión del QR y avisa al escritorio de que hay alguien. */
export async function abrirSesion(
  sessionId: string,
): Promise<{ id: string; status: EstadoSesion; expiresAt: string }> {
  return llamar('abrirSesionEscaneo', { sessionId });
}

/** Móvil: deja el resultado de la lectura para el escritorio. */
export async function completarSesion(sessionId: string, lectura: LecturaOk): Promise<void> {
  await llamar('completarSesionEscaneo', { sessionId, lectura });
}
