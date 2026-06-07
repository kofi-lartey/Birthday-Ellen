import fs from 'fs'

const mojibakeFixes = [
  ["'â¢ FIX'", "'⭐ FIX'"],
  ["'INTRO RENDER â€” CLEAN'", "'INTRO RENDER — CLEAN'"],
  ["'ðŸŽ¥ Watch the slideshow:'", "'🎥 Watch the slideshow:'"],
  ["'ðŸ' Enjoy the memories!'", "'💝 Enjoy the memories!'"],
  ["'{isConverting ? 'ðŸ\"„' : 'ðŸŽ¬'}'", "'{isConverting ? '🔄' : '🎬'}'"],
  ["'<div className=\"text-6xl mb-4\">ðŸ\"¦</div>'", "'<div className=\"text-6xl mb-4\">📦</div>'"],
  ["'Add Your Photos ðŸ\"¸'", "'Add Your Photos 📸'"],
  ["'<h1 className=\"text-3xl font-bold text-white tracking-tight\">Save This Memory ðŸ\"¸</h1>'", "'<h1 className=\"text-3xl font-bold text-white tracking-tight\">Save This Memory 📸</h1>'"],
]

let content = fs.readFileSync('src/pages/Slideshow.jsx', 'utf8')

for (const [bad, good] of mojibakeFixes) {
  content = content.split(bad).join(good)
}

fs.writeFileSync('src/pages/Slideshow.jsx', content, 'utf8')
console.log('Fixed remaining emojis')