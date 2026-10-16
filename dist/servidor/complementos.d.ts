/** Apps que SaluFile vende como complemento (clave de `appsActivas`). */
export declare const APPS_DE_COMPLEMENTO: readonly ["saluFact", "saluFirst"];
export type AppDeComplemento = typeof APPS_DE_COMPLEMENTO[number];
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
export declare function cambiosDeComplementos(e: EntradaComplementos): Promise<{
    cambios: CambioComplemento[];
    parches: ParcheComplementos[];
}>;
//# sourceMappingURL=complementos.d.ts.map