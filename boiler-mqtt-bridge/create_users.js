const admin = require('./firebase');
async function main() {
  const { USER_EMAIL: email, USER_PASSWORD: password, USER_NAME: name, USER_ROLE: rawRole, USER_COMPANY: company, USER_DISTRICT: district } = process.env;
  const role = rawRole?.trim().toLowerCase();
  if (!email || !name || !['owner', 'inspector', 'admin'].includes(role) || (role === 'owner' && !company) || (role === 'inspector' && !district)) {
    throw new Error('Set USER_EMAIL, USER_NAME, USER_ROLE and the required USER_COMPANY or USER_DISTRICT. USER_PASSWORD is required for new accounts.');
  }
  let user;
  try { user = await admin.auth().getUserByEmail(email); }
  catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    if (!password || password.length < 12) throw new Error('New accounts require USER_PASSWORD with at least 12 characters.');
    user = await admin.auth().createUser({ email, password, displayName: name });
  }
  const db = admin.firestore();
  const ref = db.collection('users').doc(user.uid);
  await ref.set({ email: user.email, name, role, company: company || '', district: district || '' }, { merge: true });
  console.log('User profile saved. Existing account passwords were not changed.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => admin.app().delete());
