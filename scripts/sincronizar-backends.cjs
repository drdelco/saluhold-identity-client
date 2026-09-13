// sincronizar-backends.cjs — lleva el código compartido a las Cloud Functions.
//
// POR QUÉ ESTO EXISTE
//
// Los frontends consumen el paquete como dependencia de GitHub y funciona
// porque se compilan AQUÍ: al desplegar solo se sube el `dist/` ya construido.
// Las Cloud Functions no: las construye Cloud Build, que hace `npm ci` en la
// nube, y ahí una dependencia de un repo PRIVADO de GitHub falla —el contenedor
// no tiene ni `ssh` ni credenciales:
//
//     npm error command git ls-remote ssh://git@github.com/drdelco/saluhold-identity-client.git
//     npm error ssh: not found
//
// Así que a los backends el código compartido se les deja copiado dentro, en
// `functions/compartido/`. Es una copia, sí, pero GENERADA: su única fuente es
// este paquete y se regenera con `npm run sync`. Eso es otra cosa que las seis
// implementaciones escritas a mano que había antes, que es lo que divergió.
//
// Si algún día el repo del paquete se hace público, esto sobra entero: bastaría
// con `npm i github:drdelco/saluhold-identity-client` en cada backend.
//
// Se copian el JavaScript CommonJS (de `dist-cjs/`) y los tipos (de `dist/`,
// que son los mismos para los dos sistemas de módulos), porque tres de los
// cuatro backends son TypeScript.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

/**
 * Backends que reciben la copia. Rutas relativas a C:\PROYECTOS.
 *
 * SaluFact no está: sus functions no vinculan pacientes ni leen el sexo, así
 * que una copia ahí sería un fichero muerto. Se añade el día que la necesite.
 */
const BACKENDS = [
  'identity/functions',
  'sanacloud/functions',
  'salufirst/functions',
];

/** Qué se comparte con los backends. Solo lo que no presupone navegador. */
const MODULOS = [
  'servidor/vinculacion',
  'servidor/index',
  'sexo',
  'identificador',
];

const CABECERA = `// GENERADO por @saluhold/identity-client — NO EDITAR A MANO.
// Fuente: C:\\PROYECTOS\\saluhold-identity-client/src/%SRC%
// Regenerar: cd C:\\PROYECTOS\\saluhold-identity-client && npm run sync
`;

function copiar(origen, destino, src) {
  if (!fs.existsSync(origen)) return false;
  const contenido = fs.readFileSync(origen, 'utf8');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, CABECERA.replace('%SRC%', src) + contenido);
  return true;
}

let copiados = 0;
for (const backend of BACKENDS) {
  const base = path.resolve(RAIZ, '..', backend, 'compartido');
  if (!fs.existsSync(path.dirname(base))) {
    console.log(`[sync] ${backend} no existe en esta máquina, se salta`);
    continue;
  }
  for (const mod of MODULOS) {
    const js = copiar(
      path.join(RAIZ, 'dist-cjs', `${mod}.js`),
      path.join(base, `${mod}.js`),
      `${mod}.ts`,
    );
    const dts = copiar(
      path.join(RAIZ, 'dist', `${mod}.d.ts`),
      path.join(base, `${mod}.d.ts`),
      `${mod}.ts`,
    );
    if (js || dts) copiados++;
  }
  console.log(`[sync] ${backend}/compartido actualizado`);
}
console.log(`[sync] ${copiados} módulos copiados a ${BACKENDS.length} backends`);
