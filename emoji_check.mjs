import fs from 'fs';

const path = 'src/pages/Slideshow.jsx';
const data = fs.readFileSync(path, 'utf8');

// Find lines with corrupted chars
const lines = data.split(/\r?\n/);
const badLines = [];
lines.forEach((line, i) => {
  if (line.includes('ð') || line.includes('â') || line.includes('ï')) {
    badLines.push(i + 1);
  }
});

console.log('Lines with mojibake:', badLines);
