// WebcamCaptureModal.tsx — fotografiar el documento con la cámara del equipo.
//
// En un PC no hay `capture="environment"` que valga: el input de fichero abre
// el explorador. Aquí se usa getUserMedia, se muestra la previsualización y
// cada captura se convierte en un File JPEG que entra por el MISMO camino que
// una foto subida o hecha en el móvil. El modal no sabe nada de la lectura:
// devuelve ficheros y se cierra.
//
// La captura vive solo en memoria hasta que se lee; no se guarda ni se sube.

import { useEffect, useRef, useState } from 'react';
import { Modal, Stack, Group, Button, Text, Select, Alert, Box, Image, Loader } from '@mantine/core';
import { Camera, AlertTriangle, RotateCcw, ScanLine } from 'lucide-react';
import { mensajeDeError } from './config';

interface Props {
  opened: boolean;
  onClose: () => void;
  /** Anverso y, si se capturó, reverso. */
  onCapturado: (ficheros: File[]) => void;
}

interface Captura { fichero: File; url: string }

const MENSAJE_CAMARA: Record<string, string> = {
  NotAllowedError: 'Permiso de cámara denegado. Actívalo en el navegador para este sitio.',
  NotFoundError: 'No se ha encontrado ninguna cámara en este equipo.',
  NotReadableError: 'La cámara está en uso por otra aplicación.',
  OverconstrainedError: 'La cámara seleccionada no está disponible.',
};

export default function WebcamCaptureModal({ opened, onClose, onCapturado }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [dispositivos, setDispositivos] = useState<MediaDeviceInfo[]>([]);
  const [dispositivoId, setDispositivoId] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [capturas, setCapturas] = useState<Captura[]>([]);

  const detener = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const arrancar = async (deviceId: string | null) => {
    detener();
    setIniciando(true);
    setErrorCamara(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { /* autoplay bloqueado: el usuario ya interactuó */ });
      }
      // Las etiquetas de los dispositivos solo llegan tras conceder permiso.
      const lista = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      setDispositivos(lista);
      const activo = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (activo) setDispositivoId(activo);
    } catch (e: any) {
      setErrorCamara(MENSAJE_CAMARA[e?.name] || mensajeDeError(e, 'No se ha podido abrir la cámara.'));
    } finally {
      setIniciando(false);
    }
  };

  useEffect(() => {
    if (!opened) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorCamara('Este navegador no permite usar la cámara.');
      return;
    }
    void arrancar(null);
    return () => {
      detener();
      setCapturas(prev => { prev.forEach(c => URL.revokeObjectURL(c.url)); return []; });
      setErrorCamara(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const capturar = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    if (!blob) return;
    const cara = capturas.length === 0 ? 'anverso' : 'reverso';
    const fichero = new File([blob], `${cara}.jpg`, { type: 'image/jpeg' });
    setCapturas(prev => [...prev, { fichero, url: URL.createObjectURL(blob) }]);
  };

  const repetirUltima = () => {
    setCapturas(prev => {
      const ultima = prev[prev.length - 1];
      if (ultima) URL.revokeObjectURL(ultima.url);
      return prev.slice(0, -1);
    });
  };

  const leer = () => {
    const ficheros = capturas.map(c => c.fichero);
    onCapturado(ficheros);
    onClose();
  };

  const puedeCapturar = !errorCamara && !iniciando && capturas.length < 2;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Cámara de este equipo"
      size="lg"
      centered
      zIndex={400}
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Coloca el documento plano, bien iluminado y ocupando la imagen. Primero el anverso;
          el reverso solo hace falta para el domicilio. La foto no se guarda: se procesa y se descarta.
        </Text>

        {dispositivos.length > 1 && (
          <Select
            size="xs"
            label="Cámara"
            value={dispositivoId}
            data={dispositivos.map((d, i) => ({ value: d.deviceId, label: d.label || `Cámara ${i + 1}` }))}
            onChange={(v) => { if (v) { setDispositivoId(v); void arrancar(v); } }}
            allowDeselect={false}
          />
        )}

        {errorCamara ? (
          <Alert color="salu-yellow" variant="light" icon={<AlertTriangle size={16} />}>
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm">{errorCamara}</Text>
              <Button size="compact-xs" variant="subtle" leftSection={<RotateCcw size={12} />} onClick={() => void arrancar(dispositivoId)}>
                Reintentar
              </Button>
            </Group>
          </Alert>
        ) : (
          <Box pos="relative" bg="dark.8" style={{ borderRadius: 8, overflow: 'hidden', minHeight: 240 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', display: 'block', maxHeight: '55vh', objectFit: 'contain' }}
            />
            {iniciando && (
              <Group pos="absolute" inset={0} justify="center" align="center">
                <Loader color="white" size="sm" />
              </Group>
            )}
          </Box>
        )}

        {capturas.length > 0 && (
          <Group gap="sm">
            {capturas.map((c, i) => (
              <Stack key={c.url} gap={2} align="center">
                <Image src={c.url} alt={i === 0 ? 'Anverso' : 'Reverso'} w={120} radius="sm" />
                <Text size="xs" c="dimmed">{i === 0 ? 'Anverso' : 'Reverso'}</Text>
              </Stack>
            ))}
          </Group>
        )}

        <Group justify="space-between" wrap="wrap">
          <Group gap="xs">
            <Button
              variant="light"
              color="serene"
              leftSection={<Camera size={16} />}
              onClick={() => void capturar()}
              disabled={!puedeCapturar}
            >
              {capturas.length === 0 ? 'Capturar anverso' : 'Capturar reverso'}
            </Button>
            {capturas.length > 0 && (
              <Button variant="subtle" color="gray" leftSection={<RotateCcw size={14} />} onClick={repetirUltima}>
                Repetir {capturas.length === 1 ? 'anverso' : 'reverso'}
              </Button>
            )}
          </Group>
          <Button
            color="serene"
            leftSection={<ScanLine size={16} />}
            onClick={leer}
            disabled={capturas.length === 0}
          >
            Leer documento
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
