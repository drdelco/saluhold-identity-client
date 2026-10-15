// altaEmpresaServidor.ts — dar de alta una EMPRESA desde un backend de la suite (0.11.0).
//
// El alta de empresa la construye Identity y solo Identity (`altaEmpresaCanonica`).
// Los frontends llaman al callable `crearEmpresaCanonica` con su sesión; esto es
// para lo que no tiene sesión de usuario detrás: hoy, el generador mensual de
// comisiones de SaluFirst en SaluFact, que da de alta al cobrador como cliente.
// Antes escribía la ficha a mano en Identity con un id propio.
//
// Misma puerta que el alta de pacientes de servidor: la función de Identity no
// es pública y solo admite un ID token de Google de la cuenta de servicio de
// cada app (y con los orígenes de esa app). El token sale del servidor de
// metadatos: no hay clave ni secreto. Fuera de Google Cloud la llamada falla, a
// propósito.
import { idTokenDelServidor } from './altaServidor';
const URL_ALTA_EMPRESA = 'https://europe-west1-identity-44874.cloudfunctions.net/altaEmpresaServidor';
/**
 * Da de alta una empresa en Identity por el camino canónico.
 *
 * Lanza `Error` con el motivo si Identity rechaza los datos (un NIF con el
 * carácter de control mal, un país que no reconoce…) o no responde; una
 * empresa que ya existe NO es error.
 */
export async function darDeAltaEmpresaDesdeServidor(app, clinicaId, datos) {
    const token = await idTokenDelServidor(URL_ALTA_EMPRESA);
    const r = await fetch(URL_ALTA_EMPRESA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ app, clinicaId, datos }),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
        throw new Error(String(cuerpo.error || `Identity respondió ${r.status} al dar de alta la empresa.`));
    }
    return cuerpo;
}
//# sourceMappingURL=altaEmpresaServidor.js.map