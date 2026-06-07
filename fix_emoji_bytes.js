const fs = require('fs');
const path = 'src/pages/Slideshow.jsx';

let data = fs.readFileSync(path);

// Define replacements as byte patterns -> replacement bytes
const replacements = [
  // birthday: ['🎂', '🎈', '🎁', '🎉', '✨', '💖', '🎊', '❤️', '💕', '💗'],
  // The mojibake for these are specific byte sequences
  // We'll use string replacement on the raw buffer via intermediate text
  
  // Common patterns - replace mojibake with proper emojis
  // Cake: ðŸŽ‚ -> 🎂
  ['🎂', '🎂'],
];

// Let's try a direct approach: replace corrupted sequences in the file
// using the actual strings as they appear in the file

let content = data.toString('latin1');
let changes = 0;

// For each replacement pair, if the corrupt string exists in the latin1-decoded content,
// replace it with the proper emoji
for (const [corrupt, proper] of replacements) {
  if (corrupt === proper) continue;
  const idx = content.indexOf(corrupt);
  if (idx !== -1) {
    const before = content.substring(0, idx);
    const after = content.substring(idx + corrupt.length);
    content = before + proper + after;
    changes++;
    console.log('Replaced:', JSON.stringify(corrupt), '->', JSON.stringify(proper));
  }
}

console.log('Changes made:', changes);
fs.writeFileSync(path, Buffer.from(content, 'latin1'));
console.log('Done');
