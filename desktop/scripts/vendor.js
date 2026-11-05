// Copies the two browser builds the page needs (three, matter-js) next to main.js, so the app serves them locally instead of from a CDN.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
fs.mkdirSync(path.join(root, 'vendor'), { recursive: true });
for (const [from, to] of [
  ['node_modules/three/build/three.min.js', 'vendor/three.min.js'],
  ['node_modules/matter-js/build/matter.min.js', 'vendor/matter.min.js'],
]) {
  fs.copyFileSync(path.join(root, from), path.join(root, to));
  console.log('vendor:', to);
}
