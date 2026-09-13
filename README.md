# @saluhold/identity-client

Código compartido por las aplicaciones del ecosistema **SaluHold** —
[SaluFile](https://salufile.com) (historia clínica), [SaluFirst](https://salufirst.com)
(admisión) y [SaluFact](https://salufact.com) (facturación)— más el portal de
administración de Identity.

## Por qué existe

Las tres apps hablan con el mismo servicio de datos maestros (Identity) y
comparten reglas de negocio idénticas. Cada vez que una de esas reglas se
escribía por separado en cada app, acababa divergiendo. No es una hipótesis:

- El sexo se almacena como `H`/`M`/`O`, donde **`M` es MUJER**. En un documento
  de identidad, en una MRZ, en HL7 y en cualquier formulario en inglés, `M` es
  *masculino*. Una app llegó a escribir `M` de masculino, y cada hombre dado de
  alta desde ella quedaba registrado como mujer.
- «Vincular un paciente a una clínica» estaba implementado **seis veces**, y una
  de esas copias dejaba al paciente sin número de historia.

Con un solo sitio donde vive cada regla no hay convenio que traducir mal.

## Qué hay dentro

| Entrada | Contenido | Dónde corre |
|---|---|---|
| `@saluhold/identity-client` | Codec del sexo, validación de DNI/NIE, cliente del servidor local | Navegador y servidor |
| `@saluhold/identity-client/ui` | Componentes React + Mantine: escáner de documentos, formulario de alta | Solo navegador |
| `@saluhold/identity-client/servidor` | Reglas que tocan Firestore con el Admin SDK | Solo Cloud Functions |

El núcleo no importa nada: ni React, ni Firebase. Quien solo necesite el codec
del sexo no paga por el resto.

## Instalación

```bash
npm i github:drdelco/saluhold-identity-client
```

Se compila al instalar (`prepare`), a ESM y a CommonJS a la vez: los frontends
se empaquetan con Vite o Metro, y las Cloud Functions corren CommonJS. El mapa
de `exports` reparte por condición, así que cada consumidor recibe lo suyo sin
configurar nada.

## Desarrollo

```bash
npm run build    # las dos compilaciones
npm run watch    # solo ESM, para iterar
```

Tras un cambio, en cada app que lo consuma: `npm install` para traer el commit
nuevo.

### `dist/` y `dist-cjs/` van versionados

No es lo habitual, y es a propósito. Al instalarse desde git, este paquete se
compila con el script `prepare`, así que **depende de que quien lo instale
ejecute scripts**. Un `npm ci --ignore-scripts` —bandera que muchos entornos de
integración añaden por seguridad— lo instalaría con código de salida 0 y sin
`dist-cjs`, y las Cloud Functions reventarían en ejecución sin que nadie hubiera
visto un error. Teniendo las compilaciones en el repositorio, ese caso funciona.

**Consecuencia: `npm run build` antes de cada commit que toque `src/`.** Quien
instale con scripts permitidos recompila igual y no llega a leer lo versionado,
así que un `dist/` desactualizado no rompe a nadie — pero deja el repositorio
mintiendo.

## Sobre este repositorio

Es público porque su código ya viajaba a los navegadores dentro de los bundles
de las aplicaciones, y porque siendo privado obligaba a copiarlo a mano dentro
de cada backend: Cloud Build instala dependencias sin credenciales de git.

No contiene claves, identificadores de proyecto ni datos de pacientes. Los
servicios a los que llama exigen autenticación por su cuenta; nada de lo que
hay aquí da acceso a nada.
