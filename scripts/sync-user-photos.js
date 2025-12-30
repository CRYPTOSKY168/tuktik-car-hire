// Sync photoURL from Firebase Auth to Firestore
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
const auth = admin.auth();

async function syncPhotos() {
  console.log('Syncing user photos from Firebase Auth to Firestore...\n');

  // Get all users from Auth
  const listUsersResult = await auth.listUsers();

  for (const authUser of listUsersResult.users) {
    console.log(`\n=== User: ${authUser.email || authUser.uid} ===`);
    console.log(`   Auth photoURL: ${authUser.photoURL || 'null'}`);

    // Get Firestore user
    const userDoc = await db.collection('users').doc(authUser.uid).get();

    if (userDoc.exists) {
      const firestoreData = userDoc.data();
      console.log(`   Firestore photoURL: ${firestoreData.photoURL || 'null'}`);

      // If Auth has photo but Firestore doesn't, update Firestore
      if (authUser.photoURL && !firestoreData.photoURL) {
        console.log(`   >> Updating Firestore with Auth photoURL...`);
        await db.collection('users').doc(authUser.uid).update({
          photoURL: authUser.photoURL,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   >> Done!`);
      } else if (authUser.photoURL && firestoreData.photoURL !== authUser.photoURL) {
        console.log(`   >> Updating Firestore with new Auth photoURL...`);
        await db.collection('users').doc(authUser.uid).update({
          photoURL: authUser.photoURL,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   >> Done!`);
      } else if (!authUser.photoURL) {
        console.log(`   >> No photo in Firebase Auth`);
      } else {
        console.log(`   >> Already in sync`);
      }
    } else {
      console.log(`   No Firestore document for this user`);
    }
  }

  console.log('\n\nSync complete!');
}

syncPhotos().then(() => process.exit(0));
