const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMessage } = require('./payload');
const now = 1780000000000;
test('topic supplies boiler ID and missing time uses receive time', () => {
  const result = normalizeMessage('boiler/B1/telemetry', { temperature_c: '92.4', pressure_bar: 0 }, now);
  assert.equal(result.data.boiler_id, 'B1'); assert.equal(result.data.timestamp, now);
  assert.equal(result.data.temperature_c, 92.4); assert.equal(result.data.pressure_bar, 0);
  assert.equal(result.data.override, undefined);
});
test('seconds, milliseconds and ISO dates normalize consistently', () => {
  for (const timestamp of [now / 1000, now, new Date(now).toISOString()]) {
    assert.equal(normalizeMessage('boiler/B1/override', { override: 'false', timestamp }, now).data.timestamp, now);
  }
});
test('invalid messages cannot be stored as valid readings', () => {
  for (const data of [null, [], { boiler_id: 'B2' }, { pressure_bar: 'bad' }, { flow_lpm: true }, { temperature_c: '' }, { override: 'maybe' }, { timestamp: now + 9999999 }]) {
    assert.throws(() => normalizeMessage('boiler/B1/telemetry', data, now));
  }
  assert.throws(() => normalizeMessage('boiler/B1/override', {}, now));
  assert.throws(() => normalizeMessage('other/B1/telemetry', {}, now));
});
test('override false and numeric true are preserved', () => {
  assert.equal(normalizeMessage('boiler/B1/override', { override: 1 }, now).data.override, true);
  assert.equal(normalizeMessage('boiler/B1/override', { override: false }, now).data.override, false);
});
