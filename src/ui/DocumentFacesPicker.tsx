// DocumentFacesPicker.tsx — elegir anverso y (opcionalmente) reverso, a la vista.
//
// Un `<input multiple>` admite dos fotos, pero solo si el usuario sabe que
// tiene que seleccionarlas a la vez en el diálogo del sistema, y en el móvil
// la cámara devuelve una sola: el reverso era imposible. Aquí cada cara tiene
// su hueco, su botón y su miniatura, y "Leer documento" se activa con el
// anverso. El reverso queda claro que es opcional y para qué sirve.
//
// Sirve para dos orígenes: `camara` (cámara trasera del móvil, una foto por
// hueco) y `archivo` (selector de ficheros). No lee nada: devuelve los
// ficheros en orden [anverso, reverso?] y se cierra.

import { useEffect, useRef, useState } from 'react';
import { Modal, Stack, Group, Button, Text, Paper, Image, ActionIcon, SimpleGrid } from '@mantine/core';
import { Camera, Upload, ScanLine, X, CreditCard } from 'lucide-react';
import { textosUI, interpolar } from './textos';

export type OrigenFoto = 'camara' | 'archivo';

interface Props {
  opened: boolean;
  onClose: () => void;
  onListo: (ficheros: File[]) => void;
  origen: OrigenFoto;
}

interface Foto { fichero: File; url: string }

function Hueco({
  titulo, ayuda, foto, origen, onElegir, onQuitar,
}: {
  titulo: string;
  ayuda: string;
  foto: Foto | null;
  origen: OrigenFoto;
  onElegir: () => void;
  onQuitar: () => void;
}) {
  const t = textosUI();
  return (
    <Paper
      p="sm"
      radius="md"
      withBorder
      style={{ borderStyle: foto ? 'solid' : 'dashed', minHeight: 170 }}
    >
      <Stack gap={6} align="center" justify="center" h="100%">
        <Text size="sm" fw={600}>{titulo}</Text>
        {foto ? (
          <>
            <Image src={foto.url} alt={titulo} h={96} w="auto" fit="contain" radius="sm" />
            <Group gap={4}>
              <Button size="compact-xs" variant="subtle" color="gray" onClick={onElegir}>{t.cambiar}</Button>
              <ActionIcon size="sm" variant="subtle" color="gray" onClick={onQuitar} aria-label={interpolar(t.quitarCara, { cara: titulo })}>
                <X size={14} />
              </ActionIcon>
            </Group>
          </>
        ) : (
          <>
            <CreditCard size={28} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Button
              size="xs"
              variant="light"
              color="serene"
              leftSection={origen === 'camara' ? <Camera size={14} /> : <Upload size={14} />}
              onClick={onElegir}
            >
              {origen === 'camara' ? t.hacerFoto : t.elegirFoto}
            </Button>
            <Text size="xs" c="dimmed" ta="center">{ayuda}</Text>
          </>
        )}
      </Stack>
    </Paper>
  );
}

export default function DocumentFacesPicker({ opened, onClose, onListo, origen }: Props) {
  const t = textosUI();
  const [anverso, setAnverso] = useState<Foto | null>(null);
  const [reverso, setReverso] = useState<Foto | null>(null);
  const anversoRef = useRef<HTMLInputElement>(null);
  const reversoRef = useRef<HTMLInputElement>(null);

  // Al cerrar se sueltan las miniaturas: no queda copia de la foto en memoria.
  useEffect(() => {
    if (opened) return;
    setAnverso(prev => { if (prev) URL.revokeObjectURL(prev.url); return null; });
    setReverso(prev => { if (prev) URL.revokeObjectURL(prev.url); return null; });
  }, [opened]);

  const asignar = (setter: typeof setAnverso) => (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setter(prev => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { fichero: f, url: URL.createObjectURL(f) };
    });
  };

  const quitar = (setter: typeof setAnverso) => () =>
    setter(prev => { if (prev) URL.revokeObjectURL(prev.url); return null; });

  const leer = () => {
    if (!anverso) return;
    const ficheros = reverso ? [anverso.fichero, reverso.fichero] : [anverso.fichero];
    onListo(ficheros);
    onClose();
  };

  const inputProps = {
    type: 'file' as const,
    accept: origen === 'camara' ? 'image/*' : 'image/jpeg,image/png,image/webp',
    style: { display: 'none' },
    ...(origen === 'camara' ? { capture: 'environment' as const } : {}),
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={origen === 'camara' ? t.fotografiarDocumento : t.subirFotosDocumento}
      size="md"
      centered
      zIndex={400}
    >
      <Stack gap="sm">
        <SimpleGrid cols={2} spacing="sm">
          <Hueco
            titulo={t.anverso}
            ayuda={t.ayudaAnverso}
            foto={anverso}
            origen={origen}
            onElegir={() => anversoRef.current?.click()}
            onQuitar={quitar(setAnverso)}
          />
          <Hueco
            titulo={t.reverso}
            ayuda={t.ayudaReverso}
            foto={reverso}
            origen={origen}
            onElegir={() => reversoRef.current?.click()}
            onQuitar={quitar(setReverso)}
          />
        </SimpleGrid>

        <Text size="xs" c="dimmed">{t.avisoFotoNoSeGuarda}</Text>

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>{t.cancelar}</Button>
          <Button color="serene" leftSection={<ScanLine size={16} />} onClick={leer} disabled={!anverso}>
            {t.leerDocumento}
          </Button>
        </Group>

        <input ref={anversoRef} {...inputProps} onChange={(e) => { asignar(setAnverso)(e.currentTarget.files); e.currentTarget.value = ''; }} />
        <input ref={reversoRef} {...inputProps} onChange={(e) => { asignar(setReverso)(e.currentTarget.files); e.currentTarget.value = ''; }} />
      </Stack>
    </Modal>
  );
}
