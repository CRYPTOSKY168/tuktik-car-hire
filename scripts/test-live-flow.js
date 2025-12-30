#!/usr/bin/env node
/**
 * Test Live Flow - Watch Real-time Updates
 * ทดสอบ flow การจองรถแบบ real-time ให้ดูทั้งสองหน้า
 *
 * เปิด 2 หน้านี้ก่อนรัน script:
 * - http://localhost:3000/test-maps1 (Customer - เปิด Live Mode)
 * - http://localhost:3000/demo-driver (Driver - Login ก่อน)
 *
 * Usage: node scripts/test-live-flow.js
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
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgMagenta: '\x1b[45m',
};

// Config
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
        phone: '0898765432',
        vehiclePlate: 'กข 1234',
        vehicleModel: 'Toyota Camry',
    },
    // Delay between steps (milliseconds)
    stepDelay: 6000,  // 6 seconds
};

// Random Locations
const LOCATIONS = {
    pickups: [
        { name: 'สนามบินสุวรรณภูมิ', price: 1500 },
        { name: 'สนามบินดอนเมือง', price: 1200 },
        { name: 'สยามพารากอน', price: 700 },
        { name: 'เซ็นทรัลเวิลด์', price: 750 },
        { name: 'MBK Center', price: 700 },
    ],
    dropoffs: [
        { name: 'พัทยา', price: 1500 },
        { name: 'หัวหิน', price: 2500 },
        { name: 'บางแสน', price: 1200 },
        { name: 'เขาใหญ่', price: 3000 },
    ],
};

function randomSelect(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Initialize Firebase Admin
function initFirebase() {
    if (admin.apps.length > 0) return admin.firestore();
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
    return admin.firestore();
}

// Helper
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function countdown(seconds, message) {
    return new Promise(resolve => {
        let remaining = seconds;
        const interval = setInterval(() => {
            process.stdout.write(`\r   ${c.yellow}⏳ ${message} ${remaining}s...${c.reset}   `);
            remaining--;
            if (remaining < 0) {
                clearInterval(interval);
                process.stdout.write('\r' + ' '.repeat(60) + '\r');
                resolve();
            }
        }, 1000);
    });
}

function printStep(step, total, title, emoji) {
    console.log('\n' + '─'.repeat(60));
    console.log(`${c.bgBlue}${c.white}${c.bright} STEP ${step}/${total} ${c.reset} ${emoji} ${c.bright}${title}${c.reset}`);
    console.log('─'.repeat(60));
}

function printWatch(page, action) {
    console.log(`   ${c.cyan}👀 ดูที่${c.reset} ${c.bright}${page}${c.reset}: ${action}`);
}

async function main() {
    const db = initFirebase();

    console.log('\n' + '═'.repeat(60));
    console.log(`${c.bgMagenta}${c.white}${c.bright} 🎬 LIVE BOOKING FLOW TEST ${c.reset}`);
    console.log('═'.repeat(60));
    console.log(`\n${c.yellow}${c.bright}⚠️  เปิด 2 หน้านี้ก่อน:${c.reset}`);
    console.log(`   ${c.cyan}1. http://localhost:3000/test-maps1${c.reset} (Customer)`);
    console.log(`      → เปิด Live Mode ด้วย!`);
    console.log(`   ${c.cyan}2. http://localhost:3000/demo-driver${c.reset} (Driver)`);
    console.log(`      → Login ก่อน (imacroshosting@gmail.com)`);
    console.log('═'.repeat(60));

    await countdown(5, 'เริ่มใน');

    let bookingId = null;
    let originalDriverData = null;
    const totalSteps = 8;

    try {
        // Random locations
        const pickup = randomSelect(LOCATIONS.pickups);
        const dropoff = randomSelect(LOCATIONS.dropoffs);
        const totalPrice = pickup.price + dropoff.price;

        console.log(`\n${c.magenta}🎲 สุ่มเส้นทาง:${c.reset}`);
        console.log(`   ${c.green}📍 จุดรับ:${c.reset} ${pickup.name}`);
        console.log(`   ${c.red}🎯 จุดส่ง:${c.reset} ${dropoff.name}`);
        console.log(`   ${c.yellow}💰 ราคา:${c.reset} ฿${totalPrice.toLocaleString()}`);

        // Save original driver data
        const driverRef = db.collection('drivers').doc(CONFIG.driver.driverId);
        const driverSnap = await driverRef.get();
        originalDriverData = driverSnap.data();

        // ============================================
        // STEP 1: Create Booking
        // ============================================
        printStep(1, totalSteps, 'ลูกค้าสร้าง Booking', '📝');

        const pickupDate = new Date();
        pickupDate.setDate(pickupDate.getDate() + 1);

        const bookingData = {
            userId: CONFIG.customer.userId,
            firstName: 'Sarawuth',
            lastName: 'Thongdee',
            email: CONFIG.customer.email,
            phone: '0812345678',
            pickupLocation: pickup.name,
            dropoffLocation: dropoff.name,
            pickupDate: pickupDate.toISOString().split('T')[0],
            pickupTime: '10:00',
            vehicleId: 'test-vehicle',
            vehicleName: 'Toyota Camry',
            passengers: 2,
            luggage: 2,
            totalCost: totalPrice,
            status: 'pending',
            paymentMethod: 'cash',
            paymentStatus: 'pending',
            statusHistory: [{
                status: 'pending',
                timestamp: admin.firestore.Timestamp.now(),
                note: 'Booking created (Live Test)',
                updatedBy: 'customer',
            }],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const bookingRef = await db.collection('bookings').add(bookingData);
        bookingId = bookingRef.id;

        console.log(`   ${c.green}✓${c.reset} Booking ID: ${c.bright}${bookingId}${c.reset}`);
        console.log(`   ${c.green}✓${c.reset} Status: ${c.yellow}pending${c.reset}`);
        printWatch('test-maps1', 'ควรเห็น Active Booking ขึ้นมา (ถ้าเปิด Live Mode)');

        await countdown(CONFIG.stepDelay / 1000, 'ขั้นตอนถัดไปใน');

        // ============================================
        // STEP 2: Admin Confirms
        // ============================================
        printStep(2, totalSteps, 'Admin ยืนยัน Booking', '✅');

        const bookingDocRef = db.collection('bookings').doc(bookingId);
        let currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'confirmed',
            timestamp: admin.firestore.Timestamp.now(),
            note: 'Admin confirmed (Live Test)',
            updatedBy: 'admin',
        });

        await bookingDocRef.update({
            status: 'confirmed',
            statusHistory: currentBooking.statusHistory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`   ${c.green}✓${c.reset} Status: ${c.yellow}pending${c.reset} → ${c.green}confirmed${c.reset}`);
        printWatch('test-maps1', 'Status badge เปลี่ยนเป็น "ยืนยันแล้ว"');

        await countdown(CONFIG.stepDelay / 1000, 'ขั้นตอนถัดไปใน');

        // ============================================
        // STEP 3: Assign Driver
        // ============================================
        printStep(3, totalSteps, 'Admin มอบหมายคนขับ', '🚗');

        currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'driver_assigned',
            timestamp: admin.firestore.Timestamp.now(),
            note: `Assigned to ${CONFIG.driver.name} (Live Test)`,
            updatedBy: 'admin',
        });

        await bookingDocRef.update({
            status: 'driver_assigned',
            driver: {
                driverId: CONFIG.driver.driverId,
                name: CONFIG.driver.name,
                phone: CONFIG.driver.phone,
                vehiclePlate: CONFIG.driver.vehiclePlate,
                vehicleModel: CONFIG.driver.vehicleModel,
            },
            statusHistory: currentBooking.statusHistory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await driverRef.update({
            status: 'busy',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`   ${c.green}✓${c.reset} Status: ${c.green}confirmed${c.reset} → ${c.magenta}driver_assigned${c.reset}`);
        console.log(`   ${c.green}✓${c.reset} Driver: ${CONFIG.driver.name}`);
        printWatch('demo-driver', '🔔 Modal "งานใหม่!" ควรปรากฏพร้อม countdown!');
        printWatch('test-maps1', 'แสดงข้อมูลคนขับ');

        await countdown(CONFIG.stepDelay / 1000, 'คนขับจะรับงานใน');

        // ============================================
        // STEP 4: Driver Accepts (en_route)
        // ============================================
        printStep(4, totalSteps, 'คนขับกดรับงาน → กำลังไปรับ', '🚙');

        currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'driver_en_route',
            timestamp: admin.firestore.Timestamp.now(),
            note: 'Driver accepted and on the way (Live Test)',
            updatedBy: 'driver',
        });

        await bookingDocRef.update({
            status: 'driver_en_route',
            statusHistory: currentBooking.statusHistory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`   ${c.green}✓${c.reset} Status: ${c.magenta}driver_assigned${c.reset} → ${c.blue}driver_en_route${c.reset}`);
        printWatch('demo-driver', 'Modal ปิด, แสดงข้อมูลงาน, GPS เริ่มทำงาน');
        printWatch('test-maps1', 'แสดง "คนขับกำลังมา" + ตำแหน่งคนขับบนแผนที่');

        await countdown(CONFIG.stepDelay / 1000, 'คนขับถึงจุดรับใน');

        // ============================================
        // STEP 5: Driver Starts Trip (in_progress)
        // ============================================
        printStep(5, totalSteps, 'คนขับถึงจุดรับ → เริ่มเดินทาง', '🛣️');

        currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'in_progress',
            timestamp: admin.firestore.Timestamp.now(),
            note: 'Trip started (Live Test)',
            updatedBy: 'driver',
        });

        await bookingDocRef.update({
            status: 'in_progress',
            statusHistory: currentBooking.statusHistory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`   ${c.green}✓${c.reset} Status: ${c.blue}driver_en_route${c.reset} → ${c.cyan}in_progress${c.reset}`);
        printWatch('demo-driver', 'ปุ่มเปลี่ยนเป็น "เสร็จสิ้นการเดินทาง"');
        printWatch('test-maps1', 'แสดง "กำลังเดินทาง" + ความคืบหน้า');

        await countdown(CONFIG.stepDelay / 1000, 'ถึงปลายทางใน');

        // ============================================
        // STEP 6: Trip Completed
        // ============================================
        printStep(6, totalSteps, 'ถึงปลายทาง → เสร็จสิ้น', '🏁');

        currentBooking = (await bookingDocRef.get()).data();

        currentBooking.statusHistory.push({
            status: 'completed',
            timestamp: admin.firestore.Timestamp.now(),
            note: 'Trip completed (Live Test)',
            updatedBy: 'driver',
        });

        await bookingDocRef.update({
            status: 'completed',
            statusHistory: currentBooking.statusHistory,
            paymentStatus: 'paid',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await driverRef.update({
            status: 'available',
            totalTrips: admin.firestore.FieldValue.increment(1),
            totalEarnings: admin.firestore.FieldValue.increment(totalPrice),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`   ${c.green}✓${c.reset} Status: ${c.cyan}in_progress${c.reset} → ${c.green}completed${c.reset}`);
        console.log(`   ${c.green}✓${c.reset} Payment: ${c.green}paid${c.reset}`);
        console.log(`   ${c.green}✓${c.reset} Driver Earnings: +฿${totalPrice.toLocaleString()}`);
        printWatch('demo-driver', 'งานหายไป, Modal ให้คะแนนลูกค้าอาจขึ้น');
        printWatch('test-maps1', 'แสดง "เสร็จสิ้น" + Modal ให้คะแนนคนขับ');

        await countdown(CONFIG.stepDelay / 1000, 'ให้คะแนนใน');

        // ============================================
        // STEP 7: Customer Rates Driver
        // ============================================
        printStep(7, totalSteps, 'ลูกค้าให้คะแนนคนขับ', '⭐');

        const stars = 5;
        const tip = 50;

        // Calculate Bayesian rating
        const currentDriver = (await driverRef.get()).data();
        const currentRating = currentDriver.rating || 4.0;
        const currentRatingCount = currentDriver.ratingCount || 0;
        const PRIOR_MEAN = 4.0;
        const MIN_REVIEWS = 5;
        const totalSum = (currentRating * currentRatingCount) + stars;
        const totalCount = currentRatingCount + 1;
        const newRating = Math.round(((PRIOR_MEAN * MIN_REVIEWS + totalSum) / (MIN_REVIEWS + totalCount)) * 10) / 10;

        await bookingDocRef.update({
            ratings: {
                customerToDriver: {
                    stars: stars,
                    comment: 'บริการดีมากครับ! (Live Test)',
                    tip: tip,
                    ratedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await driverRef.update({
            rating: newRating,
            ratingCount: admin.firestore.FieldValue.increment(1),
            totalTips: admin.firestore.FieldValue.increment(tip),
            totalEarnings: admin.firestore.FieldValue.increment(tip),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`   ${c.green}✓${c.reset} Stars: ${'⭐'.repeat(stars)}`);
        console.log(`   ${c.green}✓${c.reset} Tip: ฿${tip}`);
        console.log(`   ${c.green}✓${c.reset} Driver Rating: ${currentRating} → ${newRating}`);
        printWatch('demo-driver', 'Rating อัปเดตใน stats');

        await countdown(3, 'Rollback ใน');

        // ============================================
        // STEP 8: Rollback
        // ============================================
        printStep(8, totalSteps, 'Rollback ข้อมูลทดสอบ', '🔄');

        await bookingDocRef.delete();
        console.log(`   ${c.green}✓${c.reset} ลบ Booking: ${bookingId}`);

        await driverRef.update({
            status: originalDriverData.status || 'available',
            rating: originalDriverData.rating || 4.0,
            ratingCount: originalDriverData.ratingCount || 0,
            totalTrips: originalDriverData.totalTrips || 0,
            totalEarnings: originalDriverData.totalEarnings || 0,
            totalTips: originalDriverData.totalTips || 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ${c.green}✓${c.reset} คืนค่า Driver เดิม`);

        // ============================================
        // Summary
        // ============================================
        console.log('\n' + '═'.repeat(60));
        console.log(`${c.bgGreen}${c.white}${c.bright} ✅ FLOW TEST COMPLETED SUCCESSFULLY! ${c.reset}`);
        console.log('═'.repeat(60));
        console.log(`
${c.bright}📊 สรุปผลการทดสอบ:${c.reset}
   ✓ สร้าง Booking (pending)
   ✓ Admin ยืนยัน (confirmed)
   ✓ Admin มอบหมายคนขับ (driver_assigned)
   ✓ คนขับรับงาน (driver_en_route)
   ✓ เริ่มเดินทาง (in_progress)
   ✓ เสร็จสิ้น (completed)
   ✓ ลูกค้าให้คะแนน + ทิป
   ✓ Rollback ข้อมูลทดสอบ

${c.cyan}🔗 ตรวจสอบว่าทั้ง 2 หน้าอัปเดต real-time หรือไม่${c.reset}
`);

    } catch (error) {
        console.error(`\n${c.red}❌ Error:${c.reset}`, error.message);
        console.error(error.stack);

        // Cleanup on error
        if (bookingId) {
            try {
                await db.collection('bookings').doc(bookingId).delete();
                console.log(`${c.yellow}⚠ Cleaned up booking${c.reset}`);
            } catch (e) {}
        }
        if (originalDriverData) {
            try {
                await db.collection('drivers').doc(CONFIG.driver.driverId).update({
                    status: originalDriverData.status || 'available',
                    rating: originalDriverData.rating || 4.0,
                    ratingCount: originalDriverData.ratingCount || 0,
                    totalTrips: originalDriverData.totalTrips || 0,
                    totalEarnings: originalDriverData.totalEarnings || 0,
                    totalTips: originalDriverData.totalTips || 0,
                });
                console.log(`${c.yellow}⚠ Restored driver data${c.reset}`);
            } catch (e) {}
        }

        process.exit(1);
    }

    process.exit(0);
}

main();
