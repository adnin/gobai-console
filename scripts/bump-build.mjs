import fs from 'node:fs';

const file = 'version.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

if (typeof data.build !== 'number') {
  throw new Error('version.json must contain numeric { build }');
}

data.build += 1;

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('✅ build incremented:', data.build);
