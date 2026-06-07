import fs from "fs";

const path = "src/pages/Slideshow.jsx";
let data = fs.readFileSync(path, "utf8");
let changes = 0;

function replaceWithCheck(text, oldStr, newStr, expected) {
  const parts = text.split(oldStr);
  const count = parts.length - 1;
  if (count === 0) {
    console.log("  SKIP (not found):", JSON.stringify(oldStr));
    return [text, 0];
  }
  const result = parts.join(newStr);
  console.log("  Replaced", count, "of", JSON.stringify(oldStr), "->", JSON.stringify(newStr));
  return [result, count];
}

let pairs = [
  ["INTRO RENDER \u2014 CLEAN LIQUID GLASS STYLE (NO EXPLOSION)", "\u2014", 1],
];

for (const [searchStr, newStr, expected] of pairs) {
  const [newData, count] = replaceWithCheck(data, searchStr, newStr, expected);
  data = newData;
  changes += count;
}

fs.writeFileSync(path, data, "utf8");
console.log("\nDone. Total replacements:", changes);
