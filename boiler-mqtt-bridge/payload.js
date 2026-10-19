function booleanValue(value) {
  if (typeof value === 'string') value = value.trim().toLowerCase();
  if ([true, 1, '1', 'true'].includes(value)) return true;
  if ([false, 0, '0', 'false'].includes(value)) return false;
  throw new Error('Invalid override value');
}
function timestamp(value, now) {
  if (value == null || value === '' || value === 0) return now;
  const number = Number(value);
  const ms = Number.isFinite(number) ? (number < 1e12 ? number * 1000 : number) : Date.parse(value);
  if (!Number.isFinite(ms) || ms <= 0 || ms > now + 300000) throw new Error('Invalid timestamp');
  return ms;
}
function normalizeMessage(topic, data, now = Date.now()) {
  const match = /^boiler\/([^/]+)\/(telemetry|override)$/.exec(topic);
  if (!match || !data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid message');
  const [, id, kind] = match;
  if (data.boiler_id != null && String(data.boiler_id) !== id) throw new Error('Boiler ID does not match topic');
  const result = { boiler_id: id, timestamp: timestamp(data.timestamp, now), created_at_ms: now };
  if (data.override != null) result.override = booleanValue(data.override);
  if (kind === 'override') {
    if (result.override == null) throw new Error('Override value is required');
    result.source = typeof data.source === 'string' ? data.source : 'hardware';
  } else {
    for (const field of ['temperature_c', 'pressure_bar', 'flow_lpm', 'tds_ppm']) {
      const raw = data[field];
      if (raw == null) { result[field] = null; continue; }
      if (!['string', 'number'].includes(typeof raw) || String(raw).trim() === '' || !Number.isFinite(Number(raw))) throw new Error(`Invalid ${field}`);
      result[field] = Number(raw);
    }
    const state = String(data.device_status ?? 'online').trim().toLowerCase();
    if (!['online', 'offline'].includes(state)) throw new Error('Invalid device status');
    result.device_status = state;
  }
  return { collection: kind === 'override' ? 'override_logs' : 'telemetry', data: result };
}
module.exports = { normalizeMessage };
