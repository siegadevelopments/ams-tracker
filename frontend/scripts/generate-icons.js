const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 blue PNG buffer
const bluePngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwEC+7lHqwAAAABJRU5ErkJggg==',
  'base64'
);

const publicDir = path.join(__dirname, '../public');

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), bluePngBuffer);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), bluePngBuffer);

console.log('✓ PWA icons generated successfully in public/');
