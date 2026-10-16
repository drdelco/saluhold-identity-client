/** Apps de SaluFact (mismo proyecto). Identity solo acepta las de la cuenta que llama. */
export type AppServidorSaluFact = 'salufact' | 'factronia';
export interface ResultadoVincularEmpresaServidor {
    vinculada: true;
    yaVinculada: boolean;
    clinicas: string[];
}
/** Vincula una empresa a la clínica (y sus heredadas). Idempotente. */
export declare function vincularEmpresaDesdeServidor(app: AppServidorSaluFact | 'salufirst-comisiones', clinicaId: string, empresaId: string): Promise<ResultadoVincularEmpresaServidor>;
/**
 * El mismo parche que `actualizarEmpresaCanonica`: lo que no se manda no se
 * toca. Las cuentas bancarias se validan en Identity (IBAN, sin duplicados, lo
 * que la ficha ya sabía de cada una) y vaciar la lista exige `borrar`.
 */
export interface DatosEmpresaServidor {
    nombre?: string;
    nombreComercial?: string | null;
    cif?: string;
    tipoIdentificador?: string | null;
    tipos?: string[];
    direccion?: {
        calle?: string | null;
        codigoPostal?: string | null;
        poblacion?: string | null;
        provincia?: string | null;
        pais?: string | null;
    };
    contactos?: Array<Record<string, unknown>>;
    cuentasBancarias?: Array<Record<string, unknown>>;
    notasBancarias?: string | null;
    activo?: boolean;
    /** Campos que se vacían A PROPÓSITO (hoy, `cuentasBancarias`). */
    borrar?: string[];
}
export interface ResultadoActualizarEmpresaServidor {
    empresaId: string;
    actualizado: boolean;
    campos: string[];
}
/** Actualiza una empresa de la clínica. Identity comprueba que sea de esa clínica. */
export declare function actualizarEmpresaDesdeServidor(app: AppServidorSaluFact | 'salufirst-comisiones', clinicaId: string, empresaId: string, datos: DatosEmpresaServidor): Promise<ResultadoActualizarEmpresaServidor>;
/**
 * Datos del tenant. Los maestros (nombre, contacto, dirección, marca) y el
 * límite de usuarios los puede escribir la app sobre un tenant de SUS apps;
 * `activo`, `cif` y `planConcedido` solo un superadmin: la app lo acredita con
 * `actuaPor` (id de Identity de quien lo hace), y Identity comprueba su ficha.
 */
export interface DatosTenantServidor {
    nombre?: string;
    nombreComercial?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: {
        calle?: string | null;
        codigoPostal?: string | null;
        poblacion?: string | null;
        provincia?: string | null;
        pais?: string | null;
    };
    branding?: {
        primaryColor?: string | null;
        logoUrl?: string | null;
    };
    limiteUsuarios?: number;
    /** Añade (`true`) o quita (`false`) una app de las de la cuenta que llama en `origenIds`. */
    apps?: Partial<Record<AppServidorSaluFact, boolean>>;
    /** Marca de supresión de los datos de las apps de quien llama (quita sus apps de `origenIds`). */
    supresion?: {
        por: {
            uid: string | null;
            email: string | null;
        };
    };
    activo?: boolean;
    cif?: string;
    planConcedido?: string | null;
    adminPrincipal?: {
        email: string;
        nombre?: string | null;
        uid?: string | null;
    };
}
export interface ResultadoTenantServidor {
    tenantId: string;
    creado?: boolean;
    actualizado?: boolean;
    campos?: string[];
}
/** Alta de un tenant con origen en la app. `tenantId` opcional (si la app ya tiene el suyo). */
export declare function crearTenantDesdeServidor(app: AppServidorSaluFact, datos: DatosTenantServidor, opciones?: {
    tenantId?: string | null;
    actuaPor?: string | null;
}): Promise<ResultadoTenantServidor>;
/** Actualiza el tenant (parche: lo que no se manda no se toca). */
export declare function actualizarTenantDesdeServidor(app: AppServidorSaluFact, tenantId: string, datos: DatosTenantServidor, opciones?: {
    actuaPor?: string | null;
}): Promise<ResultadoTenantServidor>;
/** Apps que suben el logo del centro desde su servidor (cada una, con su cuenta). */
export type AppServidorLogo = 'salufile' | 'salufirst' | 'salufact' | 'factronia';
export interface ResultadoLogoTenant {
    tenantId: string;
    /** Dirección de Storage del objeto NUEVO (`tenant_logos/{tenantId}/logo_{ts}.{png|jpg|webp}`), o null si se quitó. */
    logoUrl: string | null;
}
/**
 * Sube (o quita, con `null`) el logo del tenant. Hasta 0.13.0 cada app escribía
 * el objeto en el Storage de Identity con su cuenta de servicio, a su manera
 * (con o sin token, siempre `.png` aunque no lo fuera). Identity comprueba ahora
 * el tipo por los bytes (PNG, JPEG o WEBP) y el tamaño (≤ 2 MB), guarda SIEMPRE
 * un objeto nuevo (los correos ya enviados apuntan al anterior), y escribe
 * `branding.logoUrl` + `updatedAt`.
 *
 * `actuaPor` es el id de Identity de quien lo cambia: la app comprueba antes
 * que administra esa empresa (el rol vive en la app); Identity, que su ficha
 * esté activa, sea de ese tenant y tenga esa app (o que sea superadmin).
 */
export declare function subirLogoDeTenantDesdeServidor(app: AppServidorLogo, tenantId: string, imagenBase64: string | null, opciones: {
    actuaPor: string;
}): Promise<ResultadoLogoTenant>;
export interface PeticionAccesoApp {
    profesionalId: string;
    /** Solo las apps de la cuenta que llama (SaluFact: `saluFact`, `factronia`, `asesoria`). */
    appId: 'saluFact' | 'factronia' | 'asesoria';
    activo: boolean;
    /** Al conceder, añade esta clínica a las del profesional (el asesor la ve en su selector). */
    clinicaId?: string | null;
}
export interface ResultadoAccesoApp {
    profesionalId: string;
    appId: string;
    activo: boolean;
    cambiado: boolean;
}
/**
 * Concede o retira `appsActivas.<appId>`. Respeta la regla de las cuentas de
 * asesoría (no conviven con las apps de producto en la misma cuenta).
 */
export declare function accesoAppDesdeServidor(app: 'salufact', peticion: PeticionAccesoApp): Promise<ResultadoAccesoApp>;
//# sourceMappingURL=canonicosServidor.d.ts.map