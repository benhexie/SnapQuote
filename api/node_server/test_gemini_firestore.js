const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();

async function checkInvoices() {
  const snapshot = await db.collection("invoices").where("user_id", "==", "mock_contractor_999").get();
  snapshot.forEach(doc => {
    // Only log the one we just created or the latest one
    if (doc.id === "1343db20-a1d4-411b-9093-d6b53bdbcfe1" || doc.data().line_items[0].description !== "Mock Line Item") {
        console.log(doc.id, "=>", JSON.stringify(doc.data(), null, 2));
    }
  });
}

checkInvoices().catch(console.error);