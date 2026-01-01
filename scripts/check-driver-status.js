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
    console.log('\n=== 🔍 ตรวจสอบสถานะระบบ ===\n');

    // 1. Check all drivers
    const driversSnap = await db.collection('drivers').get();
    console.log('👥 คนขับทั้งหมด:', driversSnap.size);
    driversSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`  - ${doc.id.substring(0,12)}... | ${d.name} | status: ${d.status} | userId: ${d.userId?.substring(0,8) || 'N/A'}...`);
    });

    // 2. Check available drivers
    const availableSnap = await db.collection('drivers').where('status', '==', 'available').get();
    console.log('\n✅ คนขับที่ว่าง (available):', availableSnap.size);
    availableSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`  - ${d.name} | userId: ${d.userId?.substring(0,8) || 'N/A'}...`);
    });

    // 3. Check active bookings
    const activeStatuses = ['pending', 'confirmed', 'driver_assigned', 'driver_en_route', 'in_progress'];
    const bookingsSnap = await db.collection('bookings').where('status', 'in', activeStatuses).get();
    console.log('\n📦 Bookings ที่กำลังดำเนินการ:', bookingsSnap.size);
    bookingsSnap.docs.forEach(doc => {
        const b = doc.data();
        console.log(`  - ${doc.id.substring(0,12)}... | status: ${b.status} | driver: ${b.driver?.name || 'ยังไม่มี'} | userId: ${b.userId?.substring(0,8) || 'N/A'}...`);
    });

    // 4. Check drivers with active jobs
    const busyDriversSnap = await db.collection('drivers').where('status', '==', 'busy').get();
    console.log('\n🔴 คนขับที่ busy:', busyDriversSnap.size);
    busyDriversSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`  - ${d.name}`);
    });

    // 5. Check bookings with assigned drivers
    const assignedBookings = await db.collection('bookings')
        .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
        .get();
    console.log('\n🚗 Bookings ที่มีคนขับรับแล้ว:', assignedBookings.size);
    assignedBookings.docs.forEach(doc => {
        const b = doc.data();
        console.log(`  - ${doc.id.substring(0,12)}... | status: ${b.status} | driver: ${b.driver?.name} (${b.driver?.driverId?.substring(0,8)}...)`);
    });

    console.log('\n=== สรุป ===');
    console.log(`คนขับทั้งหมด: ${driversSnap.size}`);
    console.log(`คนขับว่าง: ${availableSnap.size}`);
    console.log(`คนขับ busy: ${busyDriversSnap.size}`);
    console.log(`Bookings กำลังดำเนินการ: ${bookingsSnap.size}`);
}

check().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
