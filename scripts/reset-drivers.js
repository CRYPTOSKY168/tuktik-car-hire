// Script to reset all driver statuses
// Run with: node scripts/reset-drivers.js

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

async function resetDrivers() {
  console.log('\n🔄 Resetting all driver statuses...\n');

  const driversSnapshot = await db.collection('drivers').get();

  if (driversSnapshot.empty) {
    console.log('No drivers found.');
    return;
  }

  console.log(`Found ${driversSnapshot.size} drivers\n`);

  const batch = db.batch();
  driversSnapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`   - ${data.name}: ${data.status} → available`);
    batch.update(doc.ref, {
      status: 'available',
      totalTrips: 0,
      totalEarnings: 0,
      rating: 5.0,
      ratingCount: 0
    });
  });

  await batch.commit();

  console.log('\n✅ Reset all drivers to:');
  console.log('   - status: available');
  console.log('   - totalTrips: 0');
  console.log('   - totalEarnings: 0');
  console.log('   - rating: 5.0');
  console.log('\n🎉 Drivers ready for production!\n');
}

resetDrivers().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
