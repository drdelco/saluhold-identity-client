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
| `@saluhold/identity-client/correo` | `renderCorreo` y los tokens de marca de los correos de la suite | Navegador y servidor |

El núcleo no importa nada: ni React, ni Firebase. Quien solo necesite el codec
del sexo no paga por el resto.

## Correos

`renderCorreo({ app, variante, idioma, tenant, remitente, preheader, titulo,
antetitulo, bloques, pieAviso })` devuelve `{ html, text, fromName }`: el marco
completo de un correo (tarjeta de 600 px, tablas, estilos en línea) con los
tokens de `MARCAS`. Tres variantes según quién firma:

- **A**, predomina el centro: su logo (o su nombre) arriba, su color si llega a
  4,5:1 sobre blanco (si no, se oscurece o se usa el de la app), sus datos en el
  pie y «Enviado con {App}».
- **B**, discreto: sin cabecera ni color; el remitente como membrete.
- **C**, predomina la suite: icono PNG y wordmark de la app, pie SaluHold.
  Admite `tenant` opcional para el centro desde el que se escribe
  (invitaciones de personal, recordatorios, alta de médico en un centro):
  con `logoUrl`, el logo del centro va a la derecha de la cabecera (40 px de
  alto como máximo, 180 de ancho, sin deformarse; con `logoAncho`/`logoAlto` se fijan
  `width`/`height` exactos, que Outlook ignora `max-height`), y la app sigue
  a la izquierda; sin logo, `tenant.nombre` sale en una línea gris bajo el
  título, salvo que el llamador lo ponga en `antetitulo` (entonces no se
  repite). Acento, filete, remitente y pie siguen siendo los de la app; el
  color y los datos del centro no se usan en C. En árabe, espejo: la app a la
  derecha y el logo a la izquierda.

`remitenteDelCentro(app, nombreCentro, idioma)` devuelve «Centro (vía App)»
con el «vía» traducido (sin nombre, el de la app): es el `fromName` de la
variante A y el que usan las apps para las invitaciones de personal de un
centro (C), en cualquier plan (decisión de Diego, 2026-09-28). `renderCorreo`
no lo aplica solo en C: el llamador decide (el reset de Identity, por ejemplo,
sale como la app).

Los bloques son texto: todo se escapa y la única marca admitida es
`**negrita**` (más los saltos de línea). El pie, el remitente y los enlaces
alternativos salen en los doce idiomas de la suite; el árabe está para el
marco de derecha a izquierda. Pruebas: `npm test` (runner de Node, sin
dependencias).

| Bloque | Para qué |
|---|---|
| `parrafo`, `nota` | Texto normal (o `suave`) y letra pequeña |
| `boton` | El primero del correo es el primario (relleno, con su dirección debajo); los demás, o uno con `secundario`, son botones secundarios de verdad (borde de 1 px y texto del acento, fondo blanco). `tono: 'peligro'` para cancelar; `enlace: true` lo deja en enlace de texto con flecha |
| `acciones` | Fila de botones que se apila en el móvil: `{ botones: [{ texto, url, tono? }] }`. El primero es el primario (si el correo aún no tiene uno) |
| `tabla`, `rejilla` | Etiqueta/valor y varias columnas (agenda) |
| `lista`, `pasos` | Viñetas o números; `pasos` lleva título por paso: `{ items: [{ titulo, texto? }] }` |
| `caja` | Neutra, éxito, aviso o peligro |
| `ciclo` | Módulo menstrual del recordatorio: `{ titulo, texto?, fechas: [{ texto, url }], enlaces?, nota?, columnas?: 3 \| 4 }`; las fechas son botones pequeños en el acento del correo |
| `imagen` | QR, firma, imagen clave: `{ src (https en el dominio de la app, o cid:), alt, ancho?, pie? }`, centrada |
| `htmlConfianza` | Cuerpo con formato que escribe un profesional. Se sanea con `sanearHtmlCorreo` (abajo) |
| `separador`, `firma` | Raya y despedida con nombre |

Los botones sin su dirección debajo (los de `acciones` y los secundarios)
dejan su enlace en UNA línea al final del cuerpo: «Si los botones no se
muestran: Confirmar · Cancelar · Subir documentos».

`htmlConfianza` es la única puerta para HTML. Pasan `p, br, b, strong, i, em,
u, ul, ol, li, a` sin atributos —los estilos los pone el marco— y `a` solo con
un `href` https, mailto o tel. Lo que el editor de la suite produce además
(titulares, citas, color, tablas) se reduce a esa lista para que el paciente
no lea etiquetas; cualquier otra cosa (script, style, img, iframe, un
comentario, un `<` suelto) se escapa y se ve como texto. Las etiquetas se
equilibran: lo que quede abierto se cierra antes del bloque siguiente.

### Imágenes: todas desde el dominio de la app (0.9.0)

Un `<img>` solo sale si su dirección está en el dominio de la app que envía
(`MARCAS[app].web`) o es un `cid:`. Nada de `data:` ni de otros hosts (Resend:
«Host images on the sending domain»; los filtros corporativos lo puntúan).

- **Icono de la app**: PNG estático del Hosting de cada app (`MARCAS[app].iconoUrl`).
- **Logo del centro**: se pasa en `tenant.logoUrl` TAL CUAL está en Identity
  (`tenants/{id}.branding.logoUrl`, la dirección de Storage de
  `tenant_logos/{tenantId}/logo_{ts}.png`). El marco la traduce con
  `logoEnDominioDeLaApp(app, url)` a
  `https://{dominio de la app}/logo/{tenantId}/logo_{ts}.png`. Un logo que no
  esté en ese almacén (otro host, otra carpeta, SVG) no sale: queda el nombre
  del centro en texto. `saluHold` no tiene la ruta (sus correos no llevan logo).
- **Quien sirve `/logo/**`**: cada app, con un rewrite de Hosting a una función
  HTTP cuyo manejador es `manejarLogoCentro` de este paquete (solo GET/HEAD,
  ids validados, <= 2 MB, PNG/JPEG/GIF/WEBP por sus bytes, caché de 30 días
  para la CDN, sin credenciales: el objeto ya es de lectura pública).
- **Bloque `imagen`**: `src` https en el dominio de la app, o `cid:`.
- **Prueba para cada app**: `imagenesFueraDelDominio(app, html)` tiene que dar `[]`.

### Fuente de la marca: también desde el dominio de la app (0.9.1)

Ningún correo referencia `fonts.googleapis.com` ni `fonts.gstatic.com`, ni
ningún otro host que no sea el de la app que envía. Hasta 0.9.0 el marco
cargaba Mulish 800 (la del wordmark) con un `@import` de Google Fonts: era el
último recurso externo y lo que señalaba Resend.

- **Dónde vive**: cada app publica en su Hosting
  `/fonts/mulish-800.woff2` (`RUTA_FUENTE_MARCA`; Mulish 800, subconjunto
  latino, 13 KB, SIL OFL 1.1 con su `/fonts/OFL.txt`), con
  `Cache-Control: public, max-age=31536000, immutable`,
  `Access-Control-Allow-Origin: *` (una fuente se pide con CORS) y
  `Cross-Origin-Resource-Policy: cross-origin`. Si la fuente cambia, se
  publica con OTRO nombre y se cambia la constante (la caché es de un año).
- **Cómo la carga el correo**: `estiloFuenteDeMarca(app)` = un `<style>`
  propio con un `@font-face` cuyo `src` es
  `fuenteDeMarcaEnDominio(app)` (`https://{dominio de la app}/fonts/mulish-800.woff2`),
  envuelto en `<!--[if !mso]><!--> … <!--<![endif]-->`: Outlook de
  escritorio (Word), ante una fuente web declarada, ignora la pila de respaldo
  y pinta Times New Roman.
- **Qué se pinta con ella**: SOLO el wordmark de la app, que es ASCII en los 12
  idiomas. Ningún texto traducido usa esa fuente, así que no hay alfabeto sin
  cubrir. Donde el cliente no carga fuentes web (Gmail, Outlook), la pila de
  `FUENTES.marca` (Segoe UI, Arial…), como siempre. Apple Mail, iOS Mail,
  Thunderbird y Outlook para Mac sí la cargan.
- **`saluHold`** no publica la fuente (`APPS_CON_FUENTE_DE_MARCA`): sus
  correos no declaran `@font-face`.
- **Prueba para cada app**: `recursosFueraDelDominio(app, html)` tiene que dar
  `[]`. Mira todo lo que el cliente descargaría: cualquier `src`, `srcset`,
  `background`, `<link href>`, y `@import` / `url(...)` de los `<style>` y de
  los atributos `style`. Los enlaces de navegación (`<a href>`) no cuentan.

### Enlaces: al dominio de la app (0.9.2)

Resend: «Ensure link URLs match sending domain». Todo enlace http(s) de un
correo va al dominio de la app que lo envía (o a un subdominio suyo). Un botón
a `cloudfunctions.net`, a `run.app`, a otra app de la suite o a
`saluhold.com` es una señal que los filtros puntúan.

- **En el marco**: el pie de la variante C NOMBRA las apps hermanas en gris,
  sin enlazarlas; solo la propia app lleva enlace. La web del centro
  (`tenant.web`), su teléfono y su email van en texto.
- **En cada app**: los enlaces «de acción» (confirmar, cancelar, marcar una
  tarea…) no apuntan a la función: van por una ruta del Hosting de la app con
  un rewrite a esa función (GET solo muestra, POST ejecuta, formulario con
  `action=""`).
- **Prueba para cada app**: `enlacesFueraDelDominio(app, html, { permitidos })`
  tiene que dar `[]`. Mira el `href` de toda etiqueta que no sea `<link>`
  (`<a>`, `<area>`, VML) y el `action` de un formulario; `mailto:`, `tel:` y
  las anclas no cuentan. `permitidos` es la lista blanca EXPLÍCITA y corta de
  quien compone (una cadena vale para ese host y sus subdominios; una
  expresión regular se prueba contra el host): un destino externo inevitable
  (la sesión de pago de Stripe), un enlace a propósito a otra app, la web del
  propio centro o lo que escribe el profesional en el cuerpo libre.

### La marca del centro solo va en los planes que la incluyen

`renderCorreo` pinta el logo y el color del centro **solo si el llamador se los
pasa** en `tenant.logoUrl` / `tenant.colorPrimario`; no los busca por su
cuenta. Las apps solo los pasan en los planes con marca propia (Clínica y
Corporativo, los PRO). En el plan Solo la clínica es el propio médico: se pasa
`tenant: { nombre: 'Dra. Elena Ruiz', direccion, telefono }` sin logo ni color,
y la variante A sale con su nombre en texto sobrio arriba, el acento de la app
y sus datos en el pie. Sin «marca» que no tiene. Lo mismo en C: en Solo, el
nombre en gris bajo el título; en PRO, el logo en la cabecera.

## Traducir la interfaz

Todo el texto que pintan los componentes (`CamposAltaPaciente`, el escáner de
documentos, los avisos del QR y de la cámara) y todo el que devuelven funciones
como `validarAlta` sale de un único diccionario, `TextosUI`, con el castellano
por defecto. SaluFile, SaluFact y el portal son monolingües y no tienen que
tocar nada.

SaluFirst sí: es la única app de la suite que ha de ser multilingüe siempre,
para profesionales y para pacientes. Se sustituye entero o a trozos —lo que no
se pase se queda en castellano— al arrancar y en cada cambio de idioma:

```ts
import { configurarTextosUI, type TextosUI } from '@saluhold/identity-client/ui';

const construirTextos = (t: TFunction): Partial<TextosUI> => ({
  nombre: t('alta.nombre'),
  apellidos: t('alta.apellidos'),
  telefono: t('alta.telefono'),
  escanearDni: t('escaner.boton'),
  // …
});

configurarTextosUI(construirTextos(i18n.t));
i18n.on('languageChanged', () => configurarTextosUI(construirTextos(i18n.t)));
```

Cada llamada funde el parcial sobre el castellano, no sobre lo configurado
antes, así que al cambiar de idioma no quedan restos del anterior. Las cadenas
con variables llevan marcadores `{{campo}}` y hay que conservarlos en la
traducción. `TEXTOS_UI_ES` es el diccionario completo, útil como referencia de
qué claves existen; `configurarTextosUI` y `TextosUI` se exportan también desde
la raíz del paquete, para la app nativa, que no puede importar `/ui`.

Lo que **no** se traduce nunca son los valores que se guardan: el sexo sigue
viajando como `H`/`M`/`O` y el país por defecto como `España`, aunque el rótulo
se lea en otro idioma.

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
