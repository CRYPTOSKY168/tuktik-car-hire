// Check current bookings
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function check() {
  const snap = await db.collection('bookings').get();
  console.log('\n📊 Current bookings:', snap.size);

  if (snap.size > 0) {
    snap.docs.forEach(doc => {
      const d = doc.data();
      console.log(`   - ${doc.id.slice(0,8)} | status: ${d.status} | driver: ${d.driver?.name || 'none'}`);
    });
  }

  console.log('');
}

check().then(() => process.exit(0));
