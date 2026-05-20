const fs = require('fs');
const p = 'C:/Users/kofiLartey/Desktop/Personal Projects/Birthday/Birthday-Episode-1/birthday-app/src/pages/Slideshow.jsx';
const s = fs.readFileSync(p, 'utf8');
// Remove all JSX tags and attribute values so only JS `{ } ( )` matter
const clean = s
  .replace(/<[^>]*\s+[^>]*>/g, m => m.replace(/\{|\}/g, '_').replace(/\(|\)/g, '_'))
  .replace(/<[^>]*>/g, ' ')
  .replace(/\{[\s\S]*?\}/g, '{}')
  .replace(/\([\s\S]*?\)/g, '()');

const l = clean.split('\n');
let d = 0;
let lastErrors = [];
for (let i = 0; i < l.length; i++) {
  const op = (l[i].match(/\{/g) || []).length;
  const cl = (l[i].match(/\}/g) || []).length;
  d += op - cl;
  if (d < 0) lastErrors.push(`${i+1}: depth<0: ${l[i].trim().substr(0,80)}`);
}
console.log('cleaned final depth:', d);
console.log('errors:', lastErrors);
// also just show 1400-1415 area
console.log('\n=== lines 1395-1415 (raw) ===');
for (let i = 1394; i < 1416 && i < s.split('\n').length; i++) {
  console.log((i+1).toString().padStart(5), ' ', s.split('\n')[i].replace(/\t/g,'  ').substr(0,100));
}
