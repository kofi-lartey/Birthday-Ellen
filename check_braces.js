const fs = require('fs');
const filePath = 'C:/Users/kofiLartey/Desktop/Personal Projects/Birthday/Birthday-Episode-1/birthday-app/src/pages/Slideshow.jsx';
const s = fs.readFileSync(filePath, 'utf8');
const lines = s.split('\n');
let d = 0;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const op = (l.match(/\{/g) || []).length;
  const cl = (l.match(/\}/g) || []).length;
  d += op - cl;
  if (d < 0) {
    console.log(`depth<0 at line ${i+1}, depth=${d}: ${lines[i].trim().substring(0,80)}`);
    break;
  }
}
console.log('final depth:', d);
let d2 = 0, lastOpen = 0;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const op = (l.match(/\{/g) || []).length;
  const cl = (l.match(/\}/g) || []).length;
  d2 += op - cl;
  if (op > cl) lastOpen = i+1;
}
console.log('last open-brace line:', lastOpen);

// Print lines 1480-1525 to inspect
console.log('\n=== exportVideo block (lines 1480-1525) ===');
for (let i = 1479; i < Math.min(1526, lines.length); i++) {
  console.log((i+1).toString().padStart(5), ' ', lines[i].replace(/\t/g,'  ').substring(0,120));
}
