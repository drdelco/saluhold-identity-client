// QrHandoffModal.tsx — leer el DNI con la cámara del móvil desde el escritorio.
//
// El escritorio abre una sesión de escaneo, la muestra como QR y espera. El
// móvil (SaluFile, identificado en la misma clínica) escanea el QR, fotografía
// el documento, lo lee y deja los campos en la sesión. Este modal solo entrega
// esa lectura al botón, que la procesa igual que si la foto se hubiera hecho
// aquí (búsqueda por NIF antes de nada).
//
// La sesión se borra al consumirse o al cerrar el modal; si no, caduca a los
// 10 minutos (TTL de Firestore).

import { useEffect, useRef, useState } from 'react';
import { Modal, Stack, Group, Text, Button, Image, Alert, Loader, Badge, Center } from '@mantine/core';
import { Smartphone, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import {
  crearSesionEscaneo, escucharSesion, borrarSesion, urlDeSesion, sesionCaducada,
  SCAN_SESSION_TTL_MIN, type ScanSession,
} from './sesionEscaneo';
import type { LecturaOk } from './documento';
import { mensajeDeError } from './config';
import { textosUI } from './textos';

interface Props {
  opened: boolean;
  onClose: () => void;
  onLectura: (lectura: LecturaOk) => void;
}

type Fase = 'creando' | 'esperando' | 'movil-conectado' | 'recibido' | 'caducado' | 'error';

export default function QrHandoffModal({ opened, onClose, onLectura }: Props) {
  const t = textosUI();
  const [fase, setFase] = useState<Fase>('creando');
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restante, setRestante] = useState(SCAN_SESSION_TTL_MIN * 60);
  const sesionRef = useRef<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const consumidaRef = useRef(false);

  const limpiar = () => {
    unsubRef.current?.();
    unsubRef.current = null;
    if (sesionRef.current) {
      void borrarSesion(sesionRef.current);
      sesionRef.current = null;
    }
  };

  const abrirSesion = async () => {
    limpiar();
    consumidaRef.current = false;
    setFase('creando');
    setError(null);
    setQr(null);
    try {
      const { id, expiresAt } = await crearSesionEscaneo();
      sesionRef.current = id;
      setRestante(Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)));
      setQr(await QRCode.toDataURL(urlDeSesion(id), { width: 280, margin: 1, errorCorrectionLevel: 'M' }));
      setFase('esperando');

      unsubRef.current = escucharSesion(
        id,
        (s: ScanSession | null) => {
          if (!s || consumidaRef.current) return;
          if (s.status === 'done' && s.lectura?.ok) {
            consumidaRef.current = true;
            setFase('recibido');
            onLectura(s.lectura);
            // La lectura ya está en el escritorio: la sesión no tiene que
            // sobrevivir ni un segundo más.
            limpiar();
            onClose();
            return;
          }
          if (sesionCaducada(s)) { setFase('caducado'); return; }
          if (s.status === 'scanning') setFase('movil-conectado');
        },
        (e) => { setError(mensajeDeError(e, t.errorConexionSesion)); setFase('error'); }
      );
    } catch (e: any) {
      setError(mensajeDeError(e, t.errorCrearSesion));
      setFase('error');
    }
  };

  useEffect(() => {
    if (!opened) return;
    void abrirSesion();
    return () => limpiar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // Cuenta atrás: al llegar a cero el QR deja de servir aunque Firestore aún
  // no haya borrado el doc.
  useEffect(() => {
    if (fase !== 'esperando' && fase !== 'movil-conectado') return;
    const t = setInterval(() => {
      setRestante(r => {
        if (r <= 1) { setFase('caducado'); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [fase]);

  const mm = String(Math.floor(restante / 60)).padStart(2, '0');
  const ss = String(restante % 60).padStart(2, '0');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t.camaraMovil}
      size="sm"
      centered
      zIndex={400}
    >
      <Stack gap="sm" align="center">
        <Text size="sm" c="dimmed" ta="center">{t.instruccionesQr}</Text>

        {fase === 'creando' && <Center h={280}><Loader color="serene" /></Center>}

        {(fase === 'esperando' || fase === 'movil-conectado') && qr && (
          <>
            <Image src={qr} alt={t.altQr} w={280} h={280} />
            <Group gap="xs">
              {fase === 'movil-conectado'
                ? <Badge color="serene" variant="light" leftSection={<Smartphone size={12} />}>{t.movilConectado}</Badge>
                : <Badge color="gray" variant="light">{t.esperandoMovil}</Badge>}
              <Text size="xs" c="dimmed" ff="monospace">{mm}:{ss}</Text>
            </Group>
          </>
        )}

        {fase === 'recibido' && (
          <Group gap="xs" c="serene.7">
            <CheckCircle2 size={18} />
            <Text size="sm">{t.documentoRecibido}</Text>
          </Group>
        )}

        {fase === 'caducado' && (
          <Alert color="salu-yellow" variant="light" icon={<AlertTriangle size={16} />} w="100%">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm">{t.qrCaducado}</Text>
              <Button size="compact-xs" variant="subtle" leftSection={<RotateCcw size={12} />} onClick={() => void abrirSesion()}>
                {t.generarOtroQr}
              </Button>
            </Group>
          </Alert>
        )}

        {fase === 'error' && (
          <Alert color="salu-red" variant="light" icon={<AlertTriangle size={16} />} w="100%">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm">{error}</Text>
              <Button size="compact-xs" variant="subtle" leftSection={<RotateCcw size={12} />} onClick={() => void abrirSesion()}>
                {t.reintentar}
              </Button>
            </Group>
          </Alert>
        )}

        <Text size="xs" c="dimmed" ta="center">{t.avisoQrPie}</Text>
      </Stack>
    </Modal>
  );
}
