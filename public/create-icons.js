// Prosty skrypt Node.js do utworzenia ikon PWA
// Uruchom: node create-icons.js (wymaga canvas package: npm install canvas)

const fs = require('fs');
const path = require('path');

// Prosty SVG jako placeholder - użytkownik może później zastąpić prawdziwymi ikonami
const icon192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#1e3a8a"/>
  <text x="96" y="120" font-size="100" text-anchor="middle" fill="white">📁</text>
</svg>`;

const icon512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1e3a8a"/>
  <text x="256" y="320" font-size="260" text-anchor="middle" fill="white">📁</text>
</svg>`;

// Zapisujemy jako SVG (przeglądarki obsługują SVG w manifest)
fs.writeFileSync(path.join(__dirname, 'icon-192.svg'), icon192);
fs.writeFileSync(path.join(__dirname, 'icon-512.svg'), icon512);

console.log('Ikony SVG utworzone! Możesz je później zastąpić PNG.');
console.log('Aby utworzyć PNG, użyj narzędzia online lub ImageMagick:');
console.log('convert icon-192.svg -resize 192x192 icon-192.png');


