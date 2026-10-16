// vinculacionEmpresa.ts — qué significa vincular una EMPRESA a una clínica (0.12.0).
//
// Subruta `/servidor`: corre en Cloud Functions con el Admin SDK. La usan los
// endpoints de Identity (`vincularEmpresaCanonica` con sesión y
// `vincularEmpresaServidor` para los backends por IAM). Antes SaluFact la
// escribía a mano en tres sitios (vincular un cliente y, en las comisiones,
// vincular al cobrador y vincular el que el alta devolvía como existente).
//
// Como la de pacientes (`vincularPacienteEnIdentity`), menos el número de
// historia, que una empresa no tiene:
//
//   1. `clinicaIds` gana la clínica Y las que heredan de ella (un grupo
//      comparte sus clientes), con `arrayUnion`: dos vinculaciones a la vez no
//      se pisan.
//   2. `updatedAt` sube: sin él la empresa se cae del sync delta de los
//      buscadores.
//   3. Idempotente: si ya está en la clínica, no se escribe nada.
//
// Lo que NO entra: la traza de quién y por qué (cada app guarda su registro de
// accesos, `audit_accesos` en SaluFact) ni las marcas de actividad de cliente.

import { clinicasDelGrupo, type FirestoreMinimo, type ArrayUnion } from './vinculacion';

export interface ResultadoVinculacionEmpresa {
  /** Ya estaba en la clínica: no se ha escrito nada. */
  yaVinculada: boolean;
  /** Clínicas a las que ha quedado vinculada: la pedida y sus heredadas. */
  clinicas: string[];
}

export async function vincularEmpresaEnIdentity(
  db: FirestoreMinimo,
  arrayUnion: ArrayUnion,
  empresaId: string,
  clinicaId: string,
  opciones: { coleccionEmpresas?: string; coleccionTenants?: string } = {},
): Promise<ResultadoVinculacionEmpresa> {
  const ref = db.collection(opciones.coleccionEmpresas || 'empresas').doc(empresaId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('No es posible vincular: la empresa no existe.');
  }
  const clinicaIds = Array.isArray(snap.data()?.clinicaIds) ? snap.data()!.clinicaIds as string[] : [];
  if (clinicaIds.includes(clinicaId)) {
    return { yaVinculada: true, clinicas: [clinicaId] };
  }
  const grupo = await clinicasDelGrupo(db, clinicaId, opciones.coleccionTenants);
  await ref.update({ clinicaIds: arrayUnion(...grupo), updatedAt: new Date() });
  return { yaVinculada: false, clinicas: grupo };
}
