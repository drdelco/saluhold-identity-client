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

import {
  constants as constantesCrypto,
  createHash,
  randomBytes,
  verify as verificarFirmaCrypto,
  X509Certificate,
} from 'node:crypto';

// ═══════════════════════════════════════════════════════════════════════════
// Tipos públicos
// ═══════════════════════════════════════════════════════════════════════════

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

export type AutenticacionTsa =
  | { tipo: 'ninguna' }
  /** Usuario y contraseña en la cabecera `Authorization: Basic`. `secreto` es
   *  la CLAVE del mapa de credenciales (p. ej. 'TSA_CUALIFICADA'), no el valor. */
  | { tipo: 'basica'; secreto: string };

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
  porTipo?: { [tipo: string]: ModoSello } | null;
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

// ═══════════════════════════════════════════════════════════════════════════
// Constantes
// ═══════════════════════════════════════════════════════════════════════════

export const COLECCION_SELLOS = 'sellos_tiempo';
export const COLECCION_LOTES = 'sellos_tiempo_lotes';

const TIMEOUT_POR_DEFECTO_MS = 8000;
/** FreeTSA admite 1 petición por segundo por IP: la cola espacia 1,1 s. */
export const ESPACIADO_COLA_MS = 1100;
/** Espera entre reintentos, en minutos: 1, 5, 15, 1 h y, desde ahí, cada 6 h. */
export const ESPERAS_REINTENTO_MIN = [1, 5, 15, 60, 360];
/** Pasado este tiempo sin la TSA principal, la cola sella con el respaldo. */
export const PLAZO_RESPALDO_MS = 24 * 60 * 60 * 1000;
const TAMANO_MAXIMO_RESPUESTA = 1024 * 1024;

const OID = {
  sha1: '1.3.14.3.2.26',
  sha224: '2.16.840.1.101.3.4.2.4',
  sha256: '2.16.840.1.101.3.4.2.1',
  sha384: '2.16.840.1.101.3.4.2.2',
  sha512: '2.16.840.1.101.3.4.2.3',
  rsa: '1.2.840.113549.1.1.1',
  rsaPss: '1.2.840.113549.1.1.10',
  ecPublicKey: '1.2.840.10045.2.1',
  ed25519: '1.3.101.112',
  signedData: '1.2.840.113549.1.7.2',
  tstInfo: '1.2.840.113549.1.9.16.1.4',
  atrContentType: '1.2.840.113549.1.9.3',
  atrMessageDigest: '1.2.840.113549.1.9.4',
  atrSigningCertificate: '1.2.840.113549.1.9.16.2.12',
  atrSigningCertificateV2: '1.2.840.113549.1.9.16.2.47',
  extEku: '2.5.29.37',
  extSki: '2.5.29.14',
  ekuTimeStamping: '1.3.6.1.5.5.7.3.8',
};

const HASH_POR_OID: { [oid: string]: string } = {
  '1.3.14.3.2.26': 'sha1',
  '2.16.840.1.101.3.4.2.4': 'sha224',
  '2.16.840.1.101.3.4.2.1': 'sha256',
  '2.16.840.1.101.3.4.2.2': 'sha384',
  '2.16.840.1.101.3.4.2.3': 'sha512',
};

/** Algoritmos de firma con su hash y su familia de clave. */
const FIRMA_POR_OID: { [oid: string]: { hash: string | null; clave: string } } = {
  '1.2.840.113549.1.1.5': { hash: 'sha1', clave: 'rsa' },
  '1.2.840.113549.1.1.14': { hash: 'sha224', clave: 'rsa' },
  '1.2.840.113549.1.1.11': { hash: 'sha256', clave: 'rsa' },
  '1.2.840.113549.1.1.12': { hash: 'sha384', clave: 'rsa' },
  '1.2.840.113549.1.1.13': { hash: 'sha512', clave: 'rsa' },
  '1.2.840.113549.1.1.1': { hash: null, clave: 'rsa' },
  '1.2.840.10045.4.3.1': { hash: 'sha224', clave: 'ec' },
  '1.2.840.10045.4.3.2': { hash: 'sha256', clave: 'ec' },
  '1.2.840.10045.4.3.3': { hash: 'sha384', clave: 'ec' },
  '1.2.840.10045.4.3.4': { hash: 'sha512', clave: 'ec' },
  '1.2.840.10045.2.1': { hash: null, clave: 'ec' },
};

// ═══════════════════════════════════════════════════════════════════════════
// Huellas
// ═══════════════════════════════════════════════════════════════════════════

function sha256(datos: Buffer | Uint8Array): Buffer {
  return createHash('sha256').update(datos).digest();
}

/** SHA-256 en hex de unos bytes (un string se toma en UTF-8). */
export function huellaDeBytes(datos: Buffer | Uint8Array | string): string {
  const buf = typeof datos === 'string' ? Buffer.from(datos, 'utf8') : datos;
  return createHash('sha256').update(buf).digest('hex');
}

/** Lo mínimo de un flujo legible (un `Readable` de Node, un fichero de Storage). */
export interface FlujoLegible {
  on(evento: string, oyente: (...args: any[]) => void): any;
}

/**
 * SHA-256 de un flujo, sin cargarlo en memoria (grabaciones, objetos de
 * Storage). Devuelve también los bytes leídos, que van en el manifiesto.
 */
export function huellaDeFlujo(flujo: FlujoLegible): Promise<{ huella: string; bytes: number }> {
  return new Promise((resolver, rechazar) => {
    const hash = createHash('sha256');
    let bytes = 0;
    flujo.on('data', (trozo: Buffer | Uint8Array | string) => {
      const buf = typeof trozo === 'string' ? Buffer.from(trozo, 'utf8') : trozo;
      bytes += buf.length;
      hash.update(buf);
    });
    flujo.on('error', (e: unknown) => rechazar(e));
    flujo.on('end', () => resolver({ huella: hash.digest('hex'), bytes }));
  });
}

/**
 * JSON canónico al estilo RFC 8785: claves ordenadas (por unidades UTF-16,
 * como manda la RFC), sin espacios, números como los escribe JavaScript.
 * Una propiedad `undefined` NO aparece (igual que en JSON); en un array, un
 * `undefined` es `null`. `toJSON` se respeta (una `Date` sale en ISO).
 * Un número no finito o un BigInt lanzan: no tienen forma canónica.
 */
export function jsonCanonico(valor: unknown): string {
  const texto = canonizar(valor);
  if (texto === null) throw new Error('json_canonico: valor sin representación');
  return texto;
}

function canonizar(valor: unknown): string | null {
  let v: any = valor;
  if (v !== null && typeof v === 'object' && typeof v.toJSON === 'function') v = v.toJSON();
  if (v === null) return 'null';
  switch (typeof v) {
    case 'string':
      return JSON.stringify(v);
    case 'boolean':
      return v ? 'true' : 'false';
    case 'number':
      if (!isFinite(v)) throw new Error('json_canonico: número no finito');
      return JSON.stringify(v);
    case 'object': {
      if (Array.isArray(v)) {
        return '[' + v.map((x: unknown) => {
          const c = canonizar(x);
          return c === null ? 'null' : c;
        }).join(',') + ']';
      }
      const partes: string[] = [];
      const claves = Object.keys(v).sort();
      for (let i = 0; i < claves.length; i++) {
        const c = canonizar(v[claves[i]]);
        if (c !== null) partes.push(JSON.stringify(claves[i]) + ':' + c);
      }
      return '{' + partes.join(',') + '}';
    }
    case 'undefined':
    case 'function':
    case 'symbol':
      return null;
    default:
      throw new Error('json_canonico: tipo no admitido (' + typeof v + ')');
  }
}

/** SHA-256 en hex del JSON canónico de un dato estructurado. */
export function huellaCanonica(valor: unknown): string {
  return huellaDeBytes(jsonCanonico(valor));
}

function huellaValida(huella: unknown): boolean {
  return typeof huella === 'string' && /^[0-9a-fA-F]{64}$/.test(huella);
}

// ═══════════════════════════════════════════════════════════════════════════
// DER: escritura (la petición) y lectura mínima (la respuesta y los certificados)
// ═══════════════════════════════════════════════════════════════════════════

function derLongitud(largo: number): Buffer {
  if (largo < 0x80) return Buffer.from([largo]);
  const bytes: number[] = [];
  let n = largo;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n = Math.floor(n / 256);
  }
  return Buffer.from([0x80 | bytes.length].concat(bytes));
}

function tlv(tag: number, valor: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLongitud(valor.length), valor]);
}

function derEntero(bytes: Buffer): Buffer {
  let inicio = 0;
  while (inicio < bytes.length - 1 && bytes[inicio] === 0) inicio++;
  let b = bytes.subarray(inicio);
  if (b.length === 0) b = Buffer.from([0]);
  if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]);
  return tlv(0x02, b);
}

function derOid(oid: string): Buffer {
  const partes = oid.split('.').map((x) => parseInt(x, 10));
  const bytes: number[] = [partes[0] * 40 + partes[1]];
  for (let i = 2; i < partes.length; i++) {
    let n = partes[i];
    const grupo: number[] = [n & 0x7f];
    n = Math.floor(n / 128);
    while (n > 0) {
      grupo.unshift((n & 0x7f) | 0x80);
      n = Math.floor(n / 128);
    }
    for (let j = 0; j < grupo.length; j++) bytes.push(grupo[j]);
  }
  return tlv(0x06, Buffer.from(bytes));
}

interface NodoDer {
  tag: number;
  inicio: number;
  cabecera: number;
  fin: number;
  buf: Buffer;
}

function leerNodo(buf: Buffer, inicio: number, limite: number): NodoDer {
  if (inicio + 2 > limite) throw new Error('der_truncado');
  const tag = buf[inicio];
  if ((tag & 0x1f) === 0x1f) throw new Error('der_etiqueta_larga');
  let largo = buf[inicio + 1];
  let cabecera = 2;
  if (largo & 0x80) {
    const n = largo & 0x7f;
    if (n === 0 || n > 4) throw new Error('der_longitud_no_valida');
    if (inicio + 2 + n > limite) throw new Error('der_truncado');
    largo = 0;
    for (let i = 0; i < n; i++) largo = largo * 256 + buf[inicio + 2 + i];
    cabecera = 2 + n;
  }
  const fin = inicio + cabecera + largo;
  if (fin > limite) throw new Error('der_truncado');
  return { tag, inicio, cabecera, fin, buf };
}

function derRaiz(buf: Buffer): NodoDer {
  const n = leerNodo(buf, 0, buf.length);
  if (n.fin !== buf.length) throw new Error('der_bytes_sobrantes');
  return n;
}

function valorDe(n: NodoDer): Buffer {
  return n.buf.subarray(n.inicio + n.cabecera, n.fin);
}

function bytesDe(n: NodoDer): Buffer {
  return n.buf.subarray(n.inicio, n.fin);
}

function hijosDe(n: NodoDer): NodoDer[] {
  const hijos: NodoDer[] = [];
  let p = n.inicio + n.cabecera;
  while (p < n.fin) {
    const h = leerNodo(n.buf, p, n.fin);
    hijos.push(h);
    p = h.fin;
  }
  return hijos;
}

function exigir(n: NodoDer | undefined, tag: number, que: string): NodoDer {
  if (!n || n.tag !== tag) throw new Error('der_inesperado: ' + que);
  return n;
}

function oidDe(n: NodoDer): string {
  const v = valorDe(exigir(n, 0x06, 'oid'));
  if (v.length === 0) throw new Error('der_oid_vacio');
  const subs: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < v.length; i++) {
    acumulado = acumulado * 128 + (v[i] & 0x7f);
    if (!(v[i] & 0x80)) {
      subs.push(acumulado);
      acumulado = 0;
    }
  }
  const x = subs[0] < 40 ? 0 : subs[0] < 80 ? 1 : 2;
  return [x, subs[0] - 40 * x].concat(subs.slice(1)).join('.');
}

/** Hex del valor de un INTEGER, sin los ceros de relleno a la izquierda. */
function enteroHex(n: NodoDer): string {
  const v = valorDe(n);
  let inicio = 0;
  while (inicio < v.length - 1 && v[inicio] === 0) inicio++;
  return v.subarray(inicio).toString('hex');
}

function enteroNumero(v: Buffer): number {
  let r = 0;
  for (let i = 0; i < v.length; i++) r = r * 256 + v[i];
  return r;
}

/** Compara dos enteros en hex por su valor (sin ceros a la izquierda). */
function mismoEnteroHex(a: string | null, b: string | null): boolean {
  if (a == null || b == null) return false;
  const na = String(a).toLowerCase().replace(/^0x/, '').replace(/^0+/, '');
  const nb = String(b).toLowerCase().replace(/^0x/, '').replace(/^0+/, '');
  return na === nb;
}

function tiempoGeneralizado(n: NodoDer): Date {
  const t = valorDe(exigir(n, 0x18, 'GeneralizedTime')).toString('latin1');
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:[.,](\d+))?Z$/.exec(t);
  if (!m) throw new Error('der_fecha_no_valida');
  const ms = m[7] ? Math.floor(parseInt((m[7] + '000').slice(0, 3), 10)) : 0;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], ms));
}

function pemADer(pem: string): Buffer[] {
  const ders: Buffer[] = [];
  const re = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g;
  let m = re.exec(pem);
  while (m) {
    ders.push(Buffer.from(m[1].replace(/[^A-Za-z0-9+/=]/g, ''), 'base64'));
    m = re.exec(pem);
  }
  return ders;
}

function derAPem(der: Buffer): string {
  const b64 = der.toString('base64');
  const lineas: string[] = [];
  for (let i = 0; i < b64.length; i += 64) lineas.push(b64.slice(i, i + 64));
  return '-----BEGIN CERTIFICATE-----\n' + lineas.join('\n') + '\n-----END CERTIFICATE-----\n';
}

// ═══════════════════════════════════════════════════════════════════════════
// Petición RFC 3161
// ═══════════════════════════════════════════════════════════════════════════

/** Nonce aleatorio de 64 bits (positivo), en hex. */
export function nuevoNonce(): string {
  const b = randomBytes(8);
  b[0] &= 0x7f;
  if (b[0] === 0) b[0] = 1;
  return b.toString('hex');
}

/**
 * TimeStampReq DER para una huella SHA-256 (RFC 3161 §2.4.1): versión 1,
 * messageImprint SHA-256, nonce (si se da) y certReq = TRUE, para que el
 * certificado de la TSA viaje en el token y se pueda verificar sin red.
 */
export function peticionRfc3161(huella: string, opciones?: { nonce?: string | null }): Buffer {
  if (!huellaValida(huella)) throw new Error('huella_no_valida');
  const algoritmo = tlv(0x30, Buffer.concat([derOid(OID.sha256), Buffer.from([0x05, 0x00])]));
  const imprint = tlv(0x30, Buffer.concat([algoritmo, tlv(0x04, Buffer.from(huella, 'hex'))]));
  const partes: Buffer[] = [derEntero(Buffer.from([1])), imprint];
  const nonce = opciones && opciones.nonce ? String(opciones.nonce).replace(/^0x/i, '') : null;
  if (nonce) {
    if (!/^[0-9a-fA-F]+$/.test(nonce)) throw new Error('nonce_no_valido');
    partes.push(derEntero(Buffer.from(nonce.length % 2 ? '0' + nonce : nonce, 'hex')));
  }
  partes.push(tlv(0x01, Buffer.from([0xff])));
  return tlv(0x30, Buffer.concat(partes));
}

// ═══════════════════════════════════════════════════════════════════════════
// Lectura de la respuesta
// ═══════════════════════════════════════════════════════════════════════════

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
export function leerRespuesta(der: Buffer | Uint8Array): RespuestaTsa {
  const buf = Buffer.isBuffer(der) ? der : Buffer.from(der);
  const raiz = exigir(derRaiz(buf), 0x30, 'respuesta');
  const partes = hijosDe(raiz);
  const r: RespuestaTsa = {
    pkiStatus: 0, estadoTexto: null, fallo: null, token: null, tipoContenido: null,
    tstInfo: null, tstInfoDer: null, certs: [], signerInfo: null,
  };
  let tokenNodo: NodoDer | null = null;
  if (partes[0] && partes[0].tag === 0x06) {
    tokenNodo = raiz; // token suelto (ContentInfo)
  } else {
    const estado = hijosDe(exigir(partes[0], 0x30, 'PKIStatusInfo'));
    r.pkiStatus = enteroNumero(valorDe(exigir(estado[0], 0x02, 'PKIStatus')));
    for (let i = 1; i < estado.length; i++) {
      if (estado[i].tag === 0x30) {
        r.estadoTexto = hijosDe(estado[i]).map((t) => valorDe(t).toString('utf8')).join(' ') || null;
      } else if (estado[i].tag === 0x03) {
        r.fallo = valorDe(estado[i]).toString('hex');
      }
    }
    tokenNodo = partes[1] ? exigir(partes[1], 0x30, 'TimeStampToken') : null;
  }
  if (!tokenNodo) return r;
  r.token = Buffer.from(bytesDe(tokenNodo));

  const ci = hijosDe(tokenNodo);
  if (oidDe(ci[0]) !== OID.signedData) throw new Error('der_inesperado: no es SignedData');
  const sd = hijosDe(exigir(hijosDe(exigir(ci[1], 0xa0, 'content'))[0], 0x30, 'SignedData'));
  const encap = hijosDe(exigir(sd[2], 0x30, 'encapContentInfo'));
  r.tipoContenido = oidDe(encap[0]);
  const eContent = exigir(hijosDe(exigir(encap[1], 0xa0, 'eContent'))[0], 0x04, 'eContent OCTET STRING');
  r.tstInfoDer = Buffer.from(valorDe(eContent));

  for (let i = 3; i < sd.length; i++) {
    if (sd[i].tag === 0xa0) {
      const certs = hijosDe(sd[i]);
      for (let j = 0; j < certs.length; j++) {
        if (certs[j].tag === 0x30) r.certs.push(Buffer.from(bytesDe(certs[j])));
      }
    } else if (sd[i].tag === 0x31) {
      const firmantes = hijosDe(sd[i]);
      if (firmantes.length > 0) r.signerInfo = leerSignerInfo(firmantes[0]);
    }
  }
  r.tstInfo = leerTstInfo(r.tstInfoDer);
  return r;
}

function leerTstInfo(der: Buffer): TstInfo {
  const t = hijosDe(exigir(derRaiz(der), 0x30, 'TSTInfo'));
  const imprint = hijosDe(exigir(t[2], 0x30, 'messageImprint'));
  const genTime = tiempoGeneralizado(t[4]);
  const info: TstInfo = {
    version: enteroNumero(valorDe(exigir(t[0], 0x02, 'versión'))),
    politica: oidDe(t[1]),
    algoritmoHuella: oidDe(hijosDe(exigir(imprint[0], 0x30, 'algoritmo'))[0]),
    huella: valorDe(exigir(imprint[1], 0x04, 'huella')).toString('hex'),
    serie: enteroHex(exigir(t[3], 0x02, 'serie')),
    genTime,
    genTimeIso: genTime.toISOString(),
    precisionMs: null,
    ordenado: false,
    nonce: null,
  };
  for (let i = 5; i < t.length; i++) {
    const n = t[i];
    if (n.tag === 0x30) {
      let ms = 0;
      const ps = hijosDe(n);
      for (let j = 0; j < ps.length; j++) {
        const v = enteroNumero(valorDe(ps[j]));
        if (ps[j].tag === 0x02) ms += v * 1000;
        else if (ps[j].tag === 0x80) ms += v;
        else if (ps[j].tag === 0x81) ms += v / 1000;
      }
      info.precisionMs = ms;
    } else if (n.tag === 0x01) {
      info.ordenado = valorDe(n)[0] !== 0;
    } else if (n.tag === 0x02) {
      info.nonce = enteroHex(n);
    }
  }
  return info;
}

function leerSignerInfo(n: NodoDer): SignerInfoTsa {
  const p = hijosDe(exigir(n, 0x30, 'SignerInfo'));
  const si: SignerInfoTsa = {
    version: enteroNumero(valorDe(exigir(p[0], 0x02, 'versión'))),
    algoritmoResumen: '',
    algoritmoFirma: '',
    parametrosFirma: null,
    firma: Buffer.alloc(0),
    atributosFirmados: null,
    sidSerie: null,
    sidEmisor: null,
    sidSki: null,
  };
  if (p[1].tag === 0x30) {
    const ias = hijosDe(p[1]);
    si.sidEmisor = Buffer.from(bytesDe(ias[0]));
    si.sidSerie = enteroHex(exigir(ias[1], 0x02, 'serie'));
  } else if (p[1].tag === 0x80) {
    si.sidSki = valorDe(p[1]).toString('hex');
  } else {
    throw new Error('der_inesperado: sid');
  }
  si.algoritmoResumen = oidDe(hijosDe(exigir(p[2], 0x30, 'digestAlgorithm'))[0]);
  let i = 3;
  if (p[i] && p[i].tag === 0xa0) {
    si.atributosFirmados = Buffer.from(bytesDe(p[i]));
    i++;
  }
  const alg = hijosDe(exigir(p[i], 0x30, 'signatureAlgorithm'));
  si.algoritmoFirma = oidDe(alg[0]);
  si.parametrosFirma = alg[1] && alg[1].tag !== 0x05 ? Buffer.from(bytesDe(alg[1])) : null;
  si.firma = Buffer.from(valorDe(exigir(p[i + 1], 0x04, 'firma')));
  return si;
}

// ═══════════════════════════════════════════════════════════════════════════
// Certificados
// ═══════════════════════════════════════════════════════════════════════════

interface ExtensionCert {
  oid: string;
  critica: boolean;
  valor: Buffer;
}

interface CertAnalizado {
  der: Buffer;
  x509: X509Certificate;
  serie: string;
  emisorDer: Buffer;
  extensiones: ExtensionCert[];
}

function analizarCert(der: Buffer): CertAnalizado | null {
  try {
    const tbs = hijosDe(exigir(hijosDe(exigir(derRaiz(der), 0x30, 'cert'))[0], 0x30, 'tbs'));
    const i = tbs[0].tag === 0xa0 ? 1 : 0;
    const extensiones: ExtensionCert[] = [];
    for (let k = i + 6; k < tbs.length; k++) {
      if (tbs[k].tag !== 0xa3) continue;
      const lista = hijosDe(exigir(hijosDe(tbs[k])[0], 0x30, 'extensiones'));
      for (let j = 0; j < lista.length; j++) {
        const e = hijosDe(lista[j]);
        const critica = e.length === 3 && e[1].tag === 0x01 && valorDe(e[1])[0] !== 0;
        extensiones.push({ oid: oidDe(e[0]), critica, valor: Buffer.from(valorDe(e[e.length - 1])) });
      }
    }
    return {
      der,
      x509: new X509Certificate(der),
      serie: enteroHex(exigir(tbs[i], 0x02, 'serie')),
      emisorDer: Buffer.from(bytesDe(tbs[i + 2])),
      extensiones,
    };
  } catch (_e) {
    return null;
  }
}

function skiDe(c: CertAnalizado): string | null {
  for (let i = 0; i < c.extensiones.length; i++) {
    if (c.extensiones[i].oid === OID.extSki) {
      try {
        return valorDe(derRaiz(c.extensiones[i].valor)).toString('hex');
      } catch (_e) {
        return null;
      }
    }
  }
  return null;
}

function vigenteEn(c: CertAnalizado, instante: Date): boolean {
  const t = instante.getTime();
  return new Date(c.x509.validFrom).getTime() <= t && t <= new Date(c.x509.validTo).getTime();
}

function emite(emisor: CertAnalizado, hijo: CertAnalizado): boolean {
  try {
    return hijo.x509.checkIssued(emisor.x509) && hijo.x509.verify(emisor.x509.publicKey);
  } catch (_e) {
    return false;
  }
}

function lineaDn(dn: string): string {
  return String(dn || '').split('\n').filter(Boolean).join(', ');
}

function resumenFirmante(c: CertAnalizado): FirmanteSello {
  return {
    sujeto: lineaDn(c.x509.subject),
    emisor: lineaDn(c.x509.issuer),
    serie: c.serie,
    sha256Cert: sha256(c.der).toString('hex'),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Verificación completa
// ═══════════════════════════════════════════════════════════════════════════

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
export function verificarSello(der: Buffer | Uint8Array, opciones: OpcionesVerificacion): ResultadoVerificacion {
  const motivos: string[] = [];
  const fin = (genTime: Date | null, firmante: FirmanteSello | null, tst: TstInfo | null): ResultadoVerificacion =>
    ({ ok: motivos.length === 0, motivos, genTime, firmante, tstInfo: tst });

  let r: RespuestaTsa;
  try {
    r = leerRespuesta(der);
  } catch (_e) {
    motivos.push('respuesta_ilegible');
    return fin(null, null, null);
  }
  if (r.pkiStatus !== 0 && r.pkiStatus !== 1) {
    motivos.push('estado_no_concedido');
    return fin(null, null, null);
  }
  const tst = r.tstInfo;
  const si = r.signerInfo;
  if (!tst || !si || !r.tstInfoDer) {
    motivos.push('sin_token');
    return fin(null, null, null);
  }

  // 1-3. Contenido del TSTInfo.
  if (r.tipoContenido !== OID.tstInfo) motivos.push('contenido_no_tstinfo');
  if (tst.algoritmoHuella !== OID.sha256) motivos.push('algoritmo_huella_no_sha256');
  if (!huellaValida(opciones.huella) || tst.huella !== String(opciones.huella).toLowerCase()) {
    motivos.push('huella_distinta');
  }
  if (opciones.nonce != null && opciones.nonce !== '') {
    if (tst.nonce == null) motivos.push('nonce_ausente');
    else if (!mismoEnteroHex(tst.nonce, opciones.nonce)) motivos.push('nonce_distinto');
  }

  // Certificados: los del token + los intermedios que diga la configuración.
  const delToken: CertAnalizado[] = [];
  for (let i = 0; i < r.certs.length; i++) {
    const c = analizarCert(r.certs[i]);
    if (c) delToken.push(c);
  }
  const extra = pemsACerts(opciones.certificados || []);
  const raices = pemsACerts(opciones.raices || []);
  const candidatos = delToken.concat(extra);

  const firmante = buscarFirmante(si, candidatos);
  if (!firmante) {
    motivos.push('firmante_no_encontrado');
    return fin(tst.genTime, null, tst);
  }

  // 4-6. Atributos firmados y firma.
  if (!si.atributosFirmados) {
    motivos.push('sin_atributos_firmados');
  } else {
    comprobarAtributos(si, r.tstInfoDer, firmante, motivos);
    const firma = firmaValida(si, firmante);
    if (firma === null) motivos.push('algoritmo_firma_no_soportado');
    else if (!firma) motivos.push('firma_invalida');
  }

  // 7. Uso extendido, vigencia y cadena.
  comprobarEku(firmante, motivos);
  if (!vigenteEn(firmante, tst.genTime)) motivos.push('firmante_no_vigente_en_gentime');
  const instante = opciones.instante || tst.genTime;
  if (raices.length === 0) {
    motivos.push('sin_raices');
  } else {
    comprobarCadena(firmante, candidatos, raices, instante, motivos);
  }
  return fin(tst.genTime, resumenFirmante(firmante), tst);
}

function pemsACerts(pems: string[]): CertAnalizado[] {
  const r: CertAnalizado[] = [];
  for (let i = 0; i < pems.length; i++) {
    const ders = pemADer(String(pems[i] || ''));
    for (let j = 0; j < ders.length; j++) {
      const c = analizarCert(ders[j]);
      if (c) r.push(c);
    }
  }
  return r;
}

function buscarFirmante(si: SignerInfoTsa, certs: CertAnalizado[]): CertAnalizado | null {
  for (let i = 0; i < certs.length; i++) {
    const c = certs[i];
    if (si.sidSerie != null && si.sidEmisor && mismoEnteroHex(c.serie, si.sidSerie) && c.emisorDer.equals(si.sidEmisor)) {
      return c;
    }
    if (si.sidSki != null && skiDe(c) === si.sidSki) return c;
  }
  return null;
}

function comprobarAtributos(si: SignerInfoTsa, tstInfoDer: Buffer, firmante: CertAnalizado, motivos: string[]): void {
  let atributos: NodoDer[];
  try {
    atributos = hijosDe(derRaiz(si.atributosFirmados as Buffer));
  } catch (_e) {
    motivos.push('atributos_ilegibles');
    return;
  }
  const valores: { [oid: string]: NodoDer } = {};
  for (let i = 0; i < atributos.length; i++) {
    try {
      const a = hijosDe(atributos[i]);
      const set = hijosDe(exigir(a[1], 0x31, 'valores del atributo'));
      if (set[0]) valores[oidDe(a[0])] = set[0];
    } catch (_e) {
      motivos.push('atributos_ilegibles');
      return;
    }
  }

  try {
    if (!valores[OID.atrContentType] || oidDe(valores[OID.atrContentType]) !== OID.tstInfo) {
      motivos.push('content_type_distinto');
    }
  } catch (_e) {
    motivos.push('content_type_distinto');
  }

  const hash = HASH_POR_OID[si.algoritmoResumen];
  const md = valores[OID.atrMessageDigest];
  if (!hash) {
    motivos.push('algoritmo_resumen_no_soportado');
  } else if (!md || md.tag !== 0x04 || !valorDe(md).equals(createHash(hash).update(tstInfoDer).digest())) {
    motivos.push('message_digest_distinto');
  }

  // ESSCertIDv2 (o ESSCertID, SHA-1): el primero tiene que ser el firmante.
  try {
    const v2 = valores[OID.atrSigningCertificateV2];
    const v1 = valores[OID.atrSigningCertificate];
    if (v2) {
      const id = hijosDe(hijosDe(exigir(v2, 0x30, 'SigningCertificateV2'))[0])[0];
      const campos = hijosDe(exigir(id, 0x30, 'ESSCertIDv2'));
      let k = 0;
      let algoritmo = 'sha256';
      if (campos[0].tag === 0x30) {
        algoritmo = HASH_POR_OID[oidDe(hijosDe(campos[0])[0])] || '';
        k = 1;
      }
      if (!algoritmo) {
        motivos.push('signing_certificate_distinto');
      } else if (!valorDe(exigir(campos[k], 0x04, 'certHash')).equals(createHash(algoritmo).update(firmante.der).digest())) {
        motivos.push('signing_certificate_distinto');
      }
    } else if (v1) {
      const id = hijosDe(hijosDe(exigir(v1, 0x30, 'SigningCertificate'))[0])[0];
      const campos = hijosDe(exigir(id, 0x30, 'ESSCertID'));
      if (!valorDe(exigir(campos[0], 0x04, 'certHash')).equals(createHash('sha1').update(firmante.der).digest())) {
        motivos.push('signing_certificate_distinto');
      }
    } else {
      motivos.push('sin_signing_certificate');
    }
  } catch (_e) {
    motivos.push('signing_certificate_distinto');
  }
}

/** true/false si se pudo comprobar; null si el algoritmo no está soportado. */
function firmaValida(si: SignerInfoTsa, firmante: CertAnalizado): boolean | null {
  const datos = Buffer.from(si.atributosFirmados as Buffer);
  datos[0] = 0x31; // RFC 5652 §5.4: se firma la codificación como SET OF
  const clave = firmante.x509.publicKey;
  const tipoClave = clave.asymmetricKeyType;
  try {
    if (si.algoritmoFirma === OID.ed25519) {
      if (tipoClave !== 'ed25519') return false;
      return verificarFirmaCrypto(null, datos, clave, si.firma);
    }
    if (si.algoritmoFirma === OID.rsaPss) {
      if (tipoClave !== 'rsa' && tipoClave !== 'rsa-pss') return false;
      let hash = 'sha1';
      let sal = 20;
      if (si.parametrosFirma) {
        const ps = hijosDe(derRaiz(si.parametrosFirma));
        for (let i = 0; i < ps.length; i++) {
          if (ps[i].tag === 0xa0) hash = HASH_POR_OID[oidDe(hijosDe(hijosDe(ps[i])[0])[0])] || '';
          else if (ps[i].tag === 0xa2) sal = enteroNumero(valorDe(hijosDe(ps[i])[0]));
        }
      }
      if (!hash) return null;
      return verificarFirmaCrypto(hash, datos, {
        key: clave,
        padding: constantesCrypto.RSA_PKCS1_PSS_PADDING,
        saltLength: sal,
      }, si.firma);
    }
    const alg = FIRMA_POR_OID[si.algoritmoFirma];
    if (!alg) return null;
    const hash = alg.hash || HASH_POR_OID[si.algoritmoResumen];
    if (!hash) return null;
    if (tipoClave !== alg.clave) return false;
    return verificarFirmaCrypto(hash, datos, clave, si.firma);
  } catch (_e) {
    return false;
  }
}

function comprobarEku(c: CertAnalizado, motivos: string[]): void {
  let eku: ExtensionCert | null = null;
  for (let i = 0; i < c.extensiones.length; i++) {
    if (c.extensiones[i].oid === OID.extEku) eku = c.extensiones[i];
  }
  if (!eku) {
    motivos.push('eku_no_timestamping');
    return;
  }
  let usos: string[] = [];
  try {
    usos = hijosDe(derRaiz(eku.valor)).map(oidDe);
  } catch (_e) {
    usos = [];
  }
  if (usos.length !== 1 || usos[0] !== OID.ekuTimeStamping) motivos.push('eku_no_timestamping');
  if (!eku.critica) motivos.push('eku_no_critica');
}

function comprobarCadena(
  firmante: CertAnalizado, candidatos: CertAnalizado[], raices: CertAnalizado[], instante: Date, motivos: string[],
): void {
  const esRaiz = (c: CertAnalizado) => raices.some((r) => r.der.equals(c.der));
  const vistos: CertAnalizado[] = [];
  let fueraDeValidez = false;
  let actual = firmante;
  for (let paso = 0; paso < 8; paso++) {
    if (!vigenteEn(actual, instante)) {
      if (actual === firmante) motivos.push('firmante_fuera_de_validez');
      else fueraDeValidez = true;
    }
    if (esRaiz(actual)) break;
    const raiz = raices.filter((r) => emite(r, actual))[0];
    if (raiz) {
      if (!vigenteEn(raiz, instante)) fueraDeValidez = true;
      break;
    }
    vistos.push(actual);
    const siguiente = candidatos.filter((c) => vistos.indexOf(c) < 0 && c.x509.ca && emite(c, actual))[0];
    if (!siguiente) {
      motivos.push('cadena_sin_raiz_de_confianza');
      break;
    }
    if (paso === 7) motivos.push('cadena_demasiado_larga');
    actual = siguiente;
  }
  if (fueraDeValidez) motivos.push('cadena_fuera_de_validez');
}

/** Vuelve a verificar un `SelloTiempo` guardado (su token contra su huella y su nonce). */
export function comprobarSello(
  sello: SelloTiempo,
  opciones: { raices: string[]; certificados?: string[] | null; instante?: Date | null },
): ResultadoVerificacion {
  if (!sello || !sello.token) {
    return { ok: false, motivos: ['sin_token'], genTime: null, firmante: null, tstInfo: null };
  }
  return verificarSello(Buffer.from(sello.token, 'base64'), {
    huella: sello.huella,
    nonce: sello.nonce,
    raices: opciones.raices,
    certificados: opciones.certificados || null,
    instante: opciones.instante || null,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Pedir un sello
// ═══════════════════════════════════════════════════════════════════════════

export interface OpcionesPeticion {
  credencial?: CredencialTsa | null;
  timeoutMs?: number;
  /** Espacio mínimo entre peticiones a la misma TSA desde este proceso. */
  espaciadoMs?: number;
  ahora?: () => Date;
}

const siguienteTurno: { [clave: string]: number } = {};

/** Reserva turno para una TSA: la reserva es síncrona, así que vale con concurrencia. */
function esperarTurno(url: string, espaciadoMs: number): Promise<void> {
  if (!espaciadoMs || espaciadoMs <= 0) return Promise.resolve();
  let clave = url;
  try {
    clave = new URL(url).host;
  } catch (_e) {
    clave = url;
  }
  const ahora = Date.now();
  const turno = Math.max(ahora, siguienteTurno[clave] || 0);
  siguienteTurno[clave] = turno + espaciadoMs;
  return turno > ahora ? new Promise<void>((resolver) => setTimeout(resolver, turno - ahora)) : Promise.resolve();
}

function selloVacio(huella: string, tsa: ConfigTsa | TsaSello, ahora: Date): SelloTiempo {
  return {
    v: 1,
    algoritmo: 'SHA-256',
    huella: String(huella || '').toLowerCase(),
    tsa: { id: String(tsa.id || ''), url: String(tsa.url || ''), cualificada: !!tsa.cualificada },
    estado: 'pendiente',
    token: null,
    genTime: null,
    genTimeIso: null,
    serie: null,
    politica: null,
    nonce: null,
    precisionMs: null,
    firmante: null,
    verificacion: null,
    lote: null,
    intentos: 0,
    ultimoError: null,
    solicitadoAt: ahora,
    concedidoAt: null,
  };
}

function cabecerasPara(tsa: ConfigTsa, credencial: CredencialTsa | null): { [k: string]: string } | string {
  const cabeceras: { [k: string]: string } = {
    'Content-Type': 'application/timestamp-query',
    Accept: 'application/timestamp-reply',
  };
  const auth = tsa.autenticacion;
  if (!auth || auth.tipo === 'ninguna') return cabeceras;
  if (auth.tipo === 'basica') {
    if (!credencial || !credencial.usuario || credencial.contrasena == null) return 'falta_credencial';
    cabeceras.Authorization = 'Basic ' + Buffer.from(credencial.usuario + ':' + credencial.contrasena, 'utf8').toString('base64');
    return cabeceras;
  }
  return 'autenticacion_no_soportada';
}

/**
 * Pide un sello a UNA TSA y lo verifica. NUNCA lanza.
 *   - concedido: la TSA lo dio y verifica entero (`verificacion.ok`).
 *   - invalido: la TSA respondió «concedido» pero el token no verifica (se
 *     guarda el token para el forense; genTime y demás quedan a null para que
 *     nadie pinte una fecha que no vale).
 *   - fallido: red, tiempo, HTTP, rechazo de la TSA o configuración.
 */
export async function pedirSello(huella: string, tsa: ConfigTsa, opciones?: OpcionesPeticion): Promise<SelloTiempo> {
  const op = opciones || {};
  const ahora = op.ahora || (() => new Date());
  const sello = selloVacio(huella, tsa || ({} as ConfigTsa), ahora());
  sello.intentos = 1;
  const fallar = (error: string): SelloTiempo => {
    sello.estado = 'fallido';
    sello.ultimoError = error.slice(0, 500);
    return sello;
  };
  try {
    if (!huellaValida(huella)) return fallar('huella_no_valida');
    if (!tsa || !tsa.url) return fallar('tsa_sin_url');
    let url: URL;
    try {
      url = new URL(tsa.url);
    } catch (_e) {
      return fallar('tsa_url_no_valida');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return fallar('tsa_url_no_valida');
    if (url.username || url.password) return fallar('tsa_url_con_credenciales');
    const cabeceras = cabecerasPara(tsa, op.credencial || null);
    if (typeof cabeceras === 'string') return fallar(cabeceras);

    const nonce = nuevoNonce();
    const peticion = peticionRfc3161(huella, { nonce });
    sello.nonce = nonce;

    await esperarTurno(tsa.url, op.espaciadoMs || 0);
    // El plazo corta la petición (abort) y, por si el fetch no lo atiende,
    // también la espera (carrera con un temporizador).
    const control = new AbortController();
    let temporizador: any = null;
    const plazo = new Promise<never>((_r, rechazar) => {
      temporizador = setTimeout(() => {
        control.abort();
        rechazar({ name: 'AbortError' });
      }, op.timeoutMs || TIMEOUT_POR_DEFECTO_MS);
    });
    let der: Buffer;
    try {
      const respuesta = await Promise.race([plazo, (async () => {
        const res = await fetch(tsa.url, {
          method: 'POST',
          headers: cabeceras,
          body: new Uint8Array(peticion),
          signal: control.signal,
        });
        return { ok: res.ok, status: res.status, cuerpo: res.ok ? await res.arrayBuffer() : null };
      })()]);
      if (!respuesta.ok || !respuesta.cuerpo) return fallar('http_' + respuesta.status);
      if (respuesta.cuerpo.byteLength > TAMANO_MAXIMO_RESPUESTA) return fallar('respuesta_demasiado_grande');
      der = Buffer.from(respuesta.cuerpo);
    } catch (e: any) {
      if (e && e.name === 'AbortError') return fallar('tiempo_agotado');
      return fallar('red: ' + String((e && e.message) || e));
    } finally {
      clearTimeout(temporizador);
    }

    let r: RespuestaTsa;
    try {
      r = leerRespuesta(der);
    } catch (e: any) {
      return fallar('respuesta_ilegible: ' + String((e && e.message) || e));
    }
    if (r.pkiStatus !== 0 && r.pkiStatus !== 1) {
      return fallar('tsa_rechaza: estado ' + r.pkiStatus + (r.estadoTexto ? ' (' + r.estadoTexto + ')' : ''));
    }

    const v = verificarSello(der, {
      huella,
      nonce,
      raices: tsa.raicesPem || [],
      certificados: tsa.certificadosPem || null,
    });
    const at = ahora();
    sello.token = der.toString('base64');
    sello.verificacion = { ok: v.ok, at, motivos: v.motivos };
    if (!v.ok) {
      sello.estado = 'invalido';
      sello.ultimoError = 'no_verifica: ' + v.motivos.join(', ');
      return sello;
    }
    const t = v.tstInfo as TstInfo;
    sello.estado = 'concedido';
    sello.genTime = t.genTime;
    sello.genTimeIso = t.genTimeIso;
    sello.serie = t.serie;
    sello.politica = t.politica;
    sello.precisionMs = t.precisionMs;
    sello.firmante = v.firmante;
    sello.concedidoAt = at;
    return sello;
  } catch (e: any) {
    return fallar('inesperado: ' + String((e && e.message) || e));
  }
}

function credencialPara(tsa: ConfigTsa, credenciales: CredencialesTsa | null | undefined): CredencialTsa | null {
  const auth = tsa && tsa.autenticacion;
  if (!auth || auth.tipo !== 'basica' || !credenciales) return null;
  return credenciales[auth.secreto] || null;
}

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
export async function sellar(huella: string, config: ConfigSellado, opciones?: OpcionesSellar): Promise<SelloTiempo> {
  const op = opciones || {};
  const ahora = op.ahora || (() => new Date());
  if (!config || !config.activo || !config.principal) {
    const s = selloVacio(huella, (config && config.principal) || ({} as ConfigTsa), ahora());
    s.estado = 'fallido';
    s.ultimoError = 'sellado_inactivo';
    return s;
  }
  const pedir = (tsa: ConfigTsa) => pedirSello(huella, tsa, {
    credencial: credencialPara(tsa, op.credenciales), timeoutMs: op.timeoutMs, espaciadoMs: op.espaciadoMs, ahora,
  });
  const principal = await pedir(config.principal);
  if (principal.estado === 'concedido' || !config.respaldo) return principal;
  const respaldo = await pedir(config.respaldo);
  if (respaldo.estado === 'concedido') return respaldo;
  principal.ultimoError = (principal.ultimoError || '') + ' | respaldo: ' + (respaldo.ultimoError || '');
  return principal;
}

/** Resumen para guardar en el objeto sellado (lo que se pinta). */
export function resumenSello(id: string, sello: SelloTiempo): {
  id: string; estado: EstadoSello; genTime: Date | null; tsa: string; cualificada: boolean;
} {
  return {
    id,
    estado: sello.estado,
    genTime: sello.genTime || null,
    tsa: sello.tsa ? sello.tsa.id : '',
    cualificada: !!(sello.tsa && sello.tsa.cualificada),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Merkle (RFC 6962): hoja = H(0x00‖x), nodo = H(0x01‖izq‖dcha)
// ═══════════════════════════════════════════════════════════════════════════

function hojaMerkle(huella: string): Buffer {
  if (!/^[0-9a-fA-F]*$/.test(huella) || huella.length % 2) throw new Error('merkle: hoja no es hex');
  return sha256(Buffer.concat([Buffer.from([0]), Buffer.from(huella, 'hex')]));
}

function nodoMerkle(i: Buffer, d: Buffer): Buffer {
  return sha256(Buffer.concat([Buffer.from([1]), i, d]));
}

/**
 * Niveles del árbol, de las hojas a la raíz. Un nodo sin pareja sube tal cual:
 * es la misma raíz que la definición recursiva de la RFC 6962 (el subárbol
 * izquierdo es la mayor potencia de dos menor que n).
 */
function nivelesMerkle(hojas: string[]): Buffer[][] {
  const niveles: Buffer[][] = [hojas.map(hojaMerkle)];
  while (niveles[niveles.length - 1].length > 1) {
    const abajo = niveles[niveles.length - 1];
    const arriba: Buffer[] = [];
    for (let i = 0; i < abajo.length; i += 2) {
      arriba.push(i + 1 < abajo.length ? nodoMerkle(abajo[i], abajo[i + 1]) : abajo[i]);
    }
    niveles.push(arriba);
  }
  return niveles;
}

function rutaEnNiveles(niveles: Buffer[][], indice: number): PasoRuta[] {
  const ruta: PasoRuta[] = [];
  let i = indice;
  for (let n = 0; n < niveles.length - 1; n++) {
    const nivel = niveles[n];
    const hermano = i % 2 === 0 ? i + 1 : i - 1;
    if (hermano < nivel.length) {
      ruta.push({ lado: i % 2 === 0 ? 'd' : 'i', huella: nivel[hermano].toString('hex') });
    }
    i = Math.floor(i / 2);
  }
  return ruta;
}

/** Raíz de Merkle (hex) de una lista de huellas (hex). Sin hojas, SHA-256 de nada. */
export function raizMerkle(hojas: string[]): string {
  if (!hojas.length) return sha256(Buffer.alloc(0)).toString('hex');
  const niveles = nivelesMerkle(hojas);
  return niveles[niveles.length - 1][0].toString('hex');
}

/** Ruta de auditoría de la hoja `indice`, de abajo arriba. */
export function rutaMerkle(hojas: string[], indice: number): PasoRuta[] {
  if (!(indice >= 0 && indice < hojas.length) || Math.floor(indice) !== indice) throw new Error('merkle: índice fuera de rango');
  return rutaEnNiveles(nivelesMerkle(hojas), indice);
}

/** Comprueba que `hoja` (huella hex) pertenece al árbol de raíz `raiz` con esa ruta. */
export function verificarRutaMerkle(hoja: string, ruta: PasoRuta[], raiz: string): boolean {
  try {
    let h = hojaMerkle(hoja);
    for (let i = 0; i < ruta.length; i++) {
      const s = Buffer.from(ruta[i].huella, 'hex');
      if (s.length !== 32) return false;
      if (ruta[i].lado === 'i') h = nodoMerkle(s, h);
      else if (ruta[i].lado === 'd') h = nodoMerkle(h, s);
      else return false;
    }
    return h.toString('hex') === String(raiz).toLowerCase();
  } catch (_e) {
    return false;
  }
}

export const merkle = { raiz: raizMerkle, ruta: rutaMerkle, verificarRuta: verificarRutaMerkle };

// ═══════════════════════════════════════════════════════════════════════════
// Paquete de verificación (para el perito)
// ═══════════════════════════════════════════════════════════════════════════

export interface DatosPaquete {
  /** Nombre del documento sellado, tal como lo tendrá quien verifica. */
  documentoNombre?: string | null;
  /** El sello con su token: el individual o, en un lote, el de la RAÍZ. */
  sello: SelloTiempo;
  /** Si lo sellado es un manifiesto (objeto → JSON canónico, o el texto exacto). */
  manifiesto?: unknown;
  /** En un lote: la huella de la hoja y su lugar en el lote. */
  hoja?: { huella: string; lote: LoteSello } | null;
  raicesPem: string[];
}

const VERIFICAR_LOTE_JS = [
  '// verificar-lote.js — recalcula la raíz del lote (RFC 6962) desde la huella',
  '// de la hoja y su ruta. Sin dependencias: node verificar-lote.js [huella]',
  "const crypto = require('crypto');",
  "const fs = require('fs');",
  "const path = require('path');",
  "const lote = JSON.parse(fs.readFileSync(path.join(__dirname, 'lote.json'), 'utf8'));",
  'const hoja = String(process.argv[2] || lote.huella).toLowerCase();',
  "const H = (partes) => crypto.createHash('sha256').update(Buffer.concat(partes)).digest();",
  "let h = H([Buffer.from([0]), Buffer.from(hoja, 'hex')]);",
  'for (const paso of lote.ruta) {',
  "  const s = Buffer.from(paso.huella, 'hex');",
  "  h = paso.lado === 'i' ? H([Buffer.from([1]), s, h]) : H([Buffer.from([1]), h, s]);",
  '}',
  "const raiz = h.toString('hex');",
  "console.log('Raíz recalculada: ' + raiz);",
  "console.log(raiz === lote.raiz ? 'Coincide con la raíz sellada.' : 'NO coincide con la raíz sellada.');",
  'process.exitCode = raiz === lote.raiz ? 0 : 1;',
  '',
].join('\n');

/**
 * Ficheros para verificar un sello sin la app: `<nombre>.tsr`, `tsa.pem` (los
 * certificados del token), `raiz.pem`, `LEEME.txt` con el comando de openssl
 * y, si procede, `manifiesto.json` o `lote.json` + `verificar-lote.js`.
 * El documento NO va dentro: lo añade quien arma el ZIP.
 */
export function paqueteVerificacion(datos: DatosPaquete): { [fichero: string]: Buffer } {
  const sello = datos.sello;
  if (!sello || !sello.token) throw new Error('paquete: el sello no tiene token');
  const token = Buffer.from(sello.token, 'base64');
  const r = leerRespuesta(token);
  const nombreDoc = datos.documentoNombre ? String(datos.documentoNombre).replace(/[\\/]/g, '_') : null;
  const base = nombreDoc ? nombreDoc.replace(/\.[^.]+$/, '') || 'sello' : 'sello';
  const tsr = base + '.tsr';
  const ficheros: { [fichero: string]: Buffer } = {};
  ficheros[tsr] = token;
  ficheros['tsa.pem'] = Buffer.from(r.certs.map(derAPem).join(''), 'utf8');
  ficheros['raiz.pem'] = Buffer.from((datos.raicesPem || []).map((p) => String(p).trim() + '\n').join(''), 'utf8');

  let dataArg: string | null = nombreDoc;
  if (datos.manifiesto !== undefined && datos.manifiesto !== null) {
    const texto = typeof datos.manifiesto === 'string' ? datos.manifiesto : jsonCanonico(datos.manifiesto);
    ficheros['manifiesto.json'] = Buffer.from(texto, 'utf8');
    dataArg = 'manifiesto.json';
  }
  const genTime = sello.genTimeIso || (r.tstInfo ? r.tstInfo.genTimeIso : '');
  const epoch = genTime ? Math.floor(new Date(genTime).getTime() / 1000) : null;
  const verificar = (arg: string) => 'openssl ts -verify ' + arg + ' -in "' + tsr + '" -CAfile raiz.pem -untrusted tsa.pem';

  const l: string[] = [];
  l.push('PAQUETE DE VERIFICACIÓN DE UN SELLO DE TIEMPO (RFC 3161)');
  l.push('');
  l.push('Huella sellada (SHA-256): ' + sello.huella);
  l.push('Fecha y hora del sello:   ' + (genTime || '(desconocida)') + ' (UTC)');
  l.push('Autoridad de sellado:     ' + (sello.tsa ? sello.tsa.id + ' — ' + sello.tsa.url : '')
    + (sello.tsa && sello.tsa.cualificada ? ' (cualificada, eIDAS art. 42)' : ' (no cualificada)'));
  if (sello.serie) l.push('Número de serie:          0x' + sello.serie.toUpperCase());
  if (sello.politica) l.push('Política de la TSA:       ' + sello.politica);
  l.push('');
  l.push('Ficheros:');
  l.push('  ' + tsr + '  respuesta de la TSA (TimeStampResp, DER)');
  l.push('  tsa.pem      certificados que la TSA incluyó en el sello');
  l.push('  raiz.pem     raíz de confianza de la TSA');
  if (ficheros['manifiesto.json']) l.push('  manifiesto.json  lo sellado: lista de ficheros con su SHA-256');
  l.push('');

  if (datos.hoja) {
    ficheros['lote.json'] = Buffer.from(JSON.stringify({
      huella: String(datos.hoja.huella).toLowerCase(),
      lote: datos.hoja.lote.id,
      raiz: datos.hoja.lote.raiz,
      indice: datos.hoja.lote.indice,
      ruta: datos.hoja.lote.ruta,
    }, null, 2) + '\n', 'utf8');
    ficheros['verificar-lote.js'] = Buffer.from(VERIFICAR_LOTE_JS, 'utf8');
    l.push('Este documento se selló dentro de un LOTE (árbol de Merkle, RFC 6962): lo');
    l.push('sellado es la raíz del árbol, y lote.json lleva la ruta de la hoja.');
    l.push('');
    l.push('1. Calcular la huella del documento y comprobar que es la de la hoja:');
    l.push('     openssl dgst -sha256 ' + (dataArg ? '"' + dataArg + '"' : '<documento>'));
    l.push('     (debe dar ' + String(datos.hoja.huella).toLowerCase() + ')');
    l.push('2. Recalcular la raíz desde la hoja y su ruta (Node.js, sin dependencias):');
    l.push('     node verificar-lote.js');
    l.push('3. Verificar el sello de la raíz:');
    l.push('     ' + verificar('-digest ' + datos.hoja.lote.raiz));
  } else {
    l.push('Verificación (OpenSSL 1.1 o posterior):');
    if (dataArg) l.push('  ' + verificar('-data "' + dataArg + '"'));
    l.push('  ' + verificar('-digest ' + sello.huella));
  }
  if (ficheros['manifiesto.json']) {
    l.push('');
    l.push('Cada fichero del manifiesto se comprueba con su SHA-256:');
    l.push('  openssl dgst -sha256 <fichero>      (Windows: certutil -hashfile <fichero> SHA256)');
  }
  l.push('');
  l.push('Debe responder «Verification: OK». Si el certificado de la TSA ya ha');
  l.push('caducado, se verifica en la fecha del sello añadiendo:');
  l.push('  -attime ' + (epoch != null ? String(epoch) : '<segundos desde 1970 de la fecha del sello>'));
  l.push('');
  ficheros['LEEME.txt'] = Buffer.from(l.join('\n'), 'utf8');
  return ficheros;
}

// ═══════════════════════════════════════════════════════════════════════════
// Cola en Firestore
// ═══════════════════════════════════════════════════════════════════════════
//
// Colección raíz `sellos_tiempo/{id}` (cerrada al cliente en las reglas de
// cada app). Cada documento = un `SelloTiempo` (el que vale) más:
//   tipo, modo, objeto {tipo, ruta, id}, el ámbito con el nombre de campo de
//   cada app (clinicId, tenantId, centerId…: la supresión lo encuentra solo),
//   faltaCualificado, adicionales[] (otros sellos de la misma huella),
//   proximoIntentoAt, procesandoHasta, loteId, creadoAt, actualizadoAt.
// El documento sale SIEMPRE: quien sella hace `encolarSello(...)` y sigue; el
// trigger de la app (`onDocumentCreated`, maxInstances 1) llama a
// `procesarSello` y el cron, a `procesarPendientes` y `cerrarLote`.
// Todas las consultas son de igualdad: no necesitan índices compuestos.

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
  get(): Promise<{ docs: DocSnapSello[] }>;
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

const CAMPOS_SELLO = [
  'v', 'algoritmo', 'huella', 'tsa', 'estado', 'token', 'genTime', 'genTimeIso', 'serie', 'politica',
  'nonce', 'precisionMs', 'firmante', 'verificacion', 'lote', 'intentos', 'ultimoError', 'solicitadoAt', 'concedidoAt',
];
const CAMPOS_RESERVADOS = CAMPOS_SELLO.concat([
  'tipo', 'modo', 'objeto', 'faltaCualificado', 'adicionales', 'proximoIntentoAt', 'procesandoHasta',
  'loteId', 'loteDe', 'creadoAt', 'actualizadoAt',
]);

/** Copia sin `undefined` (→ null) de objetos planos y arrays; lo demás, tal cual. */
function sinIndefinidos(valor: any): any {
  if (valor === undefined) return null;
  if (Array.isArray(valor)) return valor.map(sinIndefinidos);
  if (valor !== null && typeof valor === 'object') {
    const proto = Object.getPrototypeOf(valor);
    if (proto !== Object.prototype && proto !== null) return valor; // Date, Buffer, Timestamp, FieldValue…
    const r: any = {};
    const claves = Object.keys(valor);
    for (let i = 0; i < claves.length; i++) r[claves[i]] = sinIndefinidos(valor[claves[i]]);
    return r;
  }
  return valor;
}

/** Milisegundos de una fecha venga como venga (Date, Timestamp, ISO, número). */
function aMs(x: any): number | null {
  if (x == null) return null;
  if (x instanceof Date) return x.getTime();
  if (typeof x === 'number') return x;
  if (typeof x === 'string') {
    const t = Date.parse(x);
    return isNaN(t) ? null : t;
  }
  if (typeof x.toMillis === 'function') return x.toMillis();
  if (typeof x.toDate === 'function') return x.toDate().getTime();
  const s = x.seconds != null ? x.seconds : x._seconds;
  if (s != null) return s * 1000 + Math.floor((x.nanoseconds || x._nanoseconds || 0) / 1e6);
  return null;
}

function extraerSello(d: any): SelloTiempo {
  const s: any = {};
  for (let i = 0; i < CAMPOS_SELLO.length; i++) {
    const v = d[CAMPOS_SELLO[i]];
    s[CAMPOS_SELLO[i]] = v === undefined ? null : v;
  }
  return s as SelloTiempo;
}

function esperaTrasIntentos(intentos: number): number {
  const i = Math.min(Math.max(intentos, 1), ESPERAS_REINTENTO_MIN.length) - 1;
  return ESPERAS_REINTENTO_MIN[i] * 60 * 1000;
}

export interface DatosEncolar {
  tipo: string;
  huella: string;
  objeto: ObjetoSellado;
  /** Id del dueño con el nombre de campo de la app: { clinicId: 'x' }, { tenantId: 'y' }. */
  ambito?: { [campo: string]: string | null } | null;
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
export async function encolarSello(db: FirestoreSello, datos: DatosEncolar): Promise<string | null> {
  const config = datos.config;
  if (!config || !config.activo || !config.principal) return null;
  if (!huellaValida(datos.huella)) throw new Error('encolarSello: huella no válida');
  if (!datos.tipo) throw new Error('encolarSello: falta el tipo');
  const ahora = (datos.ahora || (() => new Date()))();
  const modo: ModoSello = datos.modo || (config.porTipo && config.porTipo[datos.tipo]) || 'individual';
  if (modo !== 'individual' && modo !== 'lote') throw new Error('encolarSello: modo no válido');
  const ambito = datos.ambito || {};
  const claves = Object.keys(ambito);
  for (let i = 0; i < claves.length; i++) {
    if (CAMPOS_RESERVADOS.indexOf(claves[i]) >= 0) throw new Error('encolarSello: el ámbito no puede usar «' + claves[i] + '»');
  }

  const doc: any = selloVacio(datos.huella, config.principal, ahora);
  for (let i = 0; i < claves.length; i++) doc[claves[i]] = ambito[claves[i]];
  doc.tipo = datos.tipo;
  doc.modo = modo;
  doc.objeto = {
    tipo: datos.objeto && datos.objeto.tipo ? String(datos.objeto.tipo) : datos.tipo,
    ruta: datos.objeto && datos.objeto.ruta ? String(datos.objeto.ruta) : null,
    id: datos.objeto && datos.objeto.id ? String(datos.objeto.id) : null,
  };
  doc.faltaCualificado = false;
  doc.adicionales = [];
  doc.proximoIntentoAt = modo === 'individual' ? ahora : null;
  doc.procesandoHasta = null;
  doc.loteId = null;
  doc.loteDe = null;
  doc.creadoAt = ahora;
  doc.actualizadoAt = ahora;
  const limpio = sinIndefinidos(doc);

  const coleccion = db.collection(COLECCION_SELLOS);
  if (!datos.id) {
    const ref = coleccion.doc();
    await ref.set(limpio);
    return ref.id;
  }
  const ref = coleccion.doc(String(datos.id));
  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) t.set(ref, limpio);
  });
  return ref.id;
}

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
export async function procesarSello(db: FirestoreSello, id: string, opciones: OpcionesProceso): Promise<ResultadoProceso> {
  const config = opciones.config;
  const reloj = opciones.ahora || (() => new Date());
  const omitido = (motivo: string, estado?: EstadoSello | null): ResultadoProceso =>
    ({ id, accion: 'omitido', estado: estado || null, motivo });
  if (!config || !config.activo || !config.principal) return omitido('sellado_inactivo');

  const ref = db.collection(COLECCION_SELLOS).doc(id);
  const timeoutMs = opciones.timeoutMs || TIMEOUT_POR_DEFECTO_MS;
  const inicio = reloj();
  const tomado = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return { motivo: 'no_existe', d: null as any };
    const d = snap.data() || {};
    if (d.modo === 'lote') return { motivo: 'en_lote', d };
    if (d.estado === 'concedido' && !d.faltaCualificado) return { motivo: 'hecho', d };
    const ahoraMs = inicio.getTime();
    const ocupado = aMs(d.procesandoHasta);
    if (ocupado != null && ocupado > ahoraMs) return { motivo: 'en_curso', d };
    const proximo = aMs(d.proximoIntentoAt);
    if (!opciones.forzar && proximo != null && proximo > ahoraMs) return { motivo: 'espera', d };
    t.update(ref, { procesandoHasta: new Date(ahoraMs + 2 * timeoutMs + 30000) });
    return { motivo: null as string | null, d };
  });
  if (tomado.motivo) return omitido(tomado.motivo, tomado.d ? tomado.d.estado || null : null);
  const d = tomado.d;

  const pedir = (tsa: ConfigTsa) => pedirSello(d.huella, tsa, {
    credencial: credencialPara(tsa, opciones.credenciales),
    timeoutMs,
    espaciadoMs: opciones.espaciadoMs || 0,
    ahora: reloj,
  });
  const intentos = (Number(d.intentos) || 0) + 1;
  const ahora = reloj();
  const yaConcedido = d.estado === 'concedido';
  const comun = { intentos, procesandoHasta: null, actualizadoAt: ahora };

  const principal = await pedir(config.principal);
  if (principal.estado === 'concedido') {
    const adicionales = Array.isArray(d.adicionales) ? d.adicionales.slice() : [];
    if (yaConcedido) adicionales.push(extraerSello(d));
    const nuevo: any = extraerSello(principal);
    nuevo.solicitadoAt = d.solicitadoAt || principal.solicitadoAt;
    nuevo.lote = d.lote || null;
    await ref.update(sinIndefinidos(Object.assign(nuevo, comun, {
      faltaCualificado: false, adicionales, proximoIntentoAt: null,
    })));
    await propagarLote(db, id, d, principal, false, ahora);
    return { id, accion: 'concedido', estado: 'concedido', motivo: null };
  }

  const solicitado = aMs(d.solicitadoAt);
  const edad = solicitado == null ? 0 : ahora.getTime() - solicitado;
  if (!yaConcedido && config.respaldo && edad >= PLAZO_RESPALDO_MS) {
    const respaldo = await pedir(config.respaldo);
    if (respaldo.estado === 'concedido') {
      const falta = !!config.principal.cualificada && !respaldo.tsa.cualificada;
      const nuevo: any = extraerSello(respaldo);
      nuevo.solicitadoAt = d.solicitadoAt || respaldo.solicitadoAt;
      nuevo.lote = d.lote || null;
      nuevo.ultimoError = 'principal: ' + (principal.ultimoError || '');
      await ref.update(sinIndefinidos(Object.assign(nuevo, comun, {
        faltaCualificado: falta,
        proximoIntentoAt: falta ? new Date(ahora.getTime() + esperaTrasIntentos(ESPERAS_REINTENTO_MIN.length)) : null,
      })));
      await propagarLote(db, id, d, respaldo, falta, ahora);
      return { id, accion: 'respaldo', estado: 'concedido', motivo: falta ? 'falta_cualificado' : null };
    }
    principal.ultimoError = (principal.ultimoError || '') + ' | respaldo: ' + (respaldo.ultimoError || '');
  }

  await ref.update(sinIndefinidos(Object.assign({}, comun, {
    ultimoError: principal.ultimoError || principal.estado,
    proximoIntentoAt: new Date(ahora.getTime() + esperaTrasIntentos(intentos)),
  })));
  return { id, accion: 'reintento', estado: yaConcedido ? 'concedido' : 'pendiente', motivo: principal.ultimoError };
}

/** Si lo concedido es la raíz de un lote, el lote y sus hojas lo reflejan. */
async function propagarLote(
  db: FirestoreSello, selloId: string, d: any, sello: SelloTiempo, falta: boolean, ahora: Date,
): Promise<void> {
  if (!d || !d.objeto || d.objeto.tipo !== 'lote' || !d.objeto.id) return;
  const loteId = String(d.objeto.id);
  const loteRef = db.collection(COLECCION_LOTES).doc(loteId);
  await loteRef.update(sinIndefinidos({
    estado: 'concedido',
    sello: {
      id: selloId,
      estado: 'concedido',
      genTime: sello.genTime,
      genTimeIso: sello.genTimeIso,
      tsa: sello.tsa,
      serie: sello.serie,
      faltaCualificado: falta,
    },
    actualizadoAt: ahora,
  }));
  const hojas = await db.collection(COLECCION_SELLOS).where('loteId', '==', loteId).get();
  const resumen = sinIndefinidos({
    estado: 'concedido',
    tsa: sello.tsa,
    genTime: sello.genTime,
    genTimeIso: sello.genTimeIso,
    serie: sello.serie,
    politica: sello.politica,
    precisionMs: sello.precisionMs,
    firmante: sello.firmante,
    verificacion: sello.verificacion,
    concedidoAt: sello.concedidoAt,
    faltaCualificado: falta,
    actualizadoAt: ahora,
  });
  for (let i = 0; i < hojas.docs.length; i += 400) {
    const lote = db.batch();
    const trozo = hojas.docs.slice(i, i + 400);
    for (let j = 0; j < trozo.length; j++) lote.update(db.collection(COLECCION_SELLOS).doc(trozo[j].id), resumen);
    await lote.commit();
  }
}

export interface OpcionesPendientes extends OpcionesProceso {
  /** Máximo de sellos por pasada (por defecto 50). */
  max?: number;
}

/**
 * Pasada del cron: procesa, de uno en uno y espaciados (≥ 1,1 s por TSA), los
 * sellos individuales pendientes cuyo reintento ya toca y los que esperan el
 * cualificado. Devuelve el recuento.
 */
export async function procesarPendientes(db: FirestoreSello, opciones: OpcionesPendientes): Promise<{
  revisados: number; procesados: number; concedidos: number; respaldos: number; reintentos: number;
}> {
  const r = { revisados: 0, procesados: 0, concedidos: 0, respaldos: 0, reintentos: 0 };
  const config = opciones.config;
  if (!config || !config.activo || !config.principal) return r;
  const reloj = opciones.ahora || (() => new Date());
  const coleccion = db.collection(COLECCION_SELLOS);
  const [pendientes, sinCualificado] = await Promise.all([
    coleccion.where('estado', '==', 'pendiente').where('modo', '==', 'individual').get(),
    coleccion.where('faltaCualificado', '==', true).get(),
  ]);
  const vistos: { [id: string]: boolean } = {};
  const candidatos: { id: string; cuando: number }[] = [];
  const ahoraMs = reloj().getTime();
  const todos = pendientes.docs.concat(sinCualificado.docs);
  for (let i = 0; i < todos.length; i++) {
    const s = todos[i];
    if (vistos[s.id]) continue;
    vistos[s.id] = true;
    const d = s.data() || {};
    r.revisados++;
    const proximo = aMs(d.proximoIntentoAt);
    const ocupado = aMs(d.procesandoHasta);
    if (proximo == null || proximo > ahoraMs) continue;
    if (ocupado != null && ocupado > ahoraMs) continue;
    candidatos.push({ id: s.id, cuando: proximo });
  }
  candidatos.sort((a, b) => a.cuando - b.cuando || (a.id < b.id ? -1 : 1));
  const max = opciones.max || 50;
  const espaciadoMs = opciones.espaciadoMs != null ? opciones.espaciadoMs : ESPACIADO_COLA_MS;
  for (let i = 0; i < candidatos.length && i < max; i++) {
    const res = await procesarSello(db, candidatos[i].id, Object.assign({}, opciones, { espaciadoMs }));
    if (res.accion === 'omitido') continue;
    r.procesados++;
    if (res.accion === 'concedido') r.concedidos++;
    else if (res.accion === 'respaldo') r.respaldos++;
    else r.reintentos++;
  }
  return r;
}

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
export async function cerrarLote(db: FirestoreSello, datos: DatosCierreLote): Promise<{
  loteId: string; selloId: string; n: number; raiz: string; estado: EstadoSello | null;
} | null> {
  const config = datos.config;
  if (!config || !config.activo || !config.principal) return null;
  const reloj = datos.ahora || (() => new Date());
  const coleccion = db.collection(COLECCION_SELLOS);
  const snap = await coleccion.where('tipo', '==', datos.tipo).where('modo', '==', 'lote').where('loteId', '==', null).get();
  const hastaMs = datos.hasta.getTime();
  const hojas = snap.docs
    .map((s) => ({ id: s.id, d: s.data() || {} }))
    .filter((h) => h.d.estado === 'pendiente' && huellaValida(h.d.huella) && (aMs(h.d.solicitadoAt) || 0) <= hastaMs)
    .sort((a, b) => ((aMs(a.d.solicitadoAt) || 0) - (aMs(b.d.solicitadoAt) || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!hojas.length) return null;

  const huellas = hojas.map((h) => String(h.d.huella).toLowerCase());
  const niveles = nivelesMerkle(huellas);
  const raiz = niveles[niveles.length - 1][0].toString('hex');
  const ahora = reloj();
  const loteRef = db.collection(COLECCION_LOTES).doc();
  const hojasPath = datos.guardarHojas ? (await datos.guardarHojas(loteRef.id, huellas)) || null : null;
  const selloRef = coleccion.doc();

  await loteRef.set(sinIndefinidos({
    tipo: datos.tipo,
    raiz,
    n: huellas.length,
    desde: hojas[0].d.solicitadoAt,
    hasta: hojas[hojas.length - 1].d.solicitadoAt,
    hojasPath,
    selloId: selloRef.id,
    estado: 'pendiente',
    sello: null,
    creadoAt: ahora,
    actualizadoAt: ahora,
  }));
  for (let i = 0; i < hojas.length; i += 400) {
    const lote = db.batch();
    for (let j = i; j < Math.min(i + 400, hojas.length); j++) {
      lote.update(coleccion.doc(hojas[j].id), {
        loteId: loteRef.id,
        lote: { id: loteRef.id, raiz, indice: j, ruta: rutaEnNiveles(niveles, j) },
        actualizadoAt: ahora,
      });
    }
    await lote.commit();
  }

  const raizDoc: any = selloVacio(raiz, config.principal, ahora);
  raizDoc.tipo = 'lote';
  raizDoc.modo = 'individual';
  raizDoc.objeto = { tipo: 'lote', ruta: COLECCION_LOTES + '/' + loteRef.id, id: loteRef.id };
  raizDoc.faltaCualificado = false;
  raizDoc.adicionales = [];
  raizDoc.proximoIntentoAt = ahora;
  raizDoc.procesandoHasta = null;
  raizDoc.loteId = null;
  raizDoc.loteDe = datos.tipo;
  raizDoc.creadoAt = ahora;
  raizDoc.actualizadoAt = ahora;
  await selloRef.set(sinIndefinidos(raizDoc));

  const res = await procesarSello(db, selloRef.id, datos);
  return { loteId: loteRef.id, selloId: selloRef.id, n: huellas.length, raiz, estado: res.estado };
}
