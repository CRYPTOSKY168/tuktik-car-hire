// Script to delete all notifications from Firestore
// Run with: node scripts/cleanup-notifications.js

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

async function deleteCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) {
    console.log(`   ✅ ${collectionName}: ว่างอยู่แล้ว`);
    return 0;
  }

  const batchSize = 500;
  let deletedCount = 0;
  let batch = db.batch();
  let operationCount = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    operationCount++;
    deletedCount++;

    if (operationCount >= batchSize) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  console.log(`   ✅ ${collectionName}: ลบ ${deletedCount} รายการ`);
  return deletedCount;
}

async function deleteAllNotifications() {
  console.log('\n🗑️  Deleting all notifications from Firestore...\n');

  try {
    let totalDeleted = 0;

    // Delete user notifications
    totalDeleted += await deleteCollection('notifications');

    // Delete admin notifications
    totalDeleted += await deleteCollection('admin_notifications');

    console.log(`\n✅ ลบ notifications ทั้งหมด ${totalDeleted} รายการเรียบร้อย!`);
    console.log('\n🎉 Notifications cleared!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  process.exit(0);
}

// Run directly without confirmation for speed
deleteAllNotifications();
