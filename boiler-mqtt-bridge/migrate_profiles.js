// Dry run by default. --apply copies profiles to Auth UID documents; legacy
// documents remain untouched. Resolve duplicates instead of guessing access.
const admin = require('./firebase');
async function main() {
  const db = admin.firestore();
  const snapshot = await db.collection('users').get();
  const groups = new Map();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (typeof data.email !== 'string' || !data.email.trim()) throw new Error(`Profile ${doc.id} has no email`);
    const email = data.email.trim().toLowerCase();
    groups.set(email, [...(groups.get(email) || []), { id: doc.id, data }]);
  }
  const changes = [];
  let skipped = 0;
  for (const [email, entries] of groups) {
    let user;
    try { user = await admin.auth().getUserByEmail(email); }
    catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      skipped++; continue;
    }
    const canonical = entries.find(entry => entry.id === user.uid);
    const assignment = entry => JSON.stringify([String(entry.data.role || '').trim().toLowerCase(), entry.data.company || '', entry.data.district || '']);
    if (!canonical && new Set(entries.map(assignment)).size !== 1) throw new Error('Conflicting legacy assignments require manual reconciliation');
    const data = { ...(canonical || entries[0]).data, email: user.email };
    data.role = String(data.role || '').trim().toLowerCase();
    if (!['admin', 'owner', 'inspector'].includes(data.role) || (data.role === 'owner' && !data.company) || (data.role === 'inspector' && !data.district)) throw new Error('A profile has an invalid role or missing assignment');
    changes.push({ ref: db.collection('users').doc(user.uid), data });
  }
  if (changes.length > 500) throw new Error('More than 500 profiles: use a reviewed batched migration');
  console.log(`${changes.length} authenticated profiles ready; ${skipped} profiles have no Auth account.`);
  if (!process.argv.includes('--apply')) { console.log('Dry run only. Use --apply to write UID profiles.'); return; }
  const batch = db.batch();
  changes.forEach(({ ref, data }) => batch.set(ref, data));
  await batch.commit();
  console.log('UID profiles saved. Legacy documents and account passwords were preserved.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => admin.app().delete());
