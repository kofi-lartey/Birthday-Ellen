import fs from "fs";

const path = "src/pages/Slideshow.jsx";
let data = fs.readFileSync(path, "utf8");

// All corrupt emoji/mojibake replacements: [find, replace]
const replacements = [
  // getEventText emojis (lines 45-80)
  ["birthday cake", "\uD83C\uDF82"],
  ["wedding ring", "\uD83D\uDC9D"],
  ["hearts", "\uD83D\uDC95"],
  ["party popper", "\uD83C\uDF89"],
  ["waving hand", "\uD83D\uDC4B"],
  ["sparkles", "\u2728"],
  // hearts arrays (lines 273-278)
  ["balloon", "\uD83C\uDF88"],
  ["wrapped gift", "\uD83C\uDF81"],
  ["heart sparkle", "\uD83D\uDC96"],
  ["red heart", "\u2764\uFE0F"],
  ["growing heart", "\uD83D\uDC97"],
  ["smiling face with hearts", "\uD83D\uDC9D"],
  ["wedding", "\uD83D\uDC92"],
  ["rose", "\uD83C\uDF39"],
  ["champagne", "\uD83D\uDD82"],
  ["heart with ribbon", "\uD83D\uDC9C"],
  ["heart decoration", "\uD83D\uDC9F"],
  ["revolving hearts", "\uD83D\uDC8E"],
  ["confetti ball", "\uD83C\uDF8A"],
  ["party", "\uD83E\uDD73"],
  ["partying face", "\uD83E\uDD73"],
  ["man dancing", "\uD83D\uDD7A"],
  ["musical notes", "\uD83C\uDFB5"],
  ["microphone", "\uD83D\uDC87"],
  ["video camera", "\uD83D\uDCFD"],
  ["cloud", "\u2601\uFE0F"],
  ["comet", "\uD83D\uDCAB"],
  ["star", "\u2B50"],
  ["dizzy", "\uD83C\uDF1F"],
  ["kiss mark", "\uD83D\uDC8B"],
  ["person dancing", "\uD83D\uDC83"],
  ["sunglasses", "\uD83E\uDD13"],
  ["pizza", "\uD83C\uDF55"],
  ["hamburger", "\uD83C\uDF54"],
  ["headphone", "\uD83C\uDFA7"],
  ["camera", "\uD83D\uDCF8"],
  ["package", "\uD83D\uDCE6"],
  ["film", "\uD83C\uDFAC"],
  ["clockwise", "\uD83D\uDD04"],
  // template string emojis (line 1698)
  ["memo", "\uD83D\uDCDD"],
  // comments and render (lines 419, 425, 438, 768)
  ["sparkles FIX", "\u2728 FIX"],
  ["em dash", "\u2014"],
  // input patterns (lines 1852, 1866, 1961, 1999)
  ["sparkles Open", "\u2728 Open"],
  ["camera", "\uD83D\uDCF7"],
  // download modal emoji
  ["package", "\uD83D\uDCE6"],
];

console.log("Starting replacements...");
let changes = 0;

for (const [search, replace] of replacements) {
  const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  const matches = data.match(regex);
  if (matches && matches.length > 0) {
    data = data.replaceAll(regex, replace);
    changes += matches.length;
    console.log(`  Replaced ${matches.length}x "${search}" -> "${replace}"`);
  }
}

fs.writeFileSync(path, data, "utf8");
console.log(`\nDone. Total replacements: ${changes}`);
