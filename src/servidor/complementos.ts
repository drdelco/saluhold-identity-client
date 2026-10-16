// complementos.ts — la regla de los complementos de la suscripción en
// `appsActivas` (0.14.0).
//
// SaluFile vende SaluFact y SaluFirst como complementos de su suscripción.
// Decisión de Diego (2026-09-26): **el complemento solo CONCEDE el acceso y
// nunca lo retira a quien ya lo tenía por su cuenta.**
//
//  - Complemento activo → `appsActivas.<app> = true` a las personas activas de
//    la clínica con acceso a SaluFile que NO lo tuvieran, y la clínica se apunta
//    en `appsPorComplemento.<app>` (una persona puede estar en dos centros con
//    el mismo complemento). Quien ya tenía la app sin esa marca no se toca: la
//    tiene por su cuenta.
//  - Complemento cancelado → se quita la clínica de la marca y SOLO se retira la
//    app si ya no queda ninguna clínica en la marca y ningún tenant de la
//    persona tiene esa app en `origenIds` (el centro la usa por su cuenta).
//  - Si la marca dice que se concedió y la app está en `false`, alguien la
//    retiró a mano en Identity: se respeta y no se vuelve a conceder.
//
// Era `functions/utils/complementos-identity.js` de SaluFile, que escribía en
// Identity con su cuenta. Ahora la regla es esta, PURA (no lee ni escribe): la
// aplica el endpoint `complementosServidor` de Identity, que es quien escribe,
// y la usa la simulación (`--dry-run`) de SaluFile para enseñar qué haría.
//
// Lo que devuelve no lleva nombres: acaba en un log.

/** Apps que SaluFile vende como complemento (clave de `appsActivas`). */
export const APPS_DE_COMPLEMENTO = ['saluFact', 'saluFirst'] as const;
export type AppDeComplemento = typeof APPS_DE_COMPLEMENTO[number];

/** Clave de cada una en `origenIds` de un tenant (el centro la usa por su cuenta). */
const ORIGEN: Record<AppDeComplemento, string> = { saluFact: 'salufact', saluFirst: 'salufirst' };

export interface ProfesionalParaComplementos {
  id: string;
  datos: Record<string, unknown>;
}

export interface EntradaComplementos {
  clinicaId: string;
  /** Las personas con esta clínica en `clinicaIds`. */
  profesionales: ProfesionalParaComplementos[];
  /** `origenIds` de un tenant (para saber si un centro usa la app por su cuenta). */
  origenesDe: (tenantId: string) => Promise<string[]>;
  /** Complementos que valen AHORA en la clínica. */
  activos: readonly string[];
  /** Solo estos (por defecto, todos). */
  revisar?: readonly string[] | null;
}

export interface CambioComplemento {
  accion: 'conceder' | 'marcar' | 'respetar' | 'desmarcar' | 'retirar';
  app: AppDeComplemento;
  profesionalId: string;
  motivo: string;
}

/** Qué escribir en UNA ficha: apps a poner a true/false y marcas a añadir/quitar. */
export interface ParcheComplementos {
  profesionalId: string;
  apps: Partial<Record<AppDeComplemento, boolean>>;
  marcar: AppDeComplemento[];
  desmarcar: AppDeComplemento[];
}

function comoApps(lista: readonly string[] | null | undefined, que: string): AppDeComplemento[] {
  const fuera = (lista || []).filter((a) => !(APPS_DE_COMPLEMENTO as readonly string[]).includes(a));
  if (fuera.length) {
    throw new Error(`${que}: ${fuera.join(', ')} no es una app de complemento (${APPS_DE_COMPLEMENTO.join(', ')}).`);
  }
  return [...new Set(lista || [])] as AppDeComplemento[];
}

export async function cambiosDeComplementos(e: EntradaComplementos): Promise<{
  cambios: CambioComplemento[];
  parches: ParcheComplementos[];
}> {
  const activos = new Set(comoApps(e.activos, 'Complementos activos'));
  const revisar = e.revisar ? comoApps(e.revisar, 'Complementos a revisar') : [...APPS_DE_COMPLEMENTO];
  const cambios: CambioComplemento[] = [];
  const parches: ParcheComplementos[] = [];

  for (const { id, datos: p } of e.profesionales) {
    const apps = (p.appsActivas && typeof p.appsActivas === 'object' ? p.appsActivas : {}) as Record<string, unknown>;
    const porComplemento = (p.appsPorComplemento && typeof p.appsPorComplemento === 'object'
      ? p.appsPorComplemento : {}) as Record<string, unknown>;
    const parche: ParcheComplementos = { profesionalId: id, apps: {}, marcar: [], desmarcar: [] };

    for (const app of revisar) {
      const marca = Array.isArray(porComplemento[app]) ? porComplemento[app] as string[] : [];
      const marcadoAqui = marca.includes(e.clinicaId);
      const registrar = (accion: CambioComplemento['accion'], motivo: string) =>
        cambios.push({ accion, app, profesionalId: id, motivo });

      if (activos.has(app)) {
        if (p.activo === false || apps.saluFile !== true) continue; // no ocupa SaluFile en el centro
        if (apps[app] === true) {
          if (marca.length > 0 && !marcadoAqui) {
            parche.marcar.push(app);
            registrar('marcar', 'ya concedida por el complemento de otro centro');
          }
          continue; // la tenía (por su cuenta o ya concedida): no se toca
        }
        if (marcadoAqui) {
          registrar('respetar', 'retirada a mano en Identity después de concederla; no se vuelve a conceder');
          continue;
        }
        parche.apps[app] = true;
        parche.marcar.push(app);
        registrar('conceder', `complemento de ${app} activo`);
      } else if (marcadoAqui) {
        parche.desmarcar.push(app);
        const quedan = marca.filter((c) => c !== e.clinicaId);
        if (quedan.length > 0) {
          registrar('desmarcar', `la sigue sosteniendo el complemento de ${quedan.join(', ')}`);
          continue;
        }
        let usoPropio: string | null = null;
        const clinicas = Array.isArray(p.clinicaIds) ? p.clinicaIds as string[] : [];
        for (const t of clinicas) {
          if ((await e.origenesDe(t)).includes(ORIGEN[app])) { usoPropio = t; break; }
        }
        if (usoPropio) {
          registrar('desmarcar', `el centro ${usoPropio} usa ${app} por su cuenta (origenIds): se conserva el acceso`);
          continue;
        }
        if (apps[app] === true) {
          parche.apps[app] = false;
          registrar('retirar', `complemento de ${app} cancelado`);
        } else {
          registrar('desmarcar', 'ya no tenía la app');
        }
      }
    }

    if (Object.keys(parche.apps).length || parche.marcar.length || parche.desmarcar.length) parches.push(parche);
  }

  return { cambios, parches };
}
