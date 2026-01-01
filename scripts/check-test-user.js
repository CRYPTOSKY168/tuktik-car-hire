const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

async function checkUser() {
    const targetEmail = 'test-1767280582380@tuktik-test.com';

    // Search in users collection
    const usersSnap = await db.collection('users')
        .where('email', '==', targetEmail)
        .get();

    if (!usersSnap.empty) {
        console.log('📧 พบใน users collection:');
        usersSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log(`  ID: ${doc.id}`);
            console.log(`  Email: ${data.email}`);
            console.log(`  Role: ${data.role || 'user'}`);
            console.log(`  Created: ${data.createdAt?.toDate?.() || 'N/A'}`);
        });
    } else {
        console.log('❌ ไม่พบใน users collection');
    }

    // Check bookings by this user
    const bookingsSnap = await db.collection('bookings')
        .where('email', '==', targetEmail)
        .get();

    if (!bookingsSnap.empty) {
        console.log('\n📦 Bookings ของ user นี้:');
        bookingsSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${doc.id}: ${data.status} (${data.pickupLocation} → ${data.dropoffLocation})`);
        });
    } else {
        console.log('\n📦 ไม่มี bookings');
    }

    // Search all test users
    const allUsersSnap = await db.collection('users').get();
    const testUsers = allUsersSnap.docs.filter(doc => {
        const email = doc.data().email || '';
        return email.includes('tuktik-test.com') || email.includes('test-17');
    });

    if (testUsers.length > 0) {
        console.log('\n🧪 Test users ทั้งหมดในระบบ:');
        testUsers.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.email}`);
        });
    }

    // Check test bookings
    const allBookingsSnap = await db.collection('bookings').get();
    const testBookings = allBookingsSnap.docs.filter(doc => {
        const email = doc.data().email || '';
        return email.includes('tuktik-test.com') || email.includes('test-17');
    });

    if (testBookings.length > 0) {
        console.log('\n🧪 Test bookings ทั้งหมด:');
        testBookings.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${doc.id}: ${data.status} (${data.email})`);
        });
    }
}

checkUser().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
