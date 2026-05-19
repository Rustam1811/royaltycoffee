const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'public', 'drinks');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();

let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Drinks Audit</title></head>
<body style="background:#2a0a0a;color:white;font-family:sans-serif;padding:20px">
<h1>Drinks Images Audit (${files.length} files)</h1>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:20px">`;

files.forEach(f => {
  const kb = Math.round(fs.statSync(path.join(dir, f)).size / 1024);
  html += `
  <div style="text-align:center;border:1px solid #D4AF37;border-radius:12px;padding:10px;background:#3c0a0a">
    <img src="/drinks/${f}" style="width:150px;height:150px;object-fit:contain" />
    <p style="font-size:11px;margin:5px 0 0;word-break:break-all">${f}</p>
    <p style="font-size:10px;color:#999">${kb} KB</p>
  </div>`;
});

html += '</div></body></html>';
const out = path.join(__dirname, '..', 'public', 'drinks-audit.html');
fs.writeFileSync(out, html);
console.log('Created ' + out + ' with ' + files.length + ' images');
