#!/usr/bin/env node
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

async function check() {
    // ดู active bookings
    console.log('\n=== Active Bookings Detail ===\n');

    const activeStatuses = ['pending', 'confirmed', 'driver_assigned', 'driver_en_route', 'in_progress'];
    const bookingsSnap = await db.collection('bookings')
        .where('status', 'in', activeStatuses)
        .get();

    for (const doc of bookingsSnap.docs) {
        const b = doc.data();
        console.log('📦 Booking:', doc.id);
        console.log('   userId:', b.userId);
        console.log('   email:', b.email);
        console.log('   status:', b.status);
        console.log('   pickup:', b.pickupLocation);
        console.log('   dropoff:', b.dropoffLocation);
        console.log('   driver:', b.driver?.name || 'N/A');
        console.log('');
    }

    // หา users ทั้งหมด
    console.log('\n=== All Users ===\n');
    const usersSnap = await db.collection('users').get();
    usersSnap.docs.forEach(d => {
        const u = d.data();
        console.log(`${d.id.substring(0,12)}... | ${u.email} | role: ${u.role || 'user'} | isDriver: ${u.isApprovedDriver || false}`);
    });

    // เช็คว่า booking userId match กับ users หรือเปล่า
    console.log('\n=== Check userId Match ===\n');

    for (const doc of bookingsSnap.docs) {
        const b = doc.data();
        const userDoc = await db.collection('users').doc(b.userId).get();
        if (userDoc.exists) {
            console.log(`✅ Booking ${doc.id.substring(0,8)}... userId matches user: ${userDoc.data().email}`);
        } else {
            console.log(`❌ Booking ${doc.id.substring(0,8)}... userId NOT FOUND in users collection!`);
            console.log(`   userId: ${b.userId}`);
            console.log(`   email in booking: ${b.email}`);
        }
    }
}

check().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
