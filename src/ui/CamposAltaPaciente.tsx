// CamposAltaPaciente.tsx — los campos del alta, iguales en las tres apps.
//
// Solo los CAMPOS. Los pasos de alrededor (buscar primero, vincular, firmar una
// vinculación presencial, asignar médico) se quedan en cada app, porque ahí sí
// hacen cosas distintas de verdad.
//
// Qué campos salen lo decide el perfil de la app, no este componente: SaluFact
// no pide sexo ni fecha de nacimiento porque para facturar no hacen falta. Ver
// `PERFILES_ALTA` en `altaPaciente.ts`.

import type { ReactNode } from 'react';
import { Stack, Group, Box, Text, TextInput, NativeSelect, Select, SimpleGrid } from '@mantine/core';
import { OPCIONES_SEXO, type SexoIdentity } from '../sexo';
import { validarIdentificador } from '../identificador';
import {
  pide,
  type FormularioAlta,
  type PerfilAlta,
} from './altaPaciente';
import { textosUI, interpolar } from './textos';

export interface CamposAltaPacienteProps {
  perfil: PerfilAlta;
  valores: FormularioAlta;
  /** Cambios parciales; el padre decide cómo los funde en su estado. */
  onChange: (cambios: Partial<FormularioAlta>) => void;
  /** Ficha sin documento: no se pide el NIF y el contacto pasa a ser lo crítico. */
  provisional?: boolean;
  disabled?: boolean;
  /**
   * Campos que el lector del documento no leyó con certeza. Se marcan para que
   * el ojo vaya a ellos; NUNCA para impedir guardar.
   */
  revisar?: string[];
  /** Lista de países de la app (cada una tiene la suya). */
  paises: Array<{ value: string; label: string }>;
  /** Idiomas de informe. Solo lo usa SaluFirst. */
  idiomas?: Array<{ value: string; label: string }>;
  /** Selector de prefijo telefónico de la app. */
  prefijoSlot?: ReactNode;
  /**
   * Rótulos que separan identidad, contacto y dirección. Puestos por defecto
   * porque el formulario es largo y sin ellos es un muro de campos; se pueden
   * quitar en pantallas estrechas, donde ocupan más de lo que orientan.
   */
  secciones?: boolean;
  /** El cursor empieza en el nombre. Útil cuando el modal abre directo al alta. */
  autoFocusNombre?: boolean;
}

export default function CamposAltaPaciente({
  perfil, valores, onChange, provisional = false, disabled = false,
  revisar = [], paises, idiomas, prefijoSlot, secciones = true, autoFocusNombre = false,
}: CamposAltaPacienteProps) {
  const t = textosUI();
  const marca = (campo: string) => (revisar.includes(campo) ? t.avisoRevisar : undefined);

  const Seccion = ({ children }: { children: string }) =>
    secciones ? <Text size="sm" fw={600} c="dimmed" tt="uppercase">{children}</Text> : null;

  // El VALOR es el contrato de Identity ('H' es hombre, 'M' es MUJER) y no se
  // traduce nunca; lo único que cambia de idioma es el rótulo.
  const rotuloSexo: Record<SexoIdentity, string> = {
    H: t.sexoHombre, M: t.sexoMujer, O: t.sexoOtro,
  };

  // Solo se comprueba la letra de un DNI o un NIE; un pasaporte no la tiene, y
  // ahí `validarIdentificador` devuelve 'no-aplica'.
  const validacion = !provisional && valores.nif.trim() ? validarIdentificador(valores.nif) : null;

  // El aviso se redacta AQUÍ y no se usa `validacion.mensaje`: ese lo compone el
  // núcleo, que comparten también las Cloud Functions, y viene siempre en
  // castellano. Los datos del fallo sí salen de allí.
  const errorNif = validacion?.estado === 'invalido'
    ? interpolar(
      validacion.tipo === 'DNI' ? t.nifLetraIncorrectaDni : t.nifLetraIncorrectaNie,
      {
        numero: validacion.normalizado.slice(0, 8),
        esperada: validacion.letraEsperada,
        letra: validacion.normalizado.slice(8),
      },
    )
    : undefined;

  return (
    <Stack gap="md">
      <Seccion>{t.seccionIdentidad}</Seccion>

      {!provisional && pide(perfil, 'nif') && (
        <TextInput
          label={t.nif}
          placeholder={t.nifPlaceholder}
          required
          disabled={disabled}
          value={valores.nif}
          onChange={(e) => {
            const v = e.currentTarget.value.toUpperCase();
            onChange({ nif: v });
          }}
          error={errorNif}
          description={
            validacion?.estado === 'valido'
              ? interpolar(t.nifValido, { tipo: validacion.tipo })
              : marca('nif')
          }
          styles={{ input: { fontFamily: 'monospace' } }}
        />
      )}

      <SimpleGrid cols={2}>
        <TextInput
          label={t.nombre}
          required
          autoFocus={autoFocusNombre}
          disabled={disabled}
          value={valores.nombre}
          onChange={(e) => { const v = e.currentTarget.value; onChange({ nombre: v }); }}
          description={marca('nombre')}
        />
        <TextInput
          label={t.apellidos}
          required
          disabled={disabled}
          value={valores.apellidos}
          onChange={(e) => { const v = e.currentTarget.value; onChange({ apellidos: v }); }}
          description={marca('apellidos')}
        />
      </SimpleGrid>

      <Seccion>{t.seccionContacto}</Seccion>

      <SimpleGrid cols={2}>
        <TextInput
          label={t.email}
          type="email"
          required={provisional}
          disabled={disabled}
          value={valores.email}
          onChange={(e) => { const v = e.currentTarget.value; onChange({ email: v }); }}
        />
        <Box>
          <Text size="sm" fw={500} mb={2}>{t.telefono}{provisional ? ' *' : ''}</Text>
          <Group gap={6} wrap="nowrap" align="flex-start">
            {prefijoSlot}
            <TextInput
              type="tel"
              style={{ flex: 1 }}
              disabled={disabled}
              value={valores.telefono}
              onChange={(e) => { const v = e.currentTarget.value; onChange({ telefono: v }); }}
            />
          </Group>
        </Box>
      </SimpleGrid>

      {provisional && (
        <Text size="xs" c="dimmed">{t.contactoObligatorioProvisional}</Text>
      )}

      {(pide(perfil, 'sexo') || pide(perfil, 'fechaNacimiento') || pide(perfil, 'idiomaInforme')) && (
        <SimpleGrid cols={3}>
          {pide(perfil, 'sexo') && (
            <NativeSelect
              label={t.sexo}
              disabled={disabled}
              value={valores.sexo}
              onChange={(e) => { const v = e.currentTarget.value; onChange({ sexo: v }); }}
              data={[
                { value: '', label: t.seleccionar },
                ...OPCIONES_SEXO.map(o => ({ value: o.value, label: rotuloSexo[o.value] })),
              ]}
              description={marca('sexo')}
            />
          )}
          {pide(perfil, 'fechaNacimiento') && (
            <TextInput
              label={t.fechaNacimiento}
              type="date"
              disabled={disabled}
              value={valores.fechaNacimiento}
              onChange={(e) => { const v = e.currentTarget.value; onChange({ fechaNacimiento: v }); }}
              description={marca('fechaNacimiento')}
            />
          )}
          {pide(perfil, 'idiomaInforme') && idiomas && (
            <NativeSelect
              label={t.idiomaInformes}
              disabled={disabled}
              value={valores.idiomaInforme}
              onChange={(e) => { const v = e.currentTarget.value; onChange({ idiomaInforme: v }); }}
              data={idiomas}
            />
          )}
        </SimpleGrid>
      )}

      {/* País y nacionalidad van en Select BUSCABLE y no en NativeSelect: son
          dos listas de ~200 entradas y sin buscador hay que bajarlas a rueda.
          Sexo e idioma sí son NativeSelect, que con tres opciones es más rápido. */}
      {pide(perfil, 'nacionalidad') && (
        <Select
          label={t.nacionalidad}
          searchable
          clearable
          nothingFoundMessage={t.sinCoincidencias}
          placeholder={t.sinEspecificar}
          disabled={disabled}
          value={valores.nacionalidad || null}
          onChange={(v) => onChange({ nacionalidad: v || '' })}
          data={paises}
          description={marca('nacionalidad')}
        />
      )}

      {pide(perfil, 'direccion') && (
        <Stack gap="sm">
          <Seccion>{t.seccionDireccion}</Seccion>
          <TextInput
            label={t.direccion}
            disabled={disabled}
            value={valores.calle}
            onChange={(e) => { const v = e.currentTarget.value; onChange({ calle: v }); }}
            description={marca('calle')}
          />
          <SimpleGrid cols={4}>
            <TextInput
              label={t.codigoPostal}
              disabled={disabled}
              value={valores.codigoPostal}
              onChange={(e) => { const v = e.currentTarget.value; onChange({ codigoPostal: v }); }}
              description={marca('codigoPostal')}
            />
            <TextInput
              label={t.poblacion}
              disabled={disabled}
              value={valores.poblacion}
              onChange={(e) => { const v = e.currentTarget.value; onChange({ poblacion: v }); }}
              description={marca('poblacion')}
            />
            <TextInput
              label={t.provincia}
              disabled={disabled}
              value={valores.provincia}
              onChange={(e) => { const v = e.currentTarget.value; onChange({ provincia: v }); }}
              description={marca('provincia')}
            />
            <Select
              label={t.pais}
              searchable
              allowDeselect={false}
              nothingFoundMessage={t.sinCoincidencias}
              disabled={disabled}
              value={valores.pais || null}
              onChange={(v) => onChange({ pais: v || '' })}
              data={paises}
            />
          </SimpleGrid>
          {/* En España la provincia y el municipio los normaliza el servidor a
              partir del código postal, así que se guardan siempre con la misma
              grafía venga de un teclado o de un DNI escaneado. */}
          <Text size="xs" c="dimmed">{t.avisoNormalizacionEspana}</Text>
        </Stack>
      )}
    </Stack>
  );
}
