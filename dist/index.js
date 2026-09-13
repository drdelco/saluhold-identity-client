/**
 * @saluhold/identity-client
 *
 * Cliente JS para el Local Server SaluHold (proceso que despliega SaluFile
 * en el PC de cada clínica y que cachea pacientes/empresas/profesionales de
 * Identity para acelerar lecturas y permitir trabajo offline).
 *
 * Uso típico desde una app frontend:
 *
 *   import { localBuscarClientes, setLocalServerHost } from '@saluhold/identity-client';
 *
 *   setLocalServerHost(clinicConfig.localServerHost);
 *   const clientes = await localBuscarClientes('garcia');
 *   if (clientes === null) {
 *     // Caer a Cloud Functions
 *   }
 *
 * Cualquier función `local*` devuelve `null` (o `undefined` para los obtener
 * por id) cuando el servidor local no responde — el caller decide si caer
 * a Cloud Functions o mostrar un error.
 */
// ═══════════════════════════════════════════════════════════════════════════
// ESTADO Y CONFIGURACIÓN DE CONEXIÓN
// ═══════════════════════════════════════════════════════════════════════════
// PUERTO ÚNICO HTTPS (cert trusted vía mkcert). Eliminamos el antiguo
// dual-port 3500 HTTP + 3501 HTTPS para evitar incongruencias y aprovechar
// que mkcert ya elimina el warning "Not secure" en localhost.
const LOCAL_HTTPS_PORT = 3501;
const HEALTH_CHECK_INTERVAL = 30000;
const REQUEST_TIMEOUT = 3000;
let _configuredHost = null;
// Host por túnel exterior (Tailscale, VPN). Se prueba DESPUÉS del LAN
// para no añadir latencia a los PCs de la clínica que ya alcanzan el
// servidor por la red local.
let _configuredHostExternal = null;
let _localServerUrl = `https://localhost:${LOCAL_HTTPS_PORT}`;
let _isAvailable = null;
let _lastCheck = 0;
// Promise en vuelo del check de disponibilidad — evita race condition
// cuando N callers concurrentes encuentran `_isAvailable === null` y
// disparan N fetch /health en paralelo agotando el connection pool de
// Chrome (síntoma: ERR_INSUFFICIENT_RESOURCES).
let _availabilityPromise = null;
const _stats = { localHits: 0, cloudFallbacks: 0 };
/**
 * Configura el host LAN del servidor local (e.g. "192.168.1.42"). Se llama
 * típicamente desde el `useAuth` de cada app cuando carga la config de
 * clínica desde `tenants/{clinicaId}/config/fiscal.localServerHost`.
 */
export function setLocalServerHost(host) {
    const normalised = (host || '').trim() || null;
    if (normalised === _configuredHost)
        return;
    _configuredHost = normalised;
    _isAvailable = null;
    _lastCheck = 0;
}
/**
 * Configura el host por túnel exterior (Tailscale/VPN). Solo se prueba
 * si fallan localhost + LAN host. Permite que dispositivos remotos en
 * la mesh VPN del clínic alcancen el acelerador sin sacrificar la
 * latencia de los PCs internos.
 */
export function setLocalServerHostExternal(host) {
    const normalised = (host || '').trim() || null;
    if (normalised === _configuredHostExternal)
        return;
    _configuredHostExternal = normalised;
    _isAvailable = null;
    _lastCheck = 0;
}
export function getLocalServerUrl() { return _localServerUrl; }
export function isLocalServerAvailable() { return _isAvailable; }
export function getLocalServerStats() { return { ..._stats, isAvailable: _isAvailable }; }
/** Fuerza un re-check al siguiente intento (e.g. tras reiniciar el servidor). */
export function resetLocalServerCheck() {
    _isAvailable = null;
    _lastCheck = 0;
    _availabilityPromise = null;
}
/**
 * Garantiza que el probe de disponibilidad se ha ejecutado al menos una vez
 * y devuelve el resultado. Útil para flujos que no hacen llamadas HTTP previas
 * (e.g. `acceleratorWS.connect()`): sin esto, `getLocalServerUrl()` puede
 * devolver el default `https://localhost:3501` antes de haber probado LAN /
 * external, y los PCs remotos abren WSS contra un host incorrecto.
 */
export async function ensureLocalServerChecked() {
    return checkAvailability();
}
// ═══════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════
function logLocal(fn, ms, count) {
    _stats.localHits++;
    // eslint-disable-next-line no-console
    console.log(`%c[LOCAL] %c${fn}%c ${ms}ms${count !== undefined ? ` (${count} results)` : ''}`, 'color:#10b981;font-weight:bold', 'color:#6366f1', 'color:#9ca3af');
}
function logCloud(fn) {
    _stats.cloudFallbacks++;
    if (_stats.localHits > 0) {
        // eslint-disable-next-line no-console
        console.log(`%c[CLOUD] %c${fn}%c → servidor local no disponible`, 'color:#f59e0b;font-weight:bold', 'color:#6366f1', 'color:#9ca3af');
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// AVAILABILITY CHECK
// ═══════════════════════════════════════════════════════════════════════════
async function tryUrl(url, timeoutMs = 1500) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const resp = await fetch(`${url}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        return resp.ok;
    }
    catch {
        return false;
    }
}
async function checkAvailability() {
    const now = Date.now();
    if (_isAvailable !== null && now - _lastCheck < HEALTH_CHECK_INTERVAL) {
        return _isAvailable;
    }
    // Si ya hay un check en vuelo, comparte su promesa con todos los
    // callers concurrentes (evita ERR_INSUFFICIENT_RESOURCES por N
    // fetch /health paralelos).
    if (_availabilityPromise)
        return _availabilityPromise;
    _availabilityPromise = (async () => {
        try {
            // 1) localhost (mismo PC) — cert trusted via mkcert, sin warning
            const localhostUrl = `https://localhost:${LOCAL_HTTPS_PORT}`;
            if (await tryUrl(localhostUrl)) {
                _localServerUrl = localhostUrl;
                _isAvailable = true;
                _lastCheck = Date.now();
                return true;
            }
            // 2) LAN — PCs de la red local de la clínica
            if (_configuredHost) {
                const networkUrl = `https://${_configuredHost}:${LOCAL_HTTPS_PORT}`;
                if (await tryUrl(networkUrl)) {
                    _localServerUrl = networkUrl;
                    _isAvailable = true;
                    _lastCheck = Date.now();
                    return true;
                }
            }
            // 3) Túnel exterior (Tailscale, VPN) — dispositivos remotos en
            //    la mesh VPN. Se prueba el último para no añadir latencia a
            //    los PCs internos.
            if (_configuredHostExternal) {
                const externalUrl = `https://${_configuredHostExternal}:${LOCAL_HTTPS_PORT}`;
                if (await tryUrl(externalUrl)) {
                    _localServerUrl = externalUrl;
                    _isAvailable = true;
                    _lastCheck = Date.now();
                    return true;
                }
            }
            _isAvailable = false;
            _lastCheck = Date.now();
            return false;
        }
        finally {
            _availabilityPromise = null;
        }
    })();
    return _availabilityPromise;
}
// ═══════════════════════════════════════════════════════════════════════════
// TOKEN DEL ACELERADOR
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Secreto compartido con el acelerador de la clínica.
 *
 * El acelerador guarda una copia de los pacientes y de la historia clínica, y
 * escucha en la red local. Sin este token, cualquiera que llegue a ese puerto
 * —un portátil invitado en el wifi de la consulta, o el JavaScript de
 * cualquier web abierta en el ordenador— podía pedirle datos de salud y
 * obtenerlos. Ahora el servidor rechaza lo que no lo traiga.
 *
 * Vive en el documento de la clínica, no en un fichero de configuración del
 * PC: así se puede rotar desde la nube sin entrar en la consulta, y el
 * acelerador lo recoge al vuelo porque ya escucha ese documento.
 */
let _acceleratorToken = null;
/** Lo llama cada app al cargar la configuración de su clínica. */
export function setAcceleratorToken(token) {
    _acceleratorToken = (token || '').trim() || null;
}
export function getAcceleratorToken() {
    return _acceleratorToken;
}
/** Cabeceras de una petición al acelerador, con el token si lo hay. */
function cabeceras(extra) {
    return {
        ...(extra || {}),
        ...(_acceleratorToken ? { 'X-Accelerator-Token': _acceleratorToken } : {}),
    };
}
// ═══════════════════════════════════════════════════════════════════════════
// LOW-LEVEL HTTP HELPERS
// ═══════════════════════════════════════════════════════════════════════════
export async function localPost(path, body) {
    const available = await checkAvailability();
    if (!available)
        return null;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        const resp = await fetch(`${_localServerUrl}${path}`, {
            method: 'POST',
            headers: cabeceras({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!resp.ok)
            return null;
        return await resp.json();
    }
    catch {
        _isAvailable = false;
        return null;
    }
}
export async function localGet(path) {
    const available = await checkAvailability();
    if (!available)
        return null;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        const resp = await fetch(`${_localServerUrl}${path}`, {
            headers: cabeceras(),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!resp.ok)
            return null;
        return await resp.json();
    }
    catch {
        _isAvailable = false;
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// MAPPERS RAW → CLIENTE
// ═══════════════════════════════════════════════════════════════════════════
export function mapPacienteToCliente(p, clinicaId) {
    return {
        id: p.id,
        tipo: 'PACIENTE',
        nif: p.nif || '',
        tipoIdentificador: p.tipoIdentificador,
        nombreRazon: `${p.apellidos || ''}, ${p.nombre || ''}`.trim().replace(/^,\s*/, ''),
        email: p.email || undefined,
        telefono: p.telefono || undefined,
        direccion: {
            calle: p.direccion?.calle || '',
            codigoPostal: p.direccion?.codigoPostal || '',
            poblacion: p.direccion?.poblacion || '',
            provincia: p.direccion?.provincia || '',
            pais: p.direccion?.pais || 'España',
        },
        esExterno: false,
        idLocal: p.idLocal || (clinicaId ? p.idsLocales?.[clinicaId] : undefined) || undefined,
    };
}
export function mapEmpresaToCliente(e) {
    const contacto = e.contactos?.find(c => c.principal) || e.contactos?.[0];
    return {
        id: e.id,
        tipo: 'EMPRESA',
        nif: e.cif || '',
        nombreRazon: e.nombre || '',
        email: contacto?.email || undefined,
        telefono: contacto?.telefono || undefined,
        direccion: {
            calle: e.direccion?.calle || '',
            codigoPostal: e.direccion?.codigoPostal || '',
            poblacion: e.direccion?.poblacion || '',
            provincia: e.direccion?.provincia || '',
            pais: e.direccion?.pais || 'España',
        },
        esExterno: false,
    };
}
// ═══════════════════════════════════════════════════════════════════════════
// CLIENTES (combinación pacientes + empresas) — usado por SaluFact
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Busca clientes (pacientes y/o empresas) en el servidor local.
 * Por NIF/CIF cae a `null` (cloud) porque el local solo conoce los de la
 * propia clínica y se perdería la búsqueda cross-tenant.
 */
export async function localBuscarClientes(termino, tipo = 'todos', limite = 20) {
    const terminoLimpio = termino.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const pareceNifCif = /^[0-9XYZABCDEFGHJKLMNPQRSUVW]/.test(terminoLimpio) && terminoLimpio.length >= 6;
    if (pareceNifCif)
        return null;
    const available = await checkAvailability();
    if (!available)
        return null;
    const t0 = performance.now();
    const resultados = [];
    if (tipo === 'todos' || tipo === 'pacientes') {
        const r = await localPost('/pacientes/buscar', { termino, limite });
        if (r?.pacientes)
            resultados.push(...r.pacientes.map(p => mapPacienteToCliente(p)));
    }
    if (tipo === 'todos' || tipo === 'empresas') {
        const r = await localPost('/empresas/buscar', { termino, limite });
        if (r === null) {
            // El acelerador local NO expone /empresas/buscar (a partir del rebajado
            // de SaluFile de 2026-05-18: empresas pasan al acelerador propio de
            // SaluFact). Devolvemos null para forzar fallback cloud en el caller
            // (la CF `buscarClientes` sí devuelve empresas + pacientes correctos).
            return null;
        }
        if (r?.empresas)
            resultados.push(...r.empresas.map(mapEmpresaToCliente));
    }
    resultados.sort((a, b) => a.nombreRazon.localeCompare(b.nombreRazon));
    logLocal(`buscarClientes("${termino}")`, Math.round(performance.now() - t0), resultados.length);
    return resultados.slice(0, limite);
}
/**
 * Últimos clientes añadidos/modificados (modo "__recientes__").
 * Si el local server está actualizado por el listener de Identity, refleja
 * cambios de cualquier app del ecosistema.
 */
export async function localClientesRecientes(tipo = 'todos', limite = 5) {
    const available = await checkAvailability();
    if (!available)
        return null;
    const t0 = performance.now();
    const resultados = [];
    if (tipo === 'todos' || tipo === 'pacientes') {
        const r = await localPost('/pacientes/recientes', { limite });
        if (r?.pacientes)
            resultados.push(...r.pacientes.map(p => mapPacienteToCliente(p)));
    }
    if (tipo === 'todos' || tipo === 'empresas') {
        const r = await localPost('/empresas/recientes', { limite });
        if (r === null) {
            // Mismo razonamiento que en localBuscarClientes: si /empresas/* no
            // está disponible, devolvemos null para forzar fallback cloud.
            return null;
        }
        if (r?.empresas)
            resultados.push(...r.empresas.map(mapEmpresaToCliente));
    }
    resultados.sort((a, b) => a.nombreRazon.localeCompare(b.nombreRazon));
    logLocal(`clientesRecientes`, Math.round(performance.now() - t0), resultados.length);
    return resultados.slice(0, limite);
}
export async function localObtenerCliente(id, tipo) {
    const available = await checkAvailability();
    if (!available)
        return undefined;
    if (tipo === 'PACIENTE') {
        const r = await localPost('/pacientes/obtener', { identityId: id });
        if (r === null)
            return undefined;
        return r.paciente ? mapPacienteToCliente(r.paciente) : null;
    }
    else {
        const r = await localPost('/empresas/obtener', { empresaId: id });
        if (r === null)
            return undefined;
        return r.empresa ? mapEmpresaToCliente(r.empresa) : null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// PACIENTES (raw, sin mapeo a Cliente) — usado por SaluFile
// ═══════════════════════════════════════════════════════════════════════════
export async function localBuscarPacientes(termino, limite = 20) {
    const t0 = performance.now();
    const result = await localPost('/pacientes/buscar', { termino, limite });
    if (result?.pacientes) {
        logLocal(`buscarPacientes("${termino}")`, Math.round(performance.now() - t0), result.pacientes.length);
        return result.pacientes;
    }
    logCloud(`buscarPacientes("${termino}")`);
    return null;
}
export async function localObtenerPaciente(identityId) {
    const available = await checkAvailability();
    if (!available) {
        logCloud(`obtenerPaciente(${identityId.slice(0, 8)}...)`);
        return undefined;
    }
    const t0 = performance.now();
    const result = await localPost('/pacientes/obtener', { identityId });
    if (result === null) {
        logCloud(`obtenerPaciente(${identityId.slice(0, 8)}...)`);
        return undefined;
    }
    logLocal(`obtenerPaciente(${identityId.slice(0, 8)}...)`, Math.round(performance.now() - t0));
    return result.paciente;
}
export async function localListarPacientesRecientes(limite = 100) {
    const t0 = performance.now();
    const result = await localPost('/pacientes/recientes', { limite });
    if (result?.pacientes) {
        logLocal('listarPacientesRecientes', Math.round(performance.now() - t0), result.pacientes.length);
        return result.pacientes;
    }
    logCloud('listarPacientesRecientes');
    return null;
}
// ═══════════════════════════════════════════════════════════════════════════
// PROFESIONALES — usado por SaluFile (y potencialmente SaluFirst)
// ═══════════════════════════════════════════════════════════════════════════
export async function localListarProfesionales(limite = 100, soloActivos = true) {
    const t0 = performance.now();
    const result = await localPost('/profesionales/listar', { limite, soloActivos });
    if (result?.profesionales) {
        logLocal('listarProfesionales', Math.round(performance.now() - t0), result.profesionales.length);
        return result.profesionales;
    }
    logCloud('listarProfesionales');
    return null;
}
export async function localBuscarProfesionales(query, limite = 50) {
    const t0 = performance.now();
    const result = await localPost('/profesionales/buscar', { query, limite });
    if (result?.profesionales) {
        logLocal(`buscarProfesionales("${query}")`, Math.round(performance.now() - t0), result.profesionales.length);
        return result.profesionales;
    }
    logCloud(`buscarProfesionales("${query}")`);
    return null;
}
export async function localObtenerProfesional(profesionalId) {
    const available = await checkAvailability();
    if (!available) {
        logCloud('obtenerProfesional');
        return undefined;
    }
    const t0 = performance.now();
    const result = await localPost('/profesionales/obtener', { profesionalId });
    if (result === null) {
        logCloud('obtenerProfesional');
        return undefined;
    }
    logLocal('obtenerProfesional', Math.round(performance.now() - t0));
    return result.profesional;
}
export async function localBuscarProfesionalPorUID(uid) {
    const available = await checkAvailability();
    if (!available) {
        logCloud('buscarProfesionalPorUID');
        return undefined;
    }
    const t0 = performance.now();
    const result = await localPost('/profesionales/buscarPorUID', { uid });
    if (result === null) {
        logCloud('buscarProfesionalPorUID');
        return undefined;
    }
    logLocal('buscarProfesionalPorUID', Math.round(performance.now() - t0));
    return result.profesional;
}
// ═══════════════════════════════════════════════════════════════════════════
// CLINIC CONFIG
// ═══════════════════════════════════════════════════════════════════════════
export async function localGetClinicConfig() {
    const result = await localGet('/clinic/config');
    return result?.config ?? null;
}
// ─────────────────────────────────────────────────────────────────────────────
// Identificador personal (DNI / NIE / pasaporte / CIF)
// ─────────────────────────────────────────────────────────────────────────────
export { normalizarIdentificador, canonizarIdentificador, tipoDeIdentificador, validarIdentificador, identificadorAceptable, } from './identificador';
// ─────────────────────────────────────────────────────────────────────────────
// Sexo (H / M / O) — codec único de la suite
// ─────────────────────────────────────────────────────────────────────────────
export { OPCIONES_SEXO, sexoADisplay, displayASexo, comoSexoIdentity, esHombre, esMujer, sexoDesdeExterno, } from './sexo';
// Compresor de imagen para el lector de documentos. Vive con el escáner pero
// no usa React ni Mantine, así que se ofrece también desde el núcleo: lo
// necesita el portal de Identity, que es Tailwind.
export { comprimirParaIA } from './ui/imagen';
//# sourceMappingURL=index.js.map