// Test script for dateUtils
const { formatDateForDB, safeFormatDate, safeFormatTime, isValidDateString } = require('./src/utils/dateUtils.js');

// Mock Node.js environment for testing
if (typeof window === 'undefined') {
  global.window = {};
}

console.log('Testing date utility functions:\n');

// Test 1: formatDateForDB
console.log('Test 1 - formatDateForDB:');
console.log('  YYYY-MM-DD input:', formatDateForDB('2026-05-07'));
console.log('  Date object input:', formatDateForDB(new Date('2026-05-07')));
console.log('  Invalid date:', formatDateForDB('invalid'));
console.log('  Null input:', formatDateForDB(null));

// Test 2: safeFormatDate
console.log('\nTest 2 - safeFormatDate:');
console.log('  Valid date string:', safeFormatDate('2026-05-07'));
console.log('  Date object:', safeFormatDate(new Date('2026-05-07')));
console.log('  Invalid date:', safeFormatDate('invalid'));
console.log('  Null input:', safeFormatDate(null));

// Test 3: safeFormatTime
console.log('\nTest 3 - safeFormatTime:');
console.log('  Valid date:', safeFormatTime('2026-05-07T14:30:00'));
console.log('  Invalid date:', safeFormatTime('invalid'));

// Test 4: isValidDateString
console.log('\nTest 4 - isValidDateString:');
console.log('  Valid YYYY-MM-DD:', isValidDateString('2026-05-07'));
console.log('  Valid ISO:', isValidDateString('2026-05-07T14:30:00Z'));
console.log('  Invalid:', isValidDateString('not a date'));
console.log('  Empty:', isValidDateString(''));

console.log('\nAll tests completed!');
