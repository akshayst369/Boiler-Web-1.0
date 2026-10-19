import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeMillis, status, overrideValue, scopeFor, formatTime } from './data.js';
const now = 1780000000000;
test('timestamps handle Firestore, seconds, milliseconds and ISO', () => {
  for (const value of [now, now / 1000, { seconds: now / 1000 }, { toMillis: () => now }, new Date(now).toISOString()]) assert.equal(timeMillis(value), now);
  assert.equal(timeMillis(null), 0); assert.equal(formatTime(null), 'Unknown');
});
test('newer telemetry clears an older override and unknown stays unknown', () => {
  assert.equal(overrideValue({ timestamp: now, override: false }, { timestamp: now - 10000, override: true }), false);
  assert.equal(overrideValue({ timestamp: now, override: false }, { timestamp: now + 1000, override: true }), true);
  assert.equal(overrideValue(null, null), null);
});
test('stale online readings are not shown as live', () => {
  assert.equal(status({ device_status: 'online', created_at_ms: now - 121000 }, null, now).text, 'Stale Data');
  assert.equal(status({ device_status: 'online', created_at_ms: now }, null, now).text, 'Online');
  assert.equal(status(null, null, now).text, 'No Data');
});
test('unknown roles and missing assignments do not get unrestricted access', () => {
  assert.throws(() => scopeFor({ role: 'owner' })); assert.throws(() => scopeFor({ role: 'guest' }));
  assert.deepEqual(scopeFor({ role: 'Inspector', district: 'Pune' }), ['district', 'Pune']);
  assert.equal(scopeFor({ role: 'admin' }), null);
});
