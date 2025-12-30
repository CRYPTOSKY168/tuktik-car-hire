// Check profile photos in database
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function check() {
  // Check drivers
  const drivers = await db.collection('drivers').get();
  console.log('\n=== DRIVERS ===');
  drivers.docs.forEach(d => {
    const data = d.data();
    console.log(`${data.name}:`);
    console.log(`   photo: ${data.photo || 'null'}`);
    console.log(`   userId: ${data.userId || 'null'}`);
  });

  // Check admin user
  console.log('\n=== ADMIN USER (phiopan@gmail.com) ===');
  const users = await db.collection('users').where('email', '==', 'phiopan@gmail.com').get();
  users.docs.forEach(u => {
    const data = u.data();
    console.log(`email: ${data.email}`);
    console.log(`photoURL: ${data.photoURL || 'null'}`);
    console.log(`displayName: ${data.displayName || 'null'}`);
  });

  console.log('');
}

check().then(() => process.exit(0));
