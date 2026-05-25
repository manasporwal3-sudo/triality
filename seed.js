const admin = require('firebase-admin');
const fs = require('fs');

// 1. Initialize Firebase Admin (You need your service account key)
// IMPORTANT: Replace 'your_service_account_key.json' with the actual path to your service account key file.
// Do NOT commit your service account key to version control.
const serviceAccount = require('./your_service_account_key.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const menuData = JSON.parse(fs.readFileSync('./menu.json', 'utf8'));

async function uploadData() {
  console.log("Starting upload...");
  for (const item of menuData) {
    // Replace 'dishes' with whatever your collection is named in Firebase
    await db.collection('dishes').add(item);
    console.log(`Added: ${item.name}`);
  }
  console.log("All done! Refresh your site.");
}

uploadData();
