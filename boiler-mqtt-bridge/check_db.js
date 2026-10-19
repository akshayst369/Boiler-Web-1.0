const admin = require("./firebase");
const db = admin.firestore();

async function checkCollections() {
  try {
    const collections = ["users", "boilers", "telemetry", "override_logs"];
    for (const colName of collections) {
      const snapshot = await db.collection(colName).limit(5).get();
      console.log(`\nCollection: ${colName} (Count of first limit 5: ${snapshot.size})`);
      snapshot.forEach(doc => {
        console.log(`Document ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    }
  } catch (err) {
    console.error("Error reading database:", err.message);
    process.exitCode = 1;
  } finally {
    await admin.app().delete();
  }
}

checkCollections();
