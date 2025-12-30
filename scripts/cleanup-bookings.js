// Script to delete all bookings from Firestore
// Run with: node scripts/cleanup-bookings.js

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Initialize Firebase Admin (same pattern as lib/firebase/admin.ts)
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase Admin credentials in .env.local');
    console.log('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    }),
    projectId: projectId,
  });
}

const db = admin.firestore();

async function deleteAllBookings() {
  console.log('\n🗑️  Deleting all bookings from Firestore...\n');

  try {
    const bookingsSnapshot = await db.collection('bookings').get();

    if (bookingsSnapshot.empty) {
      console.log('✅ No bookings to delete. Collection is already empty.');
      return;
    }

    console.log(`📊 Found ${bookingsSnapshot.size} bookings to delete.\n`);

    // Delete in batches (Firestore limit: 500 per batch)
    const batchSize = 500;
    let deletedCount = 0;
    let batch = db.batch();
    let operationCount = 0;

    for (const doc of bookingsSnapshot.docs) {
      batch.delete(doc.ref);
      operationCount++;
      deletedCount++;

      if (operationCount >= batchSize) {
        await batch.commit();
        console.log(`   Deleted batch of ${operationCount} bookings...`);
        batch = db.batch();
        operationCount = 0;
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit();
      console.log(`   Deleted final batch of ${operationCount} bookings...`);
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} bookings!`);
    console.log('\n🎉 Database is now clean and ready for production!\n');

  } catch (error) {
    console.error('\n❌ Error deleting bookings:', error.message);
  }

  process.exit(0);
}

// Confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n⚠️  WARNING: This will DELETE ALL BOOKINGS from the database!');
console.log('   This action cannot be undone.\n');

rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    rl.close();
    deleteAllBookings();
  } else {
    console.log('\n❌ Operation cancelled.\n');
    process.exit(0);
  }
});
