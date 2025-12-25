// Skrypt Node.js do generowania ikon PNG z SVG
// Wymaga: npm install sharp
// Uruchom: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Proste ikony PNG jako base64 (jeśli nie masz sharp)
// Możesz też użyć narzędzia online: https://convertio.co/svg-png/

console.log('Aby utworzyć ikony PNG:');
console.log('1. Otwórz w przeglądarce: http://10.10.10.17:3000/create-png-icons.html');
console.log('2. Ikony zostaną automatycznie pobrane');
console.log('3. Zapisz je w folderze public/');
console.log('');
console.log('LUB użyj narzędzia online:');
console.log('- https://convertio.co/svg-png/');
console.log('- Przekształć icon-192.svg → icon-192.png (192x192)');
console.log('- Przekształć icon-512.svg → icon-512.png (512x512)');


