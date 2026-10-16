// La cuenta de Identity Auth de un profesional se enlaza en `authUid` (16-10-2026).
//
// `idExterno` era un nombre heredado de FileMaker que significaba dos cosas (el
// nº de registro en pacientes y empresas, el uid en profesionales). Identity lo
// retiró de las tres colecciones: el SDK no lo nombra en ningún sitio.
//
//   npm test

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function ficheros(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const r = path.join(dir, e.name);
    return e.isDirectory() ? ficheros(r) : /\.(ts|tsx|js|cjs)$/.test(e.name) ? [r] : [];
  });
}

test('vigía: el SDK no nombra `idExterno` (el enlace con la cuenta es `authUid`)', () => {
  const raiz = path.join(__dirname, '..');
  const todos = ['src', 'dist', 'dist-cjs'].flatMap((d) => ficheros(path.join(raiz, d)));
  assert.ok(todos.length > 20);
  const culpables = todos.filter((f) => /idExterno/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(raiz, f));
  assert.deepEqual(culpables, []);
});
