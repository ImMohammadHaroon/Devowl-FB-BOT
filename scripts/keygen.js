const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let count = 1;

const countIndex = args.indexOf('--count');
if (countIndex !== -1 && args[countIndex + 1]) {
  const parsed = parseInt(args[countIndex + 1], 10);
  if (!isNaN(parsed)) {
    count = parsed;
  }
}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateKey() {
  let key = '';
  // Loop until we get 16 valid characters
  while (key.length < 16) {
    const bytes = crypto.randomBytes(16);
    for (let i = 0; i < bytes.length; i++) {
      // Ensure equal distribution
      if (bytes[i] < chars.length * Math.floor(256 / chars.length)) {
        key += chars[bytes[i] % chars.length];
        if (key.length === 16) break;
      }
    }
  }
  return `${key.slice(0, 4)}-${key.slice(4, 8)}-${key.slice(8, 12)}-${key.slice(12, 16)}`;
}

const keys = [];
for (let i = 0; i < count; i++) {
  keys.push(generateKey());
}

const outputPath = path.join(__dirname, 'generated-keys.txt');
fs.appendFileSync(outputPath, keys.join('\n') + '\n', 'utf8');

console.log(`Generated ${count} keys:`);
keys.forEach(k => console.log(k));
console.log(`\nSaved appended keys to ${outputPath}`);
