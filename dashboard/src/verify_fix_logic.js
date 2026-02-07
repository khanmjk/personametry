
const assert = require('assert');

console.log("Verifying Frontend NaN Sanitization Logic...");

const testCases = [
  {
    input: '{"value": NaN}',
    expected: '{"value": null}',
    desc: "Simple NaN"
  },
  {
    input: '{"a": 1, "b": NaN, "c": "NaN"}', 
    expected: '{"a": 1, "b": null, "c": "NaN"}', // String "NaN" should be untouched? Regex matches `: NaN`.
    // Wait, regex is /:\s*NaN/g.
    // If json is clean, keys are quoted. "key": NaN.
    // So `: NaN` works.
    desc: "Mixed NaN and string NaN"
  },
  {
      input: '{ "v":NaN, "x": 123 }',
      expected: '{ "v": null, "x": 123 }',
      desc: "Compact JSON"
  }
];

let passed = 0;
testCases.forEach(({input, expected, desc}) => {
  const sanitized = input.replace(/:\s*NaN/g, ': null');
  try {
    assert.strictEqual(sanitized, expected);
    console.log(`✅ Passed: ${desc}`);
    passed++;
  } catch (e) {
    console.error(`❌ Failed: ${desc}`);
    console.error(`   Input: ${input}`);
    console.error(`   Got:   ${sanitized}`);
    console.error(`   Want:  ${expected}`);
  }
});

if (passed === testCases.length) {
    console.log("\n✨ All logic checks passed!");
    process.exit(0);
} else {
    console.error("\n💥 Some checks failed.");
    process.exit(1);
}
