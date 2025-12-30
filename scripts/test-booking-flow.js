#!/usr/bin/env node
/**
 * Test Complete Booking Flow (Auto Mode)
 * ทดสอบ flow การจองรถตั้งแต่เริ่มจนจบ + ให้คะแนน
 *
 * Flow:
 * 1. ลูกค้าสร้าง booking (pending)
 * 2. Admin ยืนยัน booking (confirmed)
 * 3. Admin มอบหมายคนขับ (driver_assigned)
 * 4. คนขับกำลังไปรับ (driver_en_route)
 * 5. คนขับเริ่มเดินทาง (in_progress)
 * 6. ถึงปลายทาง (completed)
 * 7. ลูกค้าให้คะแนน
 * 8. Rollback ข้อมูลทดสอบ
 *
 * Usage:
 *   node scripts/test-booking-flow.js                    # ทดสอบเร็ว + rollback
 *   node scripts/test-booking-flow.js --no-rollback      # ไม่ลบข้อมูล (ดู UI ได้)
 *   node scripts/test-booking-flow.js --wait-accept      # รอ 20 วินาที ให้คนขับกดรับงาน
 *   node scripts/test-booking-flow.js --stop-at-assign   # หยุดที่ driver_assigned (ดู Modal)
 */

const admin = require('firebase-admin');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const OPTIONS = {
    noRollback: args.includes('--no-rollback'),
    waitAccept: args.includes('--wait-accept'),
    stopAtAssign: args.includes('--stop-at-assign'),
    cleanup: args.includes('--cleanup'),
    cleanupBookingId: args.includes('--cleanup') ? args[args.indexOf('--cleanup') + 1] : null,
};

// Colors
const c = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

// Test Config
const CONFIG = {
    customer: {
        userId: '5fjOySGXfhZCoIf5BzUuVdYAtar2',
        email: 'phiopan@gmail.com',
        name: 'Sarawuth Thongdee',
    },
    driver: {
        driverId: 'dgk6gxugjl33ypEVB7HT',
        userId: 'wprGq83wASgD5iqIxSwBues0Lr33',
        name: 'Imacros Imacroshost',
        email: 'imacroshosting@gmail.com',
    },
};

// Random Locations Pool
const LOCATIONS = {
    pickups: [
        { name: 'สนามบินสุวรรณภูมิ', price: 1500 },
        { name: 'สนามบินดอนเมือง', price: 1200 },
        { name: 'สถานีรถไฟหัวลำโพง', price: 800 },
        { name: 'สยามพารากอน', price: 700 },
        { name: 'เซ็นทรัลเวิลด์', price: 750 },
        { name: 'MBK Center', price: 700 },
        { name: 'อโศก (BTS)', price: 650 },
        { name: 'เอกมัย (BTS)', price: 600 },
    ],
    dropoffs: [
        { name: 'พัทยา', price: 1500 },
        { name: 'หัวหิน', price: 2500 },
        { name: 'บางแสน', price: 1200 },
        { name: 'อยุธยา', price: 1800 },
        { name: 'เขาใหญ่', price: 3000 },
        { name: 'กาญจนบุรี', price: 3500 },
        { name: 'ชะอำ', price: 2200 },
        { name: 'ราชบุรี', price: 2000 },
    ],
};

// Helper: Random select from array
function randomSelect(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

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

// Helper Functions
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function log(step, message, type = 'info') {
    const colors = {
        info: c.blue,
        success: c.green,
        error: c.red,
        warning: c.yellow,
        data: c.magenta,
    };
    const icons = {
        info: 'ℹ',
        success: '✓',
        error: '✗',
        warning: '⚠',
        data: '→',
    };
    console.log(`${colors[type]}[Step ${step}] ${icons[type]}${c.reset} ${message}`);
}

function logData(label, value) {
    console.log(`  ${c.cyan}${label}:${c.reset} ${value}`);
}

async function main() {
    const db = initFirebase();

    // Handle --cleanup option
    if (OPTIONS.cleanup) {
        console.log('\n' + '═'.repeat(60));
        console.log(`${c.bright}${c.cyan}🧹 Cleanup Test Data${c.reset}`);
        console.log('═'.repeat(60) + '\n');

        if (!OPTIONS.cleanupBookingId) {
            console.log(`${c.red}❌ Error: กรุณาระบุ Booking ID${c.reset}`);
            console.log(`   Usage: node scripts/test-booking-flow.js --cleanup <bookingId>\n`);
            process.exit(1);
        }

        try {
            const bookingRef = db.collection('bookings').doc(OPTIONS.cleanupBookingId);
            const bookingSnap = await bookingRef.get();

            if (!bookingSnap.exists) {
                console.log(`${c.yellow}⚠️  Booking ${OPTIONS.cleanupBookingId} ไม่พบ (อาจถูกลบไปแล้ว)${c.reset}\n`);
                process.exit(0);
            }

            // Delete booking
            await bookingRef.delete();
            console.log(`${c.green}✓${c.reset} ลบ Booking ${OPTIONS.cleanupBookingId} สำเร็จ`);

            // Reset driver if needed
            const driverRef = db.collection('drivers').doc(CONFIG.driver.driverId);
            const driverSnap = await driverRef.get();
            if (driverSnap.exists && driverSnap.data().status === 'busy') {
                await driverRef.update({ status: 'available' });
                console.log(`${c.green}✓${c.reset} Reset driver status → available`);
            }

            console.log(`\n${c.green}✅ Cleanup สำเร็จ!${c.reset}\n`);
        } catch (error) {
            console.error(`${c.red}❌ Cleanup Error:${c.reset}`, error.message);
        }
        process.exit(0);
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`${c.bright}${c.cyan}🧪 Test Complete Booking Flow (Auto Mode)${c.reset}`);
    console.log('═'.repeat(60));
    console.log(`${c.yellow}Customer:${c.reset} ${CONFIG.customer.email}`);
    console.log(`${c.yellow}Driver:${c.reset} ${CONFIG.driver.email}`);
    if (OPTIONS.stopAtAssign) console.log(`${c.magenta}Mode:${c.reset} หยุดที่ driver_assigned`);
    if (OPTIONS.waitAccept) console.log(`${c.magenta}Mode:${c.reset} รอ 20 วินาทีให้กดรับงาน`);
    if (OPTIONS.noRollback) console.log(`${c.magenta}Mode:${c.reset} ไม่ rollback`);
    console.log('═'.repeat(60) + '\n');

    let bookingId = null;
    let originalDriverData = null;

    try {
        // ============================================
        // Step 1: Save original driver data for rollback
        // ============================================
        log(1, 'บันทึกข้อมูล Driver เดิมสำหรับ rollback', 'info');

        const driverRef = db.collection('drivers').doc(CONFIG.driver.driverId);
        const driverSnap = await driverRef.get();

        if (!driverSnap.exists) {
            log(1, `ไม่พบ Driver: ${CONFIG.driver.driverId}`, 'error');
            process.exit(1);
        }

        originalDriverData = driverSnap.data();
        logData('Driver Name', originalDriverData.name);
        logData('Current Status', originalDriverData.status);
        logData('Rating', originalDriverData.rating);
        logData('Total Trips', originalDriverData.totalTrips);
        log(1, 'บันทึกข้อมูลเดิมสำเร็จ', 'success');

        await wait(500);

        // ============================================
        // Step 2: Create Booking (Customer)
        // ============================================
        log(2, 'ลูกค้าสร้าง Booking ใหม่', 'info');

        // Random select pickup and dropoff locations
        const randomPickup = randomSelect(LOCATIONS.pickups);
        const randomDropoff = randomSelect(LOCATIONS.dropoffs);
        const totalPrice = randomPickup.price + randomDropoff.price;

        console.log(`  ${c.magenta}🎲 สุ่มสถานที่:${c.reset}`);
        console.log(`     ${c.green}📍 จุดรับ:${c.reset} ${randomPickup.name}`);
        console.log(`     ${c.red}🎯 จุดส่ง:${c.reset} ${randomDropoff.name}`);
        console.log(`     ${c.yellow}💰 ราคารวม:${c.reset} ฿${totalPrice.toLocaleString()}`);

        const pickupDate = new Date();
        pickupDate.setDate(pickupDate.getDate() + 1); // Tomorrow

        const bookingData = {
            userId: CONFIG.customer.userId,
            firstName: 'Sarawuth',
            lastName: 'Thongdee',
            email: CONFIG.customer.email,
            phone: '0812345678',
            pickupLocation: randomPickup.name,
            dropoffLocation: randomDropoff.name,
            pickupDate: pickupDate.toISOString().split('T')[0],
            pickupTime: '10:00',
            vehicleId: 'test-vehicle',
            vehicleName: 'Toyota Camry (Test)',
            passengers: 2,
            luggage: 2,
            totalCost: totalPrice,
            status: 'pending',
            paymentMethod: 'cash',
            paymentStatus: 'pending',
            statusHistory: [
                {
                    status: 'pending',
                    timestamp: admin.firestore.Timestamp.now(),
                    note: 'Booking created (Test Script)',
                    updatedBy: 'system',
                },
            ],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const bookingRef = await db.collection('bookings').add(bookingData);
        bookingId = bookingRef.id;

        logData('Booking ID', bookingId);
        logData('Status', 'pending');
        logData('Pickup', `${bookingData.pickupLocation} → ${bookingData.dropoffLocation}`);
        logData('Total Cost', `฿${bookingData.totalCost}`);
        log(2, 'สร้าง Booking สำเร็จ!', 'success');

        await wait(500);

        // ============================================
        // Step 3: Admin Confirms Booking
        // ============================================
        log(3, 'Admin ยืนยัน Booking', 'info');

        const bookingDocRef = db.collection('bookings').doc(bookingId);
        let currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'confirmed',
            timestamp: admin.firestore.Timestamp.now(),
            note: 'Admin confirmed (Test Script)',
            updatedBy: 'admin',
        });

        await bookingDocRef.update({
            status: 'confirmed',
            statusHistory: currentBooking.statusHistory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logData('Status', 'pending → confirmed');
        log(3, 'ยืนยัน Booking สำเร็จ!', 'success');

        await wait(500);

        // ============================================
        // Step 4: Admin Assigns Driver
        // ============================================
        log(4, 'Admin มอบหมายคนขับ', 'info');

        currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'driver_assigned',
            timestamp: admin.firestore.Timestamp.now(),
            note: `Assigned to ${CONFIG.driver.name} (Test Script)`,
            updatedBy: 'admin',
        });

        await bookingDocRef.update({
            status: 'driver_assigned',
            driver: {
                driverId: CONFIG.driver.driverId,
                name: CONFIG.driver.name,
                phone: '0898765432',
                vehiclePlate: 'กข 1234',
                vehicleModel: 'Toyota Camry',
            },
            statusHistory: currentBooking.statusHistory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update driver status to busy
        await driverRef.update({
            status: 'busy',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logData('Status', 'confirmed → driver_assigned');
        logData('Driver', CONFIG.driver.name);
        logData('Driver Status', 'available → busy');
        log(4, 'มอบหมายคนขับสำเร็จ!', 'success');

        // Handle --stop-at-assign option
        if (OPTIONS.stopAtAssign) {
            console.log('\n' + '─'.repeat(60));
            console.log(`${c.yellow}⏸️  หยุดที่ขั้นตอน driver_assigned (--stop-at-assign)${c.reset}`);
            console.log(`${c.cyan}👉 เปิด http://localhost:3000/demo-driver เพื่อดู Modal "งานใหม่!"${c.reset}`);
            console.log(`${c.cyan}👉 Booking ID: ${bookingId}${c.reset}`);
            console.log('─'.repeat(60));
            console.log(`\n${c.yellow}⚠️  ข้อมูลทดสอบยังไม่ถูกลบ รันด้วย --cleanup เพื่อลบ:${c.reset}`);
            console.log(`   node scripts/test-booking-flow.js --cleanup ${bookingId}\n`);
            process.exit(0);
        }

        // Handle --wait-accept option
        if (OPTIONS.waitAccept) {
            console.log('\n' + '─'.repeat(60));
            console.log(`${c.yellow}⏳ รอ 20 วินาที ให้คนขับกดรับงานบน UI...${c.reset}`);
            console.log(`${c.cyan}👉 เปิด http://localhost:3000/demo-driver${c.reset}`);
            console.log('─'.repeat(60));
            for (let i = 20; i > 0; i--) {
                process.stdout.write(`\r   รอ ${i} วินาที... `);
                await wait(1000);
            }
            console.log('\r   รอครบแล้ว!          \n');
        } else {
            await wait(500);
        }

        // ============================================
        // Step 5: Driver En Route (Driver going to pickup)
        // ============================================
        log(5, 'คนขับกำลังไปรับลูกค้า', 'info');

        currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'driver_en_route',
            timestamp: admin.firestore.Timestamp.now(),
            note: 'Driver on the way (Test Script)',
            updatedBy: 'driver',
        });

        await bookingDocRef.update({
            status: 'driver_en_route',
            statusHistory: currentBooking.statusHistory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logData('Status', 'driver_assigned → driver_en_route');
        log(5, 'อัปเดตสถานะคนขับกำลังมาสำเร็จ!', 'success');

        await wait(500);

        // ============================================
        // Step 6: In Progress (Trip started)
        // ============================================
        log(6, 'เริ่มเดินทาง (ถึงจุดรับแล้ว)', 'info');

        currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'in_progress',
            timestamp: admin.firestore.Timestamp.now(),
            note: 'Trip started (Test Script)',
            updatedBy: 'driver',
        });

        await bookingDocRef.update({
            status: 'in_progress',
            statusHistory: currentBooking.statusHistory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logData('Status', 'driver_en_route → in_progress');
        log(6, 'เริ่มเดินทางสำเร็จ!', 'success');

        await wait(500);

        // ============================================
        // Step 7: Completed (Trip finished)
        // ============================================
        log(7, 'ถึงปลายทาง (เสร็จสิ้น)', 'info');

        currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'completed',
            timestamp: admin.firestore.Timestamp.now(),
            note: 'Trip completed (Test Script)',
            updatedBy: 'driver',
        });

        await bookingDocRef.update({
            status: 'completed',
            statusHistory: currentBooking.statusHistory,
            paymentStatus: 'paid',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update driver stats
        await driverRef.update({
            status: 'available',
            totalTrips: admin.firestore.FieldValue.increment(1),
            totalEarnings: admin.firestore.FieldValue.increment(totalPrice),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logData('Status', 'in_progress → completed');
        logData('Payment Status', 'paid');
        logData('Driver Status', 'busy → available');
        logData('Driver Earnings', `+฿${totalPrice.toLocaleString()}`);
        log(7, 'เสร็จสิ้นสำเร็จ!', 'success');

        await wait(500);

        // ============================================
        // Step 8: Customer Rates Driver
        // ============================================
        log(8, 'ลูกค้าให้คะแนนคนขับ', 'info');

        const stars = 5;
        const tip = 100;
        const comment = 'ขับดีมากครับ สุภาพ ตรงเวลา (Test)';

        // Get current driver data for rating calculation
        const currentDriver = (await driverRef.get()).data();
        const currentRating = currentDriver.rating || 4.0;
        const currentRatingCount = currentDriver.ratingCount || 0;

        // Bayesian Average calculation
        const PRIOR_MEAN = 4.0;
        const MIN_REVIEWS = 5;
        const totalSum = (currentRating * currentRatingCount) + stars;
        const totalCount = currentRatingCount + 1;
        const newRating = Math.round(((PRIOR_MEAN * MIN_REVIEWS + totalSum) / (MIN_REVIEWS + totalCount)) * 10) / 10;

        // Update booking with rating
        await bookingDocRef.update({
            ratings: {
                customerToDriver: {
                    stars: stars,
                    comment: comment,
                    tip: tip,
                    ratedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update driver rating
        await driverRef.update({
            rating: newRating,
            ratingCount: admin.firestore.FieldValue.increment(1),
            totalTips: admin.firestore.FieldValue.increment(tip),
            totalEarnings: admin.firestore.FieldValue.increment(tip),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logData('Stars', `${'⭐'.repeat(stars)} (${stars})`);
        logData('Tip', `฿${tip}`);
        logData('Comment', comment);
        logData('Rating Update', `${currentRating} → ${newRating} (Bayesian)`);
        log(8, 'ให้คะแนนสำเร็จ!', 'success');

        await wait(1000);

        // ============================================
        // Step 9: Verify Final State
        // ============================================
        log(9, 'ตรวจสอบผลลัพธ์สุดท้าย', 'info');

        const finalBooking = (await bookingDocRef.get()).data();
        const finalDriver = (await driverRef.get()).data();

        console.log('\n' + '─'.repeat(50));
        console.log(`${c.bright}📊 Final Booking State:${c.reset}`);
        logData('Booking ID', bookingId);
        logData('Status', finalBooking.status);
        logData('Payment Status', finalBooking.paymentStatus);
        logData('Status History Count', finalBooking.statusHistory.length);
        logData('Has Rating', finalBooking.ratings ? 'Yes' : 'No');

        console.log(`\n${c.bright}👤 Final Driver State:${c.reset}`);
        logData('Name', finalDriver.name);
        logData('Status', finalDriver.status);
        logData('Rating', finalDriver.rating);
        logData('Rating Count', finalDriver.ratingCount);
        logData('Total Trips', finalDriver.totalTrips);
        logData('Total Earnings', `฿${(finalDriver.totalEarnings || 0).toLocaleString()}`);
        logData('Total Tips', `฿${(finalDriver.totalTips || 0).toLocaleString()}`);
        console.log('─'.repeat(50) + '\n');

        log(9, 'ตรวจสอบสำเร็จ!', 'success');

        await wait(1000);

        // ============================================
        // Step 10: Rollback
        // ============================================
        if (OPTIONS.noRollback) {
            console.log('\n' + '─'.repeat(60));
            console.log(`${c.yellow}⏭️  ข้าม Rollback (--no-rollback)${c.reset}`);
            console.log(`${c.cyan}👉 Booking ID: ${bookingId}${c.reset}`);
            console.log(`${c.cyan}👉 ข้อมูลทดสอบยังอยู่ใน database${c.reset}`);
            console.log('─'.repeat(60));
            console.log(`\n${c.yellow}⚠️  รันคำสั่งนี้เพื่อลบข้อมูลทดสอบ:${c.reset}`);
            console.log(`   node scripts/test-booking-flow.js --cleanup ${bookingId}\n`);
        } else {
            log(10, 'Rollback ข้อมูลทดสอบ', 'warning');

            // Delete the test booking
            await bookingDocRef.delete();
            logData('Booking', `${bookingId} ลบแล้ว`);

            // Restore driver data
            await driverRef.update({
                status: originalDriverData.status || 'available',
                rating: originalDriverData.rating || 4.0,
                ratingCount: originalDriverData.ratingCount || 0,
                totalTrips: originalDriverData.totalTrips || 0,
                totalEarnings: originalDriverData.totalEarnings || 0,
                totalTips: originalDriverData.totalTips || 0,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            logData('Driver', 'คืนค่าข้อมูลเดิมแล้ว');

            log(10, 'Rollback สำเร็จ!', 'success');
        }

        // ============================================
        // Summary
        // ============================================
        console.log('\n' + '═'.repeat(60));
        console.log(`${c.green}${c.bright}✅ ทดสอบ Booking Flow สำเร็จทั้งหมด!${c.reset}`);
        console.log('═'.repeat(60));
        console.log('\n📝 สรุปผลการทดสอบ:');
        console.log('  ✓ สร้าง Booking (Customer)');
        console.log('  ✓ ยืนยัน Booking (Admin)');
        console.log('  ✓ มอบหมายคนขับ (Admin)');
        console.log('  ✓ คนขับกำลังไปรับ (Driver)');
        console.log('  ✓ เริ่มเดินทาง (Driver)');
        console.log('  ✓ เสร็จสิ้น (Driver)');
        console.log('  ✓ ให้คะแนน + ทิป (Customer)');
        console.log(OPTIONS.noRollback ? '  ⏭️ ข้าม Rollback' : '  ✓ Rollback ข้อมูลทดสอบ');
        console.log('\n');

    } catch (error) {
        console.error(`\n${c.red}❌ Error:${c.reset}`, error.message);
        console.error(error.stack);

        // Attempt cleanup on error
        if (bookingId) {
            try {
                console.log(`\n${c.yellow}⚠ Attempting cleanup...${c.reset}`);
                await db.collection('bookings').doc(bookingId).delete();
                console.log(`${c.green}✓ Deleted test booking${c.reset}`);

                if (originalDriverData) {
                    await db.collection('drivers').doc(CONFIG.driver.driverId).update({
                        status: originalDriverData.status || 'available',
                        rating: originalDriverData.rating || 4.0,
                        ratingCount: originalDriverData.ratingCount || 0,
                        totalTrips: originalDriverData.totalTrips || 0,
                        totalEarnings: originalDriverData.totalEarnings || 0,
                        totalTips: originalDriverData.totalTips || 0,
                    });
                    console.log(`${c.green}✓ Restored driver data${c.reset}`);
                }
            } catch (cleanupError) {
                console.error(`${c.red}✗ Cleanup failed:${c.reset}`, cleanupError.message);
            }
        }

        process.exit(1);
    }

    process.exit(0);
}

main();
