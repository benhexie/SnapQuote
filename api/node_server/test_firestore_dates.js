const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // assuming it exists or we can init

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('invoices').limit(10).get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().date, typeof doc.data().date);
  });
}
run().catch(console.error);
