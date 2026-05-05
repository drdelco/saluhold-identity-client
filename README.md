# @saluhold/identity-client

Cliente JS compartido para el Local Server SaluHold. Fuente única de verdad
para los wrappers que SaluFile, SaluFact y SaluFirst usan al hablar con el
servidor local que cachea pacientes y empresas de Identity.

## Por qué existe

El Local Server (proceso que corre en el PC de cada clínica) lo despliega
SaluFile, pero los tres frontends del ecosistema lo consumen. Antes de este
paquete, cada frontend tenía su propio `localServer.ts` divergente — un bug
del cliente había que arreglarlo en tres sitios.

Aquí vive UN solo cliente. Cada app lo importa via `file:` reference:

```jsonc
// package.json de cada app
{
  "dependencies": {
    "@saluhold/identity-client": "file:../saluhold-identity-client"
  }
}
```

## Workflow

1. Modificar código en `src/`.
2. `npm run build` (genera `dist/`).
3. En cada app que lo consuma: `npm install` (re-link).
4. Si trabajas en local muy iterativo: `npm run watch` rebuilds on save.

## Versionado

`package.json::version` se sube manualmente cuando hay cambios incompatibles.
Las apps hacen `npm install` para coger lo último (file: reference no
versiona estricto, así que **todo cambio es inmediato** al re-instalar).

## Migración futura

Cuando estemos listos, este paquete puede:
- Subirse a GitHub privado y consumirse via `npm install github:org/repo#tag`.
- Convertirse en workspace de un monorepo pnpm.
- Publicarse a npm registry privado.

Hoy: `file:` local es lo más simple. Sin tooling, sin CI, sin GitHub.
