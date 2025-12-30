// Check driver's linked user photo
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
  // Get driver Imacros
  const drivers = await db.collection('drivers').get();

  for (const d of drivers.docs) {
    const driver = d.data();
    console.log(`\n=== Driver: ${driver.name} ===`);
    console.log(`   driver.photo: ${driver.photo || 'null'}`);
    console.log(`   driver.userId: ${driver.userId || 'null'}`);

    // If driver has userId, check user's photo
    if (driver.userId) {
      const userDoc = await db.collection('users').doc(driver.userId).get();
      if (userDoc.exists) {
        const user = userDoc.data();
        console.log(`   user.email: ${user.email}`);
        console.log(`   user.photoURL: ${user.photoURL || 'null'}`);
      } else {
        console.log(`   user not found!`);
      }
    }
  }
}

check().then(() => process.exit(0));
