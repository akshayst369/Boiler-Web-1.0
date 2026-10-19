export function timeMillis(value) {
  if (value == null || value === '') return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'object' && 'seconds' in value) return value.seconds * 1000;
  const number = Number(value);
  if (Number.isFinite(number)) return number > 0 && number < 1e12 ? number * 1000 : number;
  return Date.parse(value) || 0;
}
export const eventTime = (data) => timeMillis(data?.timestamp) || timeMillis(data?.created_at) || timeMillis(data?.created_at_ms);
export function formatTime(data) {
  const time = eventTime(data);
  return time ? new Date(time).toLocaleString() : 'Unknown';
}
export function booleanValue(value) {
  if ([true, 1, '1', 'true'].includes(typeof value === 'string' ? value.toLowerCase().trim() : value)) return true;
  if ([false, 0, '0', 'false'].includes(typeof value === 'string' ? value.toLowerCase().trim() : value)) return false;
  return null;
}
export function overrideValue(telemetry, event) {
  if (event && (telemetry?.override == null || eventTime(event) >= eventTime(telemetry))) return booleanValue(event.override);
  return booleanValue(telemetry?.override);
}
export function status(telemetry, event, now = Date.now()) {
  if (!telemetry) return { text: 'No Data', color: '#94a3b8' };
  if (String(telemetry.device_status).toLowerCase() !== 'online') return { text: 'Offline', color: '#ef4444' };
  const received = timeMillis(telemetry.created_at_ms) || timeMillis(telemetry.created_at) || eventTime(telemetry);
  if (!received || now - received > 120000) return { text: 'Stale Data', color: '#f59e0b' };
  return overrideValue(telemetry, event) === true
    ? { text: 'Override Active', color: '#f59e0b' }
    : { text: 'Online', color: '#10b981' };
}
export function scopeFor(profile) {
  const role = profile?.role?.trim().toLowerCase();
  if (role === 'admin') return null;
  const field = role === 'owner' ? 'company' : role === 'inspector' ? 'district' : null;
  if (!field || !profile[field]?.trim()) throw new Error('Your account needs a valid role and company or district assignment. Contact your administrator.');
  return [field, profile[field]];
}
