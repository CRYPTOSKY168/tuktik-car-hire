#!/usr/bin/env node

/**
 * Test Real-time Rating Update Script
 * ทดสอบว่าหน้า /demo-driver อัปเดต rating แบบ real-time หรือไม่
 *
 * Usage:
 *   node scripts/test-realtime-rating.js
 *   node scripts/test-realtime-rating.js --driver-id <driverId>
 *
 * วิธีทดสอบ:
 *   1. เปิด http://localhost:3000/demo-driver ค้างไว้
 *   2. รัน script นี้
 *   3. ดูว่าคะแนนบนหน้าเว็บเปลี่ยนทันทีหรือไม่
 */

const admin = require('firebase-admin');
const path = require('path');
const readline = require('readline');

// Colors for console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    step: (num, msg) => console.log(`\n${colors.cyan}[Step ${num}]${colors.reset} ${colors.bright}${msg}${colors.reset}`),
    data: (label, value) => console.log(`  ${colors.magenta}${label}:${colors.reset} ${value}`),
};

// Initialize Firebase Admin
function initFirebase() {
    if (admin.apps.length > 0) return admin.firestore();

    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        log.error('Missing Firebase Admin credentials in .env.local');
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });

    return admin.firestore();
}

// Prompt for user input
function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// Wait function
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}${colors.cyan}🧪 Test Real-time Rating Update${colors.reset}`);
    console.log('='.repeat(60));

    const db = initFirebase();

    // Get driver ID from args or find first driver
    let driverId = null;
    const args = process.argv.slice(2);
    const driverIdIndex = args.indexOf('--driver-id');
    if (driverIdIndex !== -1 && args[driverIdIndex + 1]) {
        driverId = args[driverIdIndex + 1];
    }

    log.step(1, 'ค้นหา Driver');

    if (!driverId) {
        // Find first active driver
        const driversSnap = await db.collection('drivers')
            .where('isActive', '==', true)
            .limit(5)
            .get();

        if (driversSnap.empty) {
            log.error('ไม่พบ driver ในระบบ');
            process.exit(1);
        }

        console.log('\n  พบ drivers:');
        driversSnap.docs.forEach((doc, i) => {
            const d = doc.data();
            console.log(`  ${i + 1}. ${doc.id} - ${d.name} (rating: ${d.rating || '-'})`);
        });

        const choice = await prompt('\n  เลือก driver (1-5): ');
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < driversSnap.docs.length) {
            driverId = driversSnap.docs[index].id;
        } else {
            driverId = driversSnap.docs[0].id;
        }
    }

    log.success(`เลือก Driver ID: ${driverId}`);

    // Get current driver data
    log.step(2, 'อ่านข้อมูลปัจจุบัน');

    const driverRef = db.collection('drivers').doc(driverId);
    const driverSnap = await driverRef.get();

    if (!driverSnap.exists) {
        log.error(`ไม่พบ driver: ${driverId}`);
        process.exit(1);
    }

    const driverData = driverSnap.data();
    const originalRating = driverData.rating || 4.0;
    const originalRatingCount = driverData.ratingCount || 0;
    const originalTotalTrips = driverData.totalTrips || 0;
    const originalTotalEarnings = driverData.totalEarnings || 0;

    console.log('\n  ข้อมูลปัจจุบัน:');
    log.data('ชื่อ', driverData.name);
    log.data('Rating', originalRating);
    log.data('Rating Count', originalRatingCount);
    log.data('Total Trips', originalTotalTrips);
    log.data('Total Earnings', `฿${originalTotalEarnings.toLocaleString()}`);

    // Prompt to continue
    console.log('\n' + '─'.repeat(60));
    console.log(`${colors.yellow}⚠ ก่อนดำเนินการต่อ:${colors.reset}`);
    console.log(`  1. เปิด ${colors.cyan}http://localhost:3000/demo-driver${colors.reset} ค้างไว้`);
    console.log(`  2. Login ด้วย account ของ driver นี้`);
    console.log(`  3. สังเกตค่า Rating ที่แสดงบนหน้าจอ`);
    console.log('─'.repeat(60));

    const confirm = await prompt('\nพร้อมทดสอบแล้วหรือยัง? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
        log.warning('ยกเลิกการทดสอบ');
        process.exit(0);
    }

    // Update rating
    log.step(3, 'อัปเดต Rating ใน Firestore');

    // Generate new test values
    const newRating = originalRating >= 4.9 ? 4.0 : Math.round((originalRating + 0.3) * 10) / 10;
    const newRatingCount = originalRatingCount + 1;
    const newTotalTrips = originalTotalTrips + 1;
    const newTotalEarnings = originalTotalEarnings + 100;

    console.log('\n  ค่าใหม่ที่จะอัปเดต:');
    log.data('Rating', `${originalRating} → ${colors.green}${newRating}${colors.reset}`);
    log.data('Rating Count', `${originalRatingCount} → ${colors.green}${newRatingCount}${colors.reset}`);
    log.data('Total Trips', `${originalTotalTrips} → ${colors.green}${newTotalTrips}${colors.reset}`);
    log.data('Total Earnings', `฿${originalTotalEarnings.toLocaleString()} → ${colors.green}฿${newTotalEarnings.toLocaleString()}${colors.reset}`);

    await driverRef.update({
        rating: newRating,
        ratingCount: newRatingCount,
        totalTrips: newTotalTrips,
        totalEarnings: newTotalEarnings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    log.success('อัปเดต Firestore สำเร็จ!');

    // Wait and check
    log.step(4, 'ตรวจสอบผลลัพธ์');

    console.log('\n' + '─'.repeat(60));
    console.log(`${colors.bright}👀 ดูที่หน้า /demo-driver ตอนนี้!${colors.reset}`);
    console.log('─'.repeat(60));
    console.log(`\n  ถ้า real-time ทำงาน → คะแนนจะเปลี่ยนเป็น ${colors.green}${newRating}${colors.reset} ทันที`);
    console.log(`  ถ้าไม่ทำงาน → คะแนนยังเป็น ${colors.yellow}${originalRating}${colors.reset} (ต้อง refresh)`);

    const result = await prompt('\nคะแนนบนหน้าเว็บเปลี่ยนทันทีหรือไม่? (y/n): ');

    if (result.toLowerCase() === 'y') {
        console.log('\n' + '='.repeat(60));
        console.log(`${colors.green}${colors.bright}✅ Real-time ทำงานถูกต้อง!${colors.reset}`);
        console.log('='.repeat(60));
    } else {
        console.log('\n' + '='.repeat(60));
        console.log(`${colors.red}${colors.bright}❌ Real-time ไม่ทำงาน${colors.reset}`);
        console.log('='.repeat(60));
        console.log('\nสาเหตุที่เป็นไปได้:');
        console.log('  1. ยังไม่ได้ deploy code ใหม่ (ลอง restart dev server)');
        console.log('  2. Login ด้วย driver คนอื่น');
        console.log('  3. Browser cache (ลอง hard refresh Cmd+Shift+R)');
    }

    // Rollback
    log.step(5, 'Rollback ค่าเดิม');

    const rollback = await prompt('\nต้องการ rollback ค่าเดิมหรือไม่? (y/n): ');

    if (rollback.toLowerCase() === 'y') {
        await driverRef.update({
            rating: originalRating,
            ratingCount: originalRatingCount,
            totalTrips: originalTotalTrips,
            totalEarnings: originalTotalEarnings,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        log.success('Rollback สำเร็จ!');
        console.log(`  Rating กลับเป็น: ${originalRating}`);
    } else {
        log.info('ไม่ rollback - ค่าใหม่จะถูกเก็บไว้');
    }

    console.log('\n');
    process.exit(0);
}

main().catch((error) => {
    console.error(`\n${colors.red}❌ Error:${colors.reset}`, error);
    process.exit(1);
});
