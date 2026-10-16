// @saluhold/identity-client/servidor — lo que corre en Cloud Functions.
//
// Entrada aparte del núcleo porque presupone Admin SDK y Firestore de servidor.
// Nada de aquí debe acabar en un navegador.
//
// Se compila a CommonJS además de a ESM (ver `tsconfig.cjs.json`), que es lo que
// permite a las functions de las cuatro apps —todas CommonJS— compartir estas
// reglas en vez de tener cada una su copia.

export {
  vincularPacienteEnIdentity,
  clinicasDelGrupo,
  acunarNumeroHistoria,
  type FirestoreMinimo,
  type ArrayUnion,
  type ResultadoVinculacion,
  type OpcionesVinculacion,
} from './vinculacion';

export {
  liberarNifEnIdentity,
  type DatosLiberacion,
  type ResultadoLiberacion,
} from './liberarNif';

export {
  darDeAltaPacienteDesdeServidor,
  type OrigenAltaServidor,
  type DatosAltaServidor,
  type ResultadoAltaServidor,
} from './altaServidor';

export {
  darDeAltaEmpresaDesdeServidor,
  type OrigenAltaEmpresaServidor,
  type DatosAltaEmpresaServidor,
  type ResultadoAltaEmpresaServidor,
} from './altaEmpresaServidor';

export {
  vincularEmpresaEnIdentity,
  type ResultadoVinculacionEmpresa,
} from './vinculacionEmpresa';

export {
  vincularEmpresaDesdeServidor,
  actualizarEmpresaDesdeServidor,
  crearTenantDesdeServidor,
  actualizarTenantDesdeServidor,
  accesoAppDesdeServidor,
  type AppServidorSaluFact,
  type ResultadoVincularEmpresaServidor,
  type DatosEmpresaServidor,
  type ResultadoActualizarEmpresaServidor,
  type DatosTenantServidor,
  type ResultadoTenantServidor,
  type PeticionAccesoApp,
  type ResultadoAccesoApp,
} from './canonicosServidor';
