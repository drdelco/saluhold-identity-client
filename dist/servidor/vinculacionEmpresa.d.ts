import { type FirestoreMinimo, type ArrayUnion } from './vinculacion';
export interface ResultadoVinculacionEmpresa {
    /** Ya estaba en la clínica: no se ha escrito nada. */
    yaVinculada: boolean;
    /** Clínicas a las que ha quedado vinculada: la pedida y sus heredadas. */
    clinicas: string[];
}
export declare function vincularEmpresaEnIdentity(db: FirestoreMinimo, arrayUnion: ArrayUnion, empresaId: string, clinicaId: string, opciones?: {
    coleccionEmpresas?: string;
    coleccionTenants?: string;
}): Promise<ResultadoVinculacionEmpresa>;
//# sourceMappingURL=vinculacionEmpresa.d.ts.map