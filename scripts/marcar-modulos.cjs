// marcar-modulos.cjs — deja claro que `dist-cjs/` es CommonJS.
//
// Un `package.json` de una línea dentro de la carpeta acota el `type` a esa
// carpeta. Hoy es redundante —el `package.json` del paquete no declara `type`,
// así que CommonJS ya es lo que Node supone—, pero deja de serlo en cuanto
// alguien añada `"type": "module"` arriba, y entonces el build de servidor
// dejaría de cargar sin que nada lo avise.
//
// `dist/` NO se marca como `module` a propósito. Ese build lo consumen solo
// bundlers (Vite, Metro), que resuelven por el mapa de `exports`, y sus imports
// salen sin extensión (`from './identificador'`) porque el tsconfig usa
// `moduleResolution: "Bundler"`. El resolvedor ESM de Node exige la extensión,
// así que marcarlo como `module` solo consigue que Node intente cargarlo y
// falle con ERR_MODULE_NOT_FOUND. Sin el marcador se queda como estaba: para
// bundlers. Quien necesite cargarlo desde Node usa la subruta CommonJS.

const fs = require('fs');
const path = require('path');

for (const [carpeta, tipo] of [['dist-cjs', 'commonjs']]) {
  const destino = path.join(__dirname, '..', carpeta);
  if (!fs.existsSync(destino)) continue;
  fs.writeFileSync(
    path.join(destino, 'package.json'),
    JSON.stringify({ type: tipo }, null, 2) + '\n',
  );
  console.log(`[marcar-modulos] ${carpeta}/package.json → type: ${tipo}`);
}
