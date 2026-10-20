/**
 * selloTiempo.ts — el MÓDULO ÚNICO de sellos de tiempo RFC 3161 de la suite.
 * ═══════════════════════════════════════════════════════════════════════════
 * Diego (20-10-2026): «vamos a sellar desde un módulo único para toda la app».
 * Pide el sello, lo verifica entero, lo guarda en un formato común
 * (`SelloTiempo` v1) y lo reintenta desde una cola en Firestore. Ninguna app
 * tiene su variante: SaluFile, SaluFirst y SaluFact lo importan de
 * `@saluhold/identity-client/sello`, y eXCausis lleva una COPIA BYTE A BYTE de
 * este fichero (vigilada por una prueba de paridad con su SHA-256).
 *
 * Por esa copia, el fichero es autocontenido a propósito:
 *   - Sin dependencias: solo `node:crypto` (con `X509Certificate`) y el
 *     `fetch` global (Node ≥ 18). Nada de axios, pkijs ni asn1js: un lector
 *     DER mínimo basta para lo que un sello necesita.
 *   - No importa NADA del SDK ni de Firebase: la cola recibe el Firestore por
 *     parámetro con un tipado mínimo propio (vale para firebase-admin 12 y 14).
 *   - Compila con el tsconfig del SDK (estricto) y con el de eXCausis
 *     (`target es2017`, no estricto, `noUnusedLocals`): sin literales BigInt,
 *     sin `for await`, sin APIs de ES2019+ (`flat`, `fromEntries`…).
 *   - Nunca lee secretos ni variables de entorno: la credencial de una TSA
 *     cualificada llega por parámetro (la app la saca de su Secret Manager).
 *
 * Qué se sella: SIEMPRE la huella SHA-256 (a la TSA solo le llegan 32 bytes y
 * un nonce), de los bytes exactos de lo guardado o entregado (`huellaDeBytes`,
 * `huellaDeFlujo`) o de un dato estructurado en JSON canónico (`huellaCanonica`,
 * estilo RFC 8785: un manifiesto de envío, una versión de episodio…).
 *
 * Verificación independiente (perito, auditoría):
 *   openssl ts -verify -data documento.pdf -in documento.tsr \
 *     -CAfile raiz.pem -untrusted tsa.pem
 * `paqueteVerificacion` fabrica esos ficheros y un LEEME con el comando.
 *
 * Configuración por defecto (decisión de Diego, 20-10-2026): FreeTSA sola, sin
 * respaldo. La TSA cualificada se contratará más adelante y entra cambiando la
 * configuración, no el código (principal/respaldo, autenticación 'basica'):
 *   sellado: {
 *     activo: true,
 *     principal: { id: 'freetsa', url: 'https://freetsa.org/tsr', cualificada: false,
 *                  autenticacion: { tipo: 'ninguna' },
 *                  raicesPem: ['<https://freetsa.org/files/cacert.pem>'] },
 *     respaldo: null,
 *   }
 * Sin respaldo, la cola reintenta la principal con espera creciente y nunca
 * marca `faltaCualificado`. Este módulo no borra nada: los `.tsr` que ya
 * existen se conservan.
 * ═══════════════════════════════════════════════════════════════════════════
 */
/// <reference types="node" />
/// <reference types="node" />
export type EstadoSello = 'pendiente' | 'concedido' | 'fallido' | 'invalido';
export type ModoSello = 'individual' | 'lote';
/** La TSA que dio (o a la que se pidió) el sello. */
export interface TsaSello {
    id: string;
    url: string;
    cualificada: boolean;
}
/** Certificado con el que firmó la TSA. */
export interface FirmanteSello {
    sujeto: string;
    emisor: string;
    /** Número de serie del certificado, en hex. */
    serie: string;
    /** SHA-256 del certificado (DER), en hex. */
    sha256Cert: string;
}
export interface VerificacionSello {
    ok: boolean;
    at: Date;
    motivos: string[];
}
/** Un paso de la ruta de Merkle: la huella hermana y a qué lado está. */
export interface PasoRuta {
    lado: 'i' | 'd';
    huella: string;
}
/** Dónde está una hoja dentro de un lote sellado. */
export interface LoteSello {
    id: string;
    raiz: string;
    indice: number;
    ruta: PasoRuta[];
}
/**
 * Formato común de un sello (v1). Nada `undefined`: lo opcional va a null.
 * Las fechas son `Date` al crearlo (Firestore las guarda como Timestamp).
 */
export interface SelloTiempo {
    v: 1;
    algoritmo: 'SHA-256';
    /** Huella sellada, SHA-256 en hex (minúsculas). */
    huella: string;
    tsa: TsaSello;
    estado: EstadoSello;
    /** TimeStampResp DER en base64. El `.tsr` se fabrica con esto al descargar. */
    token: string | null;
    /** Fecha y hora del sello, la que vale (la de la TSA, no la del servidor). */
    genTime: Date | null;
    genTimeIso: string | null;
    /** Número de serie del sello, en hex. */
    serie: string | null;
    /** OID de la política de la TSA (FreeTSA: 1.2.3.4.1). */
    politica: string | null;
    nonce: string | null;
    precisionMs: number | null;
    firmante: FirmanteSello | null;
    verificacion: VerificacionSello | null;
    lote: LoteSello | null;
    intentos: number;
    ultimoError: string | null;
    solicitadoAt: Date;
    concedidoAt: Date | null;
}
export type AutenticacionTsa = {
    tipo: 'ninguna';
}
/** Usuario y contraseña en la cabecera `Authorization: Basic`. `secreto` es
 *  la CLAVE del mapa de credenciales (p. ej. 'TSA_CUALIFICADA'), no el valor. */
 | {
    tipo: 'basica';
    secreto: string;
};
/** Una TSA tal como vive en la configuración de la app (Firestore). */
export interface ConfigTsa {
    id: string;
    url: string;
    cualificada: boolean;
    autenticacion?: AutenticacionTsa | null;
    /** Raíces de confianza en PEM: la cadena del firmante tiene que acabar en una. */
    raicesPem: string[];
    /** Intermedios en PEM, por si la TSA no los mete en el token. */
    certificadosPem?: string[] | null;
}
/** El bloque `sellado` de la configuración de plataforma de cada app. */
export interface ConfigSellado {
    activo: boolean;
    principal: ConfigTsa;
    respaldo?: ConfigTsa | null;
    porTipo?: {
        [tipo: string]: ModoSello;
    } | null;
    horaLote?: string | null;
}
export interface CredencialTsa {
    usuario: string;
    contrasena: string;
}
/** Credenciales por nombre de secreto. Las pone la app; el módulo no las lee de ningún sitio. */
export interface CredencialesTsa {
    [secreto: string]: CredencialTsa | null | undefined;
}
export declare const COLECCION_SELLOS = "sellos_tiempo";
export declare const COLECCION_LOTES = "sellos_tiempo_lotes";
/** FreeTSA admite 1 petición por segundo por IP: la cola espacia 1,1 s. */
export declare const ESPACIADO_COLA_MS = 1100;
/** Espera entre reintentos, en minutos: 1, 5, 15, 1 h y, desde ahí, cada 6 h. */
export declare const ESPERAS_REINTENTO_MIN: number[];
/** Pasado este tiempo sin la TSA principal, la cola sella con el respaldo. */
export declare const PLAZO_RESPALDO_MS: number;
/** SHA-256 en hex de unos bytes (un string se toma en UTF-8). */
export declare function huellaDeBytes(datos: Buffer | Uint8Array | string): string;
/** Lo mínimo de un flujo legible (un `Readable` de Node, un fichero de Storage). */
export interface FlujoLegible {
    on(evento: string, oyente: (...args: any[]) => void): any;
}
/**
 * SHA-256 de un flujo, sin cargarlo en memoria (grabaciones, objetos de
 * Storage). Devuelve también los bytes leídos, que van en el manifiesto.
 */
export declare function huellaDeFlujo(flujo: FlujoLegible): Promise<{
    huella: string;
    bytes: number;
}>;
/**
 * JSON canónico al estilo RFC 8785: claves ordenadas (por unidades UTF-16,
 * como manda la RFC), sin espacios, números como los escribe JavaScript.
 * Una propiedad `undefined` NO aparece (igual que en JSON); en un array, un
 * `undefined` es `null`. `toJSON` se respeta (una `Date` sale en ISO).
 * Un número no finito o un BigInt lanzan: no tienen forma canónica.
 */
export declare function jsonCanonico(valor: unknown): string;
/** SHA-256 en hex del JSON canónico de un dato estructurado. */
export declare function huellaCanonica(valor: unknown): string;
/** Nonce aleatorio de 64 bits (positivo), en hex. */
export declare function nuevoNonce(): string;
/**
 * TimeStampReq DER para una huella SHA-256 (RFC 3161 §2.4.1): versión 1,
 * messageImprint SHA-256, nonce (si se da) y certReq = TRUE, para que el
 * certificado de la TSA viaje en el token y se pueda verificar sin red.
 */
export declare function peticionRfc3161(huella: string, opciones?: {
    nonce?: string | null;
}): Buffer;
export interface TstInfo {
    version: number;
    politica: string;
    /** OID del algoritmo de la huella sellada. */
    algoritmoHuella: string;
    huella: string;
    serie: string;
    genTime: Date;
    genTimeIso: string;
    precisionMs: number | null;
    ordenado: boolean;
    nonce: string | null;
}
export interface SignerInfoTsa {
    version: number;
    algoritmoResumen: string;
    algoritmoFirma: string;
    parametrosFirma: Buffer | null;
    firma: Buffer;
    /** signedAttrs tal cual llegan (etiqueta [0]); se firman re-etiquetados como SET. */
    atributosFirmados: Buffer | null;
    sidSerie: string | null;
    sidEmisor: Buffer | null;
    sidSki: string | null;
}
export interface RespuestaTsa {
    /** PKIStatus: 0 concedido, 1 concedido con cambios, 2+ rechazo. */
    pkiStatus: number;
    estadoTexto: string | null;
    /** failInfo (BIT STRING) en hex, si lo hay. */
    fallo: string | null;
    /** El TimeStampToken (ContentInfo) DER, si lo hay. */
    token: Buffer | null;
    tipoContenido: string | null;
    tstInfo: TstInfo | null;
    tstInfoDer: Buffer | null;
    /** Certificados que trae el token, DER. */
    certs: Buffer[];
    signerInfo: SignerInfoTsa | null;
}
/**
 * Lee una TimeStampResp (o un TimeStampToken suelto, como `-token_in` de
 * openssl). Lanza si el DER está mal formado; NO verifica nada.
 */
export declare function leerRespuesta(der: Buffer | Uint8Array): RespuestaTsa;
export interface OpcionesVerificacion {
    /** Huella que se pidió sellar (hex). Obligatoria: sin ella no hay verificación. */
    huella: string;
    /** Nonce de la petición; si se da, el token tiene que llevar el mismo. */
    nonce?: string | null;
    /** Raíces de confianza (PEM). La cadena del firmante tiene que acabar en una. */
    raices: string[];
    /** Intermedios adicionales (PEM), por si el token no los trae. */
    certificados?: string[] | null;
    /** Momento en que se comprueba la vigencia de la cadena (por defecto, genTime). */
    instante?: Date | null;
}
export interface ResultadoVerificacion {
    ok: boolean;
    motivos: string[];
    genTime: Date | null;
    firmante: FirmanteSello | null;
    tstInfo: TstInfo | null;
}
/**
 * Verifica un sello de punta a punta, con `node:crypto`:
 *   1. PKIStatus 0 o 1.
 *   2. La huella del TSTInfo es la nuestra y el algoritmo, SHA-256.
 *   3. El nonce coincide (si se da).
 *   4. El atributo firmado messageDigest es el resumen del TSTInfo, y el
 *      contentType, id-ct-TSTInfo.
 *   5. La firma sobre los signedAttrs (re-etiquetados como SET, 0x31) con la
 *      clave del certificado firmante: RSA PKCS#1 v1.5, RSA-PSS, ECDSA, Ed25519.
 *   6. ESSCertIDv2 (o ESSCertID) apunta a ese certificado.
 *   7. La cadena llega a una de `raices` (`X509Certificate.verify`), todo
 *      vigente en `instante` (por defecto genTime), el firmante vigente en
 *      genTime y con uso extendido crítico SOLO timeStamping (como openssl).
 * No lanza: lo que falla va a `motivos` (códigos estables, en castellano).
 */
export declare function verificarSello(der: Buffer | Uint8Array, opciones: OpcionesVerificacion): ResultadoVerificacion;
/** Vuelve a verificar un `SelloTiempo` guardado (su token contra su huella y su nonce). */
export declare function comprobarSello(sello: SelloTiempo, opciones: {
    raices: string[];
    certificados?: string[] | null;
    instante?: Date | null;
}): ResultadoVerificacion;
export interface OpcionesPeticion {
    credencial?: CredencialTsa | null;
    timeoutMs?: number;
    /** Espacio mínimo entre peticiones a la misma TSA desde este proceso. */
    espaciadoMs?: number;
    ahora?: () => Date;
}
/**
 * Pide un sello a UNA TSA y lo verifica. NUNCA lanza.
 *   - concedido: la TSA lo dio y verifica entero (`verificacion.ok`).
 *   - invalido: la TSA respondió «concedido» pero el token no verifica (se
 *     guarda el token para el forense; genTime y demás quedan a null para que
 *     nadie pinte una fecha que no vale).
 *   - fallido: red, tiempo, HTTP, rechazo de la TSA o configuración.
 */
export declare function pedirSello(huella: string, tsa: ConfigTsa, opciones?: OpcionesPeticion): Promise<SelloTiempo>;
export interface OpcionesSellar {
    credenciales?: CredencialesTsa | null;
    timeoutMs?: number;
    espaciadoMs?: number;
    ahora?: () => Date;
}
/**
 * Sella al momento: la TSA principal y, si no da un sello válido, la de
 * respaldo. NUNCA lanza. Sin respaldo concedido, devuelve el resultado de la
 * principal con los dos errores. (La cola, en cambio, insiste 24 h con la
 * principal antes de ir al respaldo: `procesarSello`.)
 */
export declare function sellar(huella: string, config: ConfigSellado, opciones?: OpcionesSellar): Promise<SelloTiempo>;
/** Resumen para guardar en el objeto sellado (lo que se pinta). */
export declare function resumenSello(id: string, sello: SelloTiempo): {
    id: string;
    estado: EstadoSello;
    genTime: Date | null;
    tsa: string;
    cualificada: boolean;
};
/** Raíz de Merkle (hex) de una lista de huellas (hex). Sin hojas, SHA-256 de nada. */
export declare function raizMerkle(hojas: string[]): string;
/** Ruta de auditoría de la hoja `indice`, de abajo arriba. */
export declare function rutaMerkle(hojas: string[], indice: number): PasoRuta[];
/** Comprueba que `hoja` (huella hex) pertenece al árbol de raíz `raiz` con esa ruta. */
export declare function verificarRutaMerkle(hoja: string, ruta: PasoRuta[], raiz: string): boolean;
export declare const merkle: {
    raiz: typeof raizMerkle;
    ruta: typeof rutaMerkle;
    verificarRuta: typeof verificarRutaMerkle;
};
export interface DatosPaquete {
    /** Nombre del documento sellado, tal como lo tendrá quien verifica. */
    documentoNombre?: string | null;
    /** El sello con su token: el individual o, en un lote, el de la RAÍZ. */
    sello: SelloTiempo;
    /** Si lo sellado es un manifiesto (objeto → JSON canónico, o el texto exacto). */
    manifiesto?: unknown;
    /** En un lote: la huella de la hoja y su lugar en el lote. */
    hoja?: {
        huella: string;
        lote: LoteSello;
    } | null;
    raicesPem: string[];
}
/**
 * Ficheros para verificar un sello sin la app: `<nombre>.tsr`, `tsa.pem` (los
 * certificados del token), `raiz.pem`, `LEEME.txt` con el comando de openssl
 * y, si procede, `manifiesto.json` o `lote.json` + `verificar-lote.js`.
 * El documento NO va dentro: lo añade quien arma el ZIP.
 */
export declare function paqueteVerificacion(datos: DatosPaquete): {
    [fichero: string]: Buffer;
};
/** Lo mínimo de Firestore que usa la cola (firebase-admin 12 o 14 encaja). */
export interface DocSnapSello {
    readonly id: string;
    readonly exists: boolean;
    data(): any;
}
export interface DocRefSello {
    readonly id: string;
    get(): Promise<DocSnapSello>;
    set(datos: any): Promise<any>;
    update(datos: any): Promise<any>;
}
export interface ConsultaSello {
    where(campo: string, operador: any, valor: any): ConsultaSello;
    get(): Promise<{
        docs: DocSnapSello[];
    }>;
}
export interface ColeccionSello extends ConsultaSello {
    doc(id?: string): DocRefSello;
}
export interface TransaccionSello {
    get(ref: DocRefSello): Promise<DocSnapSello>;
    set(ref: DocRefSello, datos: any): any;
    update(ref: DocRefSello, datos: any): any;
}
export interface LoteEscrituraSello {
    update(ref: DocRefSello, datos: any): any;
    commit(): Promise<any>;
}
export interface FirestoreSello {
    collection(ruta: string): ColeccionSello;
    runTransaction<T>(funcion: (t: TransaccionSello) => Promise<T>): Promise<T>;
    batch(): LoteEscrituraSello;
}
/** Qué se ha sellado: el tipo, la ruta del documento o del objeto de Storage y su id. */
export interface ObjetoSellado {
    tipo: string;
    ruta: string | null;
    id: string | null;
}
export interface DatosEncolar {
    tipo: string;
    huella: string;
    objeto: ObjetoSellado;
    /** Id del dueño con el nombre de campo de la app: { clinicId: 'x' }, { tenantId: 'y' }. */
    ambito?: {
        [campo: string]: string | null;
    } | null;
    /** Por defecto, `config.porTipo[tipo]` o 'individual'. */
    modo?: ModoSello | null;
    config: ConfigSellado;
    /** Id determinista (idempotencia): si ya existe, no se toca y se devuelve. */
    id?: string | null;
    ahora?: () => Date;
}
/**
 * Apunta un sello en la cola y devuelve su id (null si el sellado está
 * apagado). Lanza ante datos mal formados (es un error de programación) o si
 * Firestore falla: quien lo llama lo envuelve para que el documento salga igual.
 */
export declare function encolarSello(db: FirestoreSello, datos: DatosEncolar): Promise<string | null>;
export interface OpcionesProceso {
    config: ConfigSellado;
    credenciales?: CredencialesTsa | null;
    timeoutMs?: number;
    espaciadoMs?: number;
    /** Ignora la espera entre reintentos (no el cerrojo de «en curso»). */
    forzar?: boolean;
    ahora?: () => Date;
}
export interface ResultadoProceso {
    id: string;
    accion: 'concedido' | 'respaldo' | 'reintento' | 'omitido';
    estado: EstadoSello | null;
    motivo: string | null;
}
/**
 * Procesa un sello de la cola: lo pide a la principal; si falla, programa el
 * reintento (1, 5, 15 min, 1 h, 6 h…). Pasadas 24 h desde que se pidió, usa
 * el respaldo; si la principal es cualificada y el respaldo no, marca
 * `faltaCualificado` y sigue intentando la principal cada 6 h; cuando llega,
 * pasa a ser el sello del documento y el de respaldo queda en `adicionales`.
 */
export declare function procesarSello(db: FirestoreSello, id: string, opciones: OpcionesProceso): Promise<ResultadoProceso>;
export interface OpcionesPendientes extends OpcionesProceso {
    /** Máximo de sellos por pasada (por defecto 50). */
    max?: number;
}
/**
 * Pasada del cron: procesa, de uno en uno y espaciados (≥ 1,1 s por TSA), los
 * sellos individuales pendientes cuyo reintento ya toca y los que esperan el
 * cualificado. Devuelve el recuento.
 */
export declare function procesarPendientes(db: FirestoreSello, opciones: OpcionesPendientes): Promise<{
    revisados: number;
    procesados: number;
    concedidos: number;
    respaldos: number;
    reintentos: number;
}>;
export interface DatosCierreLote extends OpcionesProceso {
    tipo: string;
    /** Entran las hojas pedidas hasta este instante (incluido). */
    hasta: Date;
    /** Guarda la lista de hojas (solo huellas) donde la app quiera; devuelve su ruta. */
    guardarHojas?: ((loteId: string, hojas: string[]) => Promise<string | null>) | null;
}
/**
 * Cron diario de un tipo en modo lote: toma sus hojas pendientes, calcula la
 * raíz de Merkle, apunta en cada hoja su lugar en el lote y encola la raíz
 * como UN sello individual (que se pide al momento y, si falla, reintenta la
 * cola como cualquier otro). Devuelve null si no había hojas.
 */
export declare function cerrarLote(db: FirestoreSello, datos: DatosCierreLote): Promise<{
    loteId: string;
    selloId: string;
    n: number;
    raiz: string;
    estado: EstadoSello | null;
} | null>;
//# sourceMappingURL=selloTiempo.d.ts.map