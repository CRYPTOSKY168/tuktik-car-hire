#!/usr/bin/env node

/**
 * Test Real-time Rating Update (Auto Mode)
 * ทดสอบ real-time โดยไม่ต้อง input
 *
 * Usage: node scripts/test-realtime-rating-auto.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Colors
const c = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

// Initialize Firebase Admin
function initFirebase() {
    if (admin.apps.length > 0) return admin.firestore();
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.log(`${c.red}✗ Missing Firebase credentials${c.reset}`);
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    return admin.firestore();
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log(`${c.bright}${c.cyan}🧪 Test Real-time Rating Update (Auto)${c.reset}`);
    console.log('='.repeat(60));

    const db = initFirebase();

    // Find first driver
    console.log(`\n${c.blue}[Step 1]${c.reset} ค้นหา Driver...`);

    const driversSnap = await db.collection('drivers')
        .where('isActive', '==', true)
        .limit(1)
        .get();

    if (driversSnap.empty) {
        console.log(`${c.red}✗ ไม่พบ driver${c.reset}`);
        process.exit(1);
    }

    const driverDoc = driversSnap.docs[0];
    const driverId = driverDoc.id;
    const driverData = driverDoc.data();

    console.log(`${c.green}✓${c.reset} พบ: ${driverData.name} (${driverId})`);

    // Show current values
    console.log(`\n${c.blue}[Step 2]${c.reset} ข้อมูลปัจจุบัน:`);
    const original = {
        rating: driverData.rating || 4.0,
        ratingCount: driverData.ratingCount || 0,
        totalTrips: driverData.totalTrips || 0,
        totalEarnings: driverData.totalEarnings || 0,
    };

    console.log(`  Rating: ${c.yellow}${original.rating}${c.reset}`);
    console.log(`  Rating Count: ${original.ratingCount}`);
    console.log(`  Total Trips: ${original.totalTrips}`);
    console.log(`  Total Earnings: ฿${original.totalEarnings.toLocaleString()}`);

    // Calculate new values
    const newValues = {
        rating: original.rating >= 4.9 ? 4.0 : Math.round((original.rating + 0.3) * 10) / 10,
        ratingCount: original.ratingCount + 1,
        totalTrips: original.totalTrips + 1,
        totalEarnings: original.totalEarnings + 500,
    };

    // Update
    console.log(`\n${c.blue}[Step 3]${c.reset} อัปเดต Firestore...`);
    console.log(`  Rating: ${original.rating} → ${c.green}${newValues.rating}${c.reset}`);
    console.log(`  Rating Count: ${original.ratingCount} → ${c.green}${newValues.ratingCount}${c.reset}`);
    console.log(`  Total Trips: ${original.totalTrips} → ${c.green}${newValues.totalTrips}${c.reset}`);
    console.log(`  Total Earnings: ฿${original.totalEarnings.toLocaleString()} → ${c.green}฿${newValues.totalEarnings.toLocaleString()}${c.reset}`);

    const driverRef = db.collection('drivers').doc(driverId);
    await driverRef.update({
        ...newValues,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`${c.green}✓${c.reset} อัปเดตสำเร็จ!`);

    // Instructions
    console.log('\n' + '─'.repeat(60));
    console.log(`${c.bright}👀 ตรวจสอบที่ http://localhost:3000/demo-driver${c.reset}`);
    console.log('─'.repeat(60));
    console.log(`\nถ้า ${c.green}Real-time ทำงาน${c.reset}:`);
    console.log(`  → Rating จะแสดงเป็น ${c.green}${newValues.rating}${c.reset} ทันที (ไม่ต้อง refresh)`);
    console.log(`\nถ้า ${c.red}ไม่ทำงาน${c.reset}:`);
    console.log(`  → Rating ยังเป็น ${c.yellow}${original.rating}${c.reset} ต้อง refresh ถึงจะเห็น`);

    // Wait 5 seconds then rollback
    console.log(`\n${c.blue}[Step 4]${c.reset} รอ 10 วินาที แล้ว rollback...`);

    for (let i = 10; i > 0; i--) {
        process.stdout.write(`\r  รอ ${i} วินาที... `);
        await new Promise(r => setTimeout(r, 1000));
    }

    // Rollback
    console.log(`\r${c.blue}[Step 5]${c.reset} Rollback ค่าเดิม...          `);
    await driverRef.update({
        ...original,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`${c.green}✓${c.reset} Rollback สำเร็จ! Rating กลับเป็น ${original.rating}`);

    console.log('\n' + '='.repeat(60));
    console.log(`${c.green}${c.bright}✅ ทดสอบเสร็จสิ้น${c.reset}`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
}

main().catch(err => {
    console.error(`${c.red}Error:${c.reset}`, err.message);
    process.exit(1);
});
