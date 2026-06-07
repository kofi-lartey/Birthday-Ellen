const fs = require('fs');

const emojiFixes = [
  // From line 45-80 (getEventText emojis)
  /emoji: 'ðŸŽ‚'/g, 'emoji: "🎂"',
  /emoji: 'ðŸ''/g, 'emoji: "💍"',
  /emoji: 'ðŸ’•'/g, 'emoji: "💕"',
  /emoji: 'ðŸŽ‰'/g, 'emoji: "🎉"',
  /emoji: 'ðŸ'‹'/g, 'emoji: "👋"',
  /emoji: 'â¤ï¸'/g, 'emoji: "❤️"',
  
  // From line 97 (subtitle)
  /"With love from your friends & family â¤ï¸"/g, '"With love from your friends & family ❤️"',
  
  // From other locations
  /🎥/g, '🎥',
  /💝/g, '💝',
  /🔄/g, '🔄',
  /📦/g, '📦',
  /📸/g, '📸',
];

// Simple string replacements for common mojibake
const mojibakeFixes = [
  ["'ðŸŽ‚'", "'🎂'"],
  ["'ðŸŽˆ'", "'🎈'"],
  ["'ðŸŽ'", "'🎁'"],
  ["'ðŸŽ‰'", "'🎉'"],
  ["'âœ¨'", "'✨'"],
  ["'ðŸ’–'", "'💖'"],
  ["'ðŸŽŠ'", "'🎊'"],
  ["'â¤ï¸'", "'❤️'"],
  ["'ðŸ’•'", "'💕'"],
  ["'ðŸ’—'", "'💗'"],
  ["'ðŸ’'", "'💍'"],
  ["'ðŸ’’'", "'💒'"],
  ["'ðŸŒ¸'", "'🌸'"],
  ["'ðŸ¥‚'", "'🥂'"],
  ["'ðŸŒ¹'", "'🌹'"],
  ["'ðŸ’'", "'💝'"],
  ["'ðŸ’˜'", "'💘'"],
  ["'ðŸ’'", "'💐'"],
  ["'ðŸª…'", "'🪅'"],
  ["'ðŸ’ƒ'", "'💃'"],
  ["'ðŸ•º'", "'🕺'"],
  ["'ðŸŽ¶'", "'🎶'"],
  ["'ðŸ¥³'", "'🥳'"],
  ["'ðŸŽ¸'", "'🎸'"],
  ["'ðŸ'¬'", "'💬'"],
  ["'ðŸ•'", "'🍕'"],
  ["'ðŸŽµ'", "'🎵'"],
  ["'ðŸ\"'", "'🍔'"],
  ["'ðŸŽ§'", "'🎧'"],
  ["'ðŸ’«'", "'💫'"],
  ["'â­'", "'⭐'"],
  ["'ðŸŒŸ'", "'🌟'"],
  ["'ðŸŽ€'", "'🎀'"],
  ["'ðŸŽ¥'", "'🎥'"],
  ["'ðŸ''", "'💝'"],
  ["'ðŸ\"„'", "'🔄'"],
  ["'ðŸ\"¦'", "'📦'"],
  ["'ðŸ\"¸'", "'📸'"],
];

let content = fs.readFileSync('src/pages/Slideshow.jsx', 'utf8');

for (const [bad, good] of mojibakeFixes) {
  content = content.split(bad).join(good);
}

fs.writeFileSync('src/pages/Slideshow.jsx', content, 'utf8');
console.log('Fixed emojis in Slideshow.jsx');