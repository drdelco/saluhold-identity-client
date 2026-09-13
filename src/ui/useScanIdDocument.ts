// useScanIdDocument.ts — escanear un documento y decidir qué hacer con lo leído.
//
// Toda la lógica del escaneo vive aquí porque hay muchas pantallas de alta
// repartidas por la suite (escritorio y móvil, en tres apps). Si cada una
// decidiera por su cuenta, acabarían divergiendo, y la regla que se perdería es
// justo la que evita duplicados.
//
// LA REGLA: lo que se lee del documento alimenta la BÚSQUEDA, no el formulario.
// El alta empieza buscando por DNI precisamente para no crear dos fichas de la
// misma persona y para cumplir LOPD al vincular pacientes de otras clínicas. Un
// escáner que saltara directo a "crear" convertiría ese paso en opcional, y con
// él se irían las dos garantías. Por eso `decision` nunca vale 'create' sin
// haber consultado antes, y un NIF ilegible devuelve 'sin-nif' — que deja al
// operador en el paso de búsqueda, con el resto de campos ya rellenos.
//
// Dos mitades a propósito: `leer` (fotos → campos) y `procesarLectura`
// (campos → decisión). Cuando la foto se hace en el MÓVIL y el alta sigue en
// el escritorio, el móvil ejecuta solo la primera y el escritorio solo la
// segunda; así la decisión se toma siempre en el mismo sitio y con el mismo
// código, venga la foto de donde venga.

import { useCallback, useRef, useState } from 'react';
import { comprimirParaIA } from './imagen';
import {
  leerDocumentoIdentidad,
  MENSAJE_FALLO,
  type CaraDocumento,
  type LecturaOk,
  type DatosDocumento,
} from './documento';
import { config, mensajeDeError, type PacienteCoincidente } from './config';

export type DecisionEscaneo =
  /** El NIF ya existe: hay que vincular o abrir la ficha, no crear otra. */
  | 'found'
  /** NIF legible y sin coincidencias: se puede crear con lo prerrellenado. */
  | 'create'
  /** No se pudo leer el NIF: el operador lo teclea y busca. NUNCA se salta a crear. */
  | 'sin-nif';

export interface ResultadoEscaneo {
  decision: DecisionEscaneo;
  borrador: DatosDocumento;
  revisar: string[];
  avisos: string[];
  documento: LecturaOk['documento'];
  conAcceso: PacienteCoincidente[];
  sinAcceso: PacienteCoincidente[];
}

export type ProgresoEscaneo = 'comprimiendo' | 'leyendo' | 'buscando';

/**
 * Vuelca el borrador sobre el formulario sin romper el tipo.
 *
 * El formulario de alta exige los cinco campos de la dirección, pero el
 * documento rara vez los trae todos (y sin reverso no trae ninguno). Aquí se
 * completa lo que falte con lo que ya hubiera en el formulario, o con cadena
 * vacía. Vive junto al hook para que todas las pantallas de alta hagan la
 * mezcla igual: es exactamente el tipo de detalle que se copia mal al tercer
 * sitio.
 */
export function aplicarBorrador<T extends { direccion?: Record<string, string> | undefined }>(
  actual: T,
  borrador: DatosDocumento,
): T {
  const dir = borrador.direccion;
  return {
    ...actual,
    ...borrador,
    direccion: dir
      ? {
        calle: dir.calle ?? actual.direccion?.calle ?? '',
        codigoPostal: dir.codigoPostal ?? actual.direccion?.codigoPostal ?? '',
        poblacion: dir.poblacion ?? actual.direccion?.poblacion ?? '',
        provincia: dir.provincia ?? actual.direccion?.provincia ?? '',
        pais: dir.pais ?? actual.direccion?.pais ?? '',
      }
      : actual.direccion,
  } as T;
}

export function useScanIdDocument() {
  const [escaneando, setEscaneando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<ProgresoEscaneo | null>(null);
  const cancelado = useRef(false);

  const limpiar = useCallback(() => {
    setError(null);
    setProgreso(null);
  }, []);

  /**
   * Primera mitad: una o dos fotos (anverso y, opcionalmente, reverso) →
   * campos. Devuelve `null` si no se pudo leer; el motivo queda en `error`.
   */
  const leer = useCallback(async (ficheros: File[]): Promise<LecturaOk | null> => {
    if (!ficheros.length) return null;
    cancelado.current = false;
    setEscaneando(true);
    setError(null);

    try {
      // 1. Comprimir en el navegador. Sin esto, una foto de móvil no cabe en
      //    la llamada (la imagen viaja en base64, no por Storage).
      setProgreso('comprimiendo');
      const caras: CaraDocumento[] = [];
      for (let i = 0; i < Math.min(ficheros.length, 2); i++) {
        const img = await comprimirParaIA(ficheros[i]);
        caras.push({
          data: img.base64,
          mimeType: img.mimeType,
          cara: i === 0 ? 'anverso' : 'reverso',
        });
      }

      // 2. Leer.
      setProgreso('leyendo');
      const lectura = await leerDocumentoIdentidad(caras);
      if (cancelado.current) return null;

      if (!lectura.ok) {
        setError(MENSAJE_FALLO[lectura.motivo]);
        return null;
      }
      return lectura;
    } catch (e: unknown) {
      setError(mensajeDeError(e, 'No se ha podido leer el documento.'));
      return null;
    } finally {
      // Las fotos no se conservan en ningún estado ni caché: el array de
      // ficheros muere aquí y el base64 con él.
      setEscaneando(false);
      setProgreso(null);
    }
  }, []);

  /**
   * Segunda mitad: campos → decisión. Aquí está la regla que evita duplicados:
   * el NIF alimenta la búsqueda global antes de que nadie pueda crear.
   */
  const procesarLectura = useCallback(async (lectura: LecturaOk): Promise<ResultadoEscaneo | null> => {
    cancelado.current = false;
    setEscaneando(true);
    setError(null);
    try {
      const borrador = lectura.datos;
      const base = {
        borrador,
        revisar: lectura.confianza.revisar,
        avisos: lectura.avisos,
        documento: lectura.documento,
      };

      // Sin NIF legible no se avanza: se vuelve al paso de búsqueda con el
      // resto de datos guardados. Crear desde aquí sería crear a ciegas.
      const nif = borrador.nif?.trim();
      if (!nif) {
        return { ...base, decision: 'sin-nif', conAcceso: [], sinAcceso: [] };
      }

      // El NIF alimenta la búsqueda global, igual que si se hubiera tecleado.
      setProgreso('buscando');
      const { conAcceso, sinAcceso } = await config().buscarPorNif(nif);
      if (cancelado.current) return null;

      const hay = conAcceso.length > 0 || sinAcceso.length > 0;
      return { ...base, decision: hay ? 'found' : 'create', conAcceso, sinAcceso };
    } catch (e: unknown) {
      setError(mensajeDeError(e, 'No se ha podido comprobar el documento.'));
      return null;
    } finally {
      setEscaneando(false);
      setProgreso(null);
    }
  }, []);

  /** Las dos mitades seguidas: la foto se hace y se decide en el mismo sitio. */
  const escanear = useCallback(async (ficheros: File[]): Promise<ResultadoEscaneo | null> => {
    const lectura = await leer(ficheros);
    if (!lectura) return null;
    return procesarLectura(lectura);
  }, [leer, procesarLectura]);

  const cancelar = useCallback(() => {
    cancelado.current = true;
    setEscaneando(false);
    setProgreso(null);
  }, []);

  return { escanear, leer, procesarLectura, escaneando, progreso, error, limpiar, cancelar };
}
