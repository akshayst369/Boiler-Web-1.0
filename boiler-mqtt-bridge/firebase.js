const path = require('node:path');
const fs = require('node:fs');
const admin = require('firebase-admin');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!admin.apps.length) admin.initializeApp({
  credential: credentialPath
    ? admin.credential.cert(JSON.parse(fs.readFileSync(path.resolve(__dirname, credentialPath), 'utf8')))
    : admin.credential.applicationDefault(),
});
module.exports = admin;
