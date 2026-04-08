// Generate PNG icons from an SVG using Node.js canvas-free approach
// Creates simple colored icons with a "$" symbol as SVG, then uses them directly
const fs = require('fs');
const path = require('path');

function createSvgIcon(size) {
  const fontSize = Math.round(size * 0.5);
  const padding = Math.round(size * 0.15);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#2563eb"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
    font-size="${fontSize}" font-weight="800" fill="white">$</text>
</svg>`;
}

const iconsDir = path.join(__dirname, 'icons');

// Write SVG icons (browsers accept SVG for PWA icons too)
[192, 512].forEach(size => {
  const svg = createSvgIcon(size);
  // Save as SVG
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  console.log(`Generated: icons/icon-${size}.svg`);
});

console.log('\nNote: SVG icons generated. Update manifest.json to use .svg if needed,');
console.log('or convert to PNG using any image tool.');
