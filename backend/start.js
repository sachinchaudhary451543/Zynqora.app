const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, 'dist', 'main.js'),
  path.join(__dirname, 'dist', 'src', 'main.js'),
  path.join(__dirname, '..', 'dist', 'main.js'),
  path.join(__dirname, '..', 'dist', 'src', 'main.js'),
];

const entrypoint = candidates.find((candidate) => fs.existsSync(candidate));
if (!entrypoint) {
  throw new Error(`Nest build output not found. Checked: ${candidates.join(', ')}`);
}

require(entrypoint);
