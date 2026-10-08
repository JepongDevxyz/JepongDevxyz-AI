import assert from 'node:assert/strict';
import '../lib/personalization-core.js';

const core = globalThis.JDPersonalizationCore;
assert.ok(core, 'personalization core is available to browser and server consumers');

const defaults = {
  baseStyle: 'Default',
  warm: 'Default',
  enthusiastic: 'Default',
  headersLists: 'Default',
  emoji: 'Default',
  fastAnswers: true,
  intelligence: 'Instant',
  suggestedPrompts: true,
  customInstructions: ''
};

for (const baseStyle of ['Default', 'Professional', 'Friendly', 'Candid', 'Quirky', 'Efficient', 'Cynical']) {
  assert.equal(core.normalize({ baseStyle }, defaults).baseStyle, baseStyle);
}
for (const field of ['warm', 'enthusiastic', 'headersLists', 'emoji']) {
  for (const value of ['More', 'Default', 'Less']) {
    assert.equal(core.normalize({ [field]: value }, defaults)[field], value, `${field} accepts ${value}`);
  }
  assert.equal(core.normalize({ [field]: 'Surprise' }, defaults)[field], 'Default');
}
assert.equal(core.normalize({ baseStyle: 'Unknown' }, defaults).baseStyle, 'Default');
assert.deepEqual(core.normalize({ unrelatedPreference: { kept: true } }, defaults).unrelatedPreference, { kept: true });
assert.equal(core.normalize({ customInstructions: 'Use plain Tagalog.' }, defaults).customInstructions, 'Use plain Tagalog.');
assert.equal(core.responseEffort({ fastAnswers: true, intelligence: 'Max' }), 'Instant');
assert.equal(core.responseEffort({ fastAnswers: false, intelligence: 'High' }), 'High');
assert.equal(core.responseEffort({ fastAnswers: false, intelligence: 'unknown' }), 'Instant');

const instructions = core.instructions({
  baseStyle: 'Friendly',
  warm: 'More',
  enthusiastic: 'Less',
  headersLists: 'More',
  emoji: 'Less',
  customInstructions: 'Explain simply.'
});
for (const fragment of ['friendly', 'warmer', 'low-key', 'headings', 'Avoid emoji', 'Explain simply.']) {
  assert.ok(instructions.toLowerCase().includes(fragment.toLowerCase()), `instructions include ${fragment}`);
}
console.log('PASS: canonical personalization normalization, instruction composition, and response effort');
