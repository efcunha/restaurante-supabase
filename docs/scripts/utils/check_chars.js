// ORPHANED UTILITY — target file (conectar_whatsapp.js) no longer exists in this repo.
// This script was a one-off char-code debugger for a WhatsApp integration file.
// Do not call this from npm scripts or CI. Safe to delete when confirmed obsolete.
const fs = require('fs');
const content = fs.readFileSync('../conectar_whatsapp.js', 'utf8');
const lines = content.split('\n');
console.log('Line 13:', Array.from(lines[12]).map(c => c.charCodeAt(0)));
console.log('Line 14:', Array.from(lines[13]).map(c => c.charCodeAt(0)));
console.log('Line 15:', Array.from(lines[14]).map(c => c.charCodeAt(0)));
