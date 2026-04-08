// Build script: bundles index.html + style.css + app.js into a single dist/spending-plan.html
// Run with: node build.js

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

let output = html;

// Replace <link rel="stylesheet" href="style.css"> with inline <style>
output = output.replace(
  /<link\s+rel="stylesheet"\s+href="style\.css"\s*\/?>/,
  `<style>\n${css}\n</style>`
);

// Replace <script src="app.js"></script> with inline <script>
output = output.replace(
  /<script\s+src="app\.js"\s*><\/script>/,
  `<script>\n${js}\n</script>`
);

const distDir = path.join(dir, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

const outPath = path.join(distDir, 'spending-plan.html');
fs.writeFileSync(outPath, output, 'utf8');

const size = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`Built: dist/spending-plan.html (${size} KB)`);
