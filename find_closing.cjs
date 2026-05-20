const fs = require('fs');
const path = require('path');
const { parse: acornParse } = require('acorn');
const acorn = require('acorn');

function findUnclosedBlock(filename) {
  const src = fs.readFileSync(filename, 'utf8');
  const lines = src.split('\n');
  let d = 0;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    d += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;

    // Only report lines AFTER Slideshow opens, where depth != expected
    if (i >= 1900 && d !== 0) {
      console.log((i+1), '|', l.trim().substring(0, 80));
    }
  }
  console.log('\nFinal depth:', d, '(0 = OK, 1 = unclosed block)');
}

try { findUnclosedBlock('src/pages/Slideshow.jsx'); }
catch(e) { console.error('acorn:', e.message); console.log('fallback to simple count:', require('./check_braces.cjs')); }
