// sesionEscaneo.ts — puente escritorio → móvil para leer un documento.
//
// El escritorio no tiene una cámara decente y el móvil sí. El escritorio abre
// una "sesión de escaneo" (un documento efímero en Firestore) y muestra su id
// como QR; el móvil, identificado en la misma clínica, fotografía el documento,
// lo lee con la IA de Identity y deja SOLO el resultado (los campos extraídos)
// en la sesión. El escritorio, que está escuchando, lo recoge y sigue
// exactamente el mismo camino que si la foto se hubiera hecho allí: búsqueda
// por NIF primero, y solo después crear.
//
// La foto no viaja por aquí ni se guarda en ningún sitio: la lee el propio
// móvil. En la sesión solo quedan los campos, y el doc muere al consumirse (lo
// borra el escritorio) o por TTL a los 10 minutos.
//
// Ubicación: `clinics/{clinicId}/scan_sessions/{sessionId}` en la base que la
// app haya configurado. El aislamiento por clínica lo dan las reglas: cualquier
// profesional identificado de la MISMA clínica puede atender la sesión (la
// recepcionista abre el QR, el médico lo escanea con su móvil).

import {
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { config } from './config';
import type { LecturaOk } from './documento';

export const SCAN_SESSION_TTL_MIN = 10;

export type EstadoSesion = 'pending' | 'scanning' | 'done';

export interface ScanSession {
  clinicId: string;
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

function ref(clinicId: string, sessionId: string) {
  return doc(qr().db, 'clinics', clinicId, 'scan_sessions', sessionId);
}

function clinicaActiva(): string {
  const id = config().clinicaId();
  if (!id) throw new Error('No hay clínica activa.');
  return id;
}

/** URL que codifica el QR: la página donde el móvil hace la foto. */
export function urlDeSesion(sessionId: string): string {
  return qr().urlSesion(clinicaActiva(), sessionId);
}

export function sesionCaducada(s: Pick<ScanSession, 'expiresAt'>): boolean {
  return s.expiresAt.toMillis() < Date.now();
}

/** Escritorio: abre una sesión nueva en la clínica activa. */
export async function crearSesionEscaneo(): Promise<{ id: string; expiresAt: Date }> {
  const { db, auth } = qr();
  const uid = auth.currentUser?.uid;
  const clinicId = clinicaActiva();
  if (!uid) throw new Error('No hay sesión de usuario activa.');

  const nueva = doc(collection(db, 'clinics', clinicId, 'scan_sessions'));
  const expiresAt = new Date(Date.now() + SCAN_SESSION_TTL_MIN * 60_000);
  await setDoc(nueva, {
    clinicId,
    createdBy: uid,
    status: 'pending',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    lectura: null,
    scanningBy: null,
    doneBy: null,
    doneAt: null,
  });
  return { id: nueva.id, expiresAt };
}

/** Escritorio: escucha la sesión hasta que el móvil la complete. */
export function escucharSesion(
  sessionId: string,
  onCambio: (s: ScanSession | null) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    ref(clinicaActiva(), sessionId),
    (snap) => onCambio(snap.exists() ? (snap.data() as ScanSession) : null),
    (e) => onError(e),
  );
}

/** Escritorio: la sesión ya se consumió (o se cerró el modal). */
export async function borrarSesion(sessionId: string): Promise<void> {
  try { await deleteDoc(ref(clinicaActiva(), sessionId)); } catch { /* ya no existe */ }
}

/** Móvil: lee la sesión que abre el QR. */
export async function leerSesion(clinicId: string, sessionId: string): Promise<ScanSession | null> {
  const snap = await getDoc(ref(clinicId, sessionId));
  return snap.exists() ? (snap.data() as ScanSession) : null;
}

/** Móvil: avisa al escritorio de que alguien ha abierto el QR. */
export async function marcarEscaneando(clinicId: string, sessionId: string): Promise<void> {
  await updateDoc(ref(clinicId, sessionId), {
    status: 'scanning',
    scanningBy: qr().auth.currentUser?.uid ?? null,
  });
}

/** Móvil: deja el resultado de la lectura para el escritorio. */
export async function completarSesion(
  clinicId: string,
  sessionId: string,
  lectura: LecturaOk,
): Promise<void> {
  await updateDoc(ref(clinicId, sessionId), {
    status: 'done',
    // Respuesta JSON de la callable: sin undefined ni Timestamps. Se pasa por
    // JSON igualmente para que un campo ausente nunca llegue como undefined,
    // que Firestore rechaza.
    lectura: JSON.parse(JSON.stringify(lectura)),
    doneBy: qr().auth.currentUser?.uid ?? null,
    doneAt: serverTimestamp(),
  });
}
