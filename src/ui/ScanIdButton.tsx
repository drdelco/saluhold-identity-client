// ScanIdButton.tsx — botón de "escanear DNI" reutilizable.
//
// Las tres pantallas de alta montan este componente y aplican el resultado. La
// decisión de qué hacer con lo leído no está aquí: vive en `useScanIdDocument`,
// para que ninguna pantalla pueda saltarse la búsqueda previa.
//
// Todas las vías pasan por un selector con dos huecos (anverso y reverso
// opcional), para que se vea cómo aportar las dos caras:
//   - MÓVIL: cámara trasera (`capture="environment"`; con "user" saldría la
//     frontal, inútil para un documento) o galería.
//   - ESCRITORIO: la cámara del propio equipo (getUserMedia, con su propio
//     flujo de dos capturas), la cámara del móvil enlazada por QR (la foto se
//     lee en el móvil y aquí solo llegan los campos), o subir fotos.

import { useState } from 'react';
import { Button, Group, Stack, Text, Alert, Loader, Menu } from '@mantine/core';
import { ScanLine, AlertTriangle, RotateCcw, Camera, Smartphone, Upload, ChevronDown } from 'lucide-react';
import { useScanIdDocument, type ResultadoEscaneo } from './useScanIdDocument';
import type { LecturaOk } from './documento';
import WebcamCaptureModal from './WebcamCaptureModal';
import QrHandoffModal from './QrHandoffModal';
import DocumentFacesPicker, { type OrigenFoto } from './DocumentFacesPicker';
import { hayTraspasoQr } from './config';

interface Props {
  onResultado: (r: ResultadoEscaneo) => void;
  /** Compacto para las cabeceras móviles. */
  size?: 'xs' | 'sm';
  disabled?: boolean;
  fullWidth?: boolean;
  /** Prefijo de ruta de la PWA móvil de la app, si tiene (SaluFile: '/rx'). */
  rutaMovil?: string;
}

const TEXTO_PROGRESO: Record<string, string> = {
  comprimiendo: 'Preparando la imagen…',
  leyendo: 'Leyendo el documento…',
  buscando: 'Comprobando si ya existe…',
};

type Via = 'webcam' | 'qr' | OrigenFoto;

/**
 * En un móvil no hay menú de vías: se usa la cámara trasera y punto. El
 * user-agent cubre el caso de abrir la app de escritorio desde un teléfono, y
 * `rutaMovil` el de una PWA que vive bajo un prefijo propio (en SaluFile, /rx).
 */
function esDispositivoMovil(rutaMovil?: string): boolean {
  if (typeof window === 'undefined') return false;
  if (rutaMovil && window.location.pathname.startsWith(rutaMovil)) return true;
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod/i.test(ua) || iPadOS;
}

export default function ScanIdButton({ onResultado, size = 'sm', disabled, fullWidth, rutaMovil }: Props) {
  const { escanear, procesarLectura, escaneando, progreso, error, limpiar } = useScanIdDocument();
  const [ultimoAviso, setUltimoAviso] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Via | null>(null);
  const [ultimaVia, setUltimaVia] = useState<Via | null>(null);
  const movil = esDispositivoMovil(rutaMovil);
  // El traspaso al móvil solo se ofrece si la app lo ha configurado: enseñar un
  // camino que no lleva a ninguna parte es peor que no enseñarlo.
  const conQr = hayTraspasoQr();

  const abrir = (via: Via) => {
    limpiar();
    setUltimaVia(via);
    setAbierta(via);
  };
  const cerrar = () => setAbierta(null);

  const entregar = (r: ResultadoEscaneo) => {
    if (r.avisos.includes('sin_reverso_no_hay_direccion')) {
      setUltimoAviso('Leído. Para el domicilio hace falta también el reverso del documento.');
    } else if (r.avisos.includes('documento_caducado')) {
      setUltimoAviso('Ojo: el documento está caducado. Los datos se han extraído igualmente.');
    }
    onResultado(r);
  };

  /** Fotos hechas o subidas AQUÍ: se leen y se decide. */
  const procesar = async (ficheros: File[]) => {
    if (!ficheros.length) return;
    limpiar();
    setUltimoAviso(null);
    const r = await escanear(ficheros);
    if (r) entregar(r);
  };

  /** Lectura hecha en el MÓVIL: solo queda decidir. */
  const procesarDesdeMovil = async (lectura: LecturaOk) => {
    limpiar();
    setUltimoAviso(null);
    const r = await procesarLectura(lectura);
    if (r) entregar(r);
  };

  const etiqueta = escaneando ? (TEXTO_PROGRESO[progreso || ''] || 'Leyendo…') : 'Escanear DNI';

  return (
    <Stack gap={6}>
      <Group gap="xs" wrap="wrap">
        {movil ? (
          <>
            <Button
              size={size}
              variant="light"
              color="serene"
              leftSection={escaneando ? <Loader size={14} /> : <ScanLine size={16} />}
              onClick={() => abrir('camara')}
              disabled={disabled || escaneando}
              fullWidth={fullWidth}
            >
              {etiqueta}
            </Button>
            {!escaneando && (
              <Button size={size} variant="subtle" color="gray" onClick={() => abrir('archivo')} disabled={disabled}>
                Subir fotos
              </Button>
            )}
          </>
        ) : (
          <Menu shadow="md" width={250} position="bottom-start" disabled={disabled || escaneando}>
            <Menu.Target>
              <Button
                size={size}
                variant="light"
                color="serene"
                leftSection={escaneando ? <Loader size={14} /> : <ScanLine size={16} />}
                rightSection={!escaneando && <ChevronDown size={14} />}
                disabled={disabled || escaneando}
                fullWidth={fullWidth}
              >
                {etiqueta}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Fotografiar el documento con</Menu.Label>
              <Menu.Item leftSection={<Camera size={16} />} onClick={() => abrir('webcam')}>
                Cámara de este equipo
              </Menu.Item>
              {conQr && (
                <Menu.Item leftSection={<Smartphone size={16} />} onClick={() => abrir('qr')}>
                  Cámara del móvil (QR)
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item leftSection={<Upload size={16} />} onClick={() => abrir('archivo')}>
                Subir fotos del documento
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      {/* Promesa explícita al usuario. Si algún día deja de ser cierta, este
          texto tiene que caer con ello. */}
      <Text size="xs" c="dimmed">
        Anverso y, si quieres el domicilio, también el reverso.
        La foto no se guarda: se procesa y se descarta.
      </Text>

      {ultimoAviso && (
        <Text size="xs" c="salu-yellow.8">{ultimoAviso}</Text>
      )}

      {error && (
        <Alert color="salu-yellow" variant="light" p="xs" icon={<AlertTriangle size={14} />}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text size="xs">{error}</Text>
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={<RotateCcw size={12} />}
              onClick={() => abrir(ultimaVia ?? (movil ? 'camara' : 'webcam'))}
            >
              Repetir
            </Button>
          </Group>
        </Alert>
      )}

      {/* Anverso + reverso opcional, desde la cámara del móvil o desde ficheros */}
      <DocumentFacesPicker
        opened={abierta === 'camara' || abierta === 'archivo'}
        origen={abierta === 'camara' ? 'camara' : 'archivo'}
        onClose={cerrar}
        onListo={(ficheros) => void procesar(ficheros)}
      />

      {!movil && (
        <>
          <WebcamCaptureModal
            opened={abierta === 'webcam'}
            onClose={cerrar}
            onCapturado={(ficheros) => void procesar(ficheros)}
          />
          {conQr && (
            <QrHandoffModal
              opened={abierta === 'qr'}
              onClose={cerrar}
              onLectura={(lectura) => void procesarDesdeMovil(lectura)}
            />
          )}
        </>
      )}
    </Stack>
  );
}
