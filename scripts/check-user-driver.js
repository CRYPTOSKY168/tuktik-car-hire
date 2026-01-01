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
const targetEmail = process.argv[2] || 'phiopan2@gmail.com';

async function check() {
    console.log('\n=== 🔍 ตรวจสอบ user:', targetEmail, '===\n');

    // 1. หา user
    const usersSnap = await db.collection('users')
        .where('email', '==', targetEmail)
        .get();

    let userId = null;
    if (!usersSnap.empty) {
        const user = usersSnap.docs[0];
        const userData = user.data();
        userId = user.id;
        console.log('📧 User found:');
        console.log('  ID:', user.id);
        console.log('  Email:', userData.email);
        console.log('  Role:', userData.role || 'user');
        console.log('  isApprovedDriver:', userData.isApprovedDriver || false);
        console.log('  driverId:', userData.driverId || 'N/A');
    } else {
        console.log('❌ User not found in users collection');
    }

    // 2. เช็คคนขับทั้งหมดและหาว่า user เป็นคนขับไหม
    console.log('\n=== 👥 คนขับทั้งหมด ===\n');

    const driversSnap = await db.collection('drivers').get();
    let userIsDriver = false;
    let userDriverId = null;

    driversSnap.docs.forEach(doc => {
        const d = doc.data();
        const isThisUser = d.userId === userId;
        if (isThisUser) {
            userIsDriver = true;
            userDriverId = doc.id;
        }
        console.log(`${isThisUser ? '⭐' : '  '} ${d.name}`);
        console.log(`    ID: ${doc.id}`);
        console.log(`    userId: ${d.userId || 'N/A'}`);
        console.log(`    status: ${d.status}`);
        console.log('');
    });

    if (userIsDriver) {
        console.log('⚠️  User นี้เป็นคนขับด้วย! (driverId:', userDriverId + ')');
        console.log('   → ระบบจะไม่ assign ตัวเองเป็นคนขับ');

        // นับคนขับคนอื่นที่ว่าง
        const otherAvailable = driversSnap.docs.filter(doc =>
            doc.id !== userDriverId && doc.data().status === 'available'
        );
        console.log('   → คนขับคนอื่นที่ว่าง:', otherAvailable.length, 'คน');

        if (otherAvailable.length === 0) {
            console.log('\n❌ ปัญหา: ไม่มีคนขับคนอื่นที่ว่าง!');
            console.log('   → นี่คือสาเหตุที่แสดง "ไม่สามารถมอบหมายคนขับได้"');
        }
    }

    // 3. เช็ค active bookings
    console.log('\n=== 📦 Active Bookings ===\n');

    const activeStatuses = ['pending', 'confirmed', 'driver_assigned', 'driver_en_route', 'in_progress'];
    const bookingsSnap = await db.collection('bookings')
        .where('status', 'in', activeStatuses)
        .get();

    console.log('Active bookings:', bookingsSnap.size);
    bookingsSnap.docs.forEach(doc => {
        const b = doc.data();
        console.log(`  - ${doc.id.substring(0,12)}... | status: ${b.status} | driver: ${b.driver?.name || 'N/A'}`);
    });

    // 4. สรุป
    console.log('\n=== 📝 สรุป ===\n');
    const availableDrivers = driversSnap.docs.filter(d => d.data().status === 'available');
    const eligibleDrivers = userIsDriver
        ? availableDrivers.filter(d => d.id !== userDriverId)
        : availableDrivers;

    console.log('คนขับทั้งหมด:', driversSnap.size);
    console.log('คนขับที่ว่าง:', availableDrivers.length);
    console.log('คนขับที่ assign ได้ (ไม่รวมตัวเอง):', eligibleDrivers.length);

    if (eligibleDrivers.length === 0) {
        console.log('\n🔴 ไม่มีคนขับที่สามารถรับงานได้!');
    } else {
        console.log('\n🟢 มีคนขับพร้อมรับงาน:');
        eligibleDrivers.forEach(d => {
            console.log(`  - ${d.data().name}`);
        });
    }
}

check().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
