const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

async function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  // Use service account from environment variable (base64 encoded)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
    );
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  // Use individual environment variables
  if (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  throw new Error('Firebase credentials not found in environment variables');
}

async function checkDatabase() {
  console.log('Initializing Firebase...');
  await initializeFirebase();
  const db = admin.firestore();

  console.log('=== DATABASE STATUS ===\n');

  // Collections to check
  const collections = ['users', 'drivers', 'bookings', 'vehicles', 'locations', 'routes', 'vouchers', 'notifications', 'admin_notifications', 'settings'];

  for (const col of collections) {
    const snapshot = await db.collection(col).get();
    console.log(`📁 ${col}: ${snapshot.size} documents`);

    // Show sample data for key collections
    if (snapshot.size > 0 && ['users', 'drivers', 'bookings', 'vehicles', 'locations'].includes(col)) {
      snapshot.docs.slice(0, 5).forEach(doc => {
        const data = doc.data();
        if (col === 'users') {
          console.log(`   - ${doc.id.slice(0,12)}...: ${data.email || data.displayName} (role: ${data.role}, driver: ${data.isApprovedDriver || false})`);
        } else if (col === 'drivers') {
          console.log(`   - ${doc.id.slice(0,12)}...: ${data.name} (status: ${data.status}, setup: ${data.setupStatus})`);
        } else if (col === 'bookings') {
          console.log(`   - ${doc.id.slice(0,8)}...: ${data.firstName} ${data.lastName} | ${data.status} | ฿${data.totalCost}`);
        } else if (col === 'vehicles') {
          console.log(`   - ${data.name} (${data.type}) - ฿${data.price} | active: ${data.isActive}`);
        } else if (col === 'locations') {
          const name = data.name?.th || data.name?.en || data.name;
          console.log(`   - ${name} (${data.type}) | active: ${data.isActive}`);
        }
      });
      if (snapshot.size > 5) console.log(`   ... และอีก ${snapshot.size - 5} รายการ`);
    }
  }

  console.log('\n=== END ===');
}

checkDatabase().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
