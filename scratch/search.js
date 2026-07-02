import fs from 'fs';
import path from 'path';

const searchDir = './src';
const query = 'nombreCompleto';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(searchDir);
console.log(`Buscando "${query}" en ${files.length} archivos...`);

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(query)) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes(query)) {
        console.log(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }
});
