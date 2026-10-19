const mqtt = require('mqtt');
const admin = require('./firebase');
const { normalizeMessage } = require('./payload');
const db = admin.firestore();
const { MQTT_HOST, MQTT_USER, MQTT_PASS } = process.env;
if (!MQTT_HOST || !MQTT_USER || !MQTT_PASS) throw new Error('Set MQTT_HOST, MQTT_USER and MQTT_PASS in boiler-mqtt-bridge/.env');
if (!MQTT_HOST.startsWith('mqtts://')) throw new Error('MQTT_HOST must use mqtts://');
const client = mqtt.connect(MQTT_HOST, {
  username: MQTT_USER, password: MQTT_PASS, rejectUnauthorized: true,
  reconnectPeriod: 5000,
});
client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe(['boiler/+/telemetry', 'boiler/+/override'], { qos: 1 }, error => {
    if (error) console.error('Subscription failed:', error.message);
  });
});
client.on('error', error => console.error('MQTT error:', error.message));
client.on('offline', () => console.warn('MQTT disconnected; reconnecting…'));
// Persist before acknowledging QoS 1 packets, with bounded retry. The broker
// can redeliver if the process exits before the acknowledgement.
client.handleMessage = async (packet, done) => {
  let message;
  try { message = normalizeMessage(packet.topic, JSON.parse(packet.payload.toString())); }
  catch (error) { console.error('Rejected MQTT message:', error.message); done(); return; }
  const ref = db.collection(message.collection).doc();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const boilerSnapshot = await db.collection('boilers').where('boiler_id', '==', message.data.boiler_id).limit(1).get();
      if (boilerSnapshot.empty) throw new Error('Boiler is not registered');
      const boiler = boilerSnapshot.docs[0].data();
      await ref.set({ ...message.data, company: boiler.company || '', district: boiler.district || '',
        state: boiler.state || '', address: boiler.address || '', created_at: admin.firestore.FieldValue.serverTimestamp() });
      done(); return;
    } catch (error) {
      console.error(`Firestore write attempt ${attempt + 1} failed:`, error.message);
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  done(new Error('Unable to persist message after retries'));
};
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  client.end(false, {}, () => { db.terminate().finally(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
