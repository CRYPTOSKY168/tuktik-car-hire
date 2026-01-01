#!/usr/bin/env node
/**
 * Test Auto Re-match Flow
 * ทดสอบระบบ Auto Re-match เมื่อคนขับปฏิเสธงาน
 *
 * สิ่งที่ทดสอบ:
 * 1. สร้าง Booking และมอบหมายคนขับ
 * 2. คนขับปฏิเสธงาน (เพิ่มลง rejectedDrivers array)
 * 3. ระบบหาคนขับใหม่ (ข้ามคนที่ปฏิเสธแล้ว)
 * 4. ทำซ้ำจนครบ MAX_ATTEMPTS หรือหาคนขับได้
 *
 * เปิดหน้านี้เพื่อดู UI:
 * - http://localhost:3000/test-maps1 (Customer - เปิด Live Mode)
 * - http://localhost:3000/demo-driver (Driver - Login)
 *
 * Usage: node scripts/test-rematch-flow.js [--cleanup <bookingId>]
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
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgMagenta: '\x1b[45m',
};

// Config
const REMATCH_CONFIG = {
    MAX_ATTEMPTS: 3,                    // Maximum driver match attempts
    DRIVER_RESPONSE_TIMEOUT: 20000,     // 20 seconds for driver to respond
    TOTAL_SEARCH_TIMEOUT: 180000,       // 3 minutes total search time
    DELAY_BETWEEN_MATCHES: 3000,        // 3 seconds delay before next match
};

const CONFIG = {
    customer: {
        userId: '5fjOySGXfhZCoIf5BzUuVdYAtar2',
        email: 'phiopan@gmail.com',
        name: 'Sarawuth Thongdee',
    },
    // Test with mock drivers (will create if not exist)
    mockDrivers: [
        {
            id: 'test_driver_1',
            name: 'คนขับทดสอบ 1',
            phone: '081-111-1111',
            vehiclePlate: 'ทดสอบ 1111',
            vehicleModel: 'Toyota Camry',
            vehicleColor: 'สีดำ',
        },
        {
            id: 'test_driver_2',
            name: 'คนขับทดสอบ 2',
            phone: '081-222-2222',
            vehiclePlate: 'ทดสอบ 2222',
            vehicleModel: 'Honda Accord',
            vehicleColor: 'สีขาว',
        },
        {
            id: 'test_driver_3',
            name: 'คนขับทดสอบ 3',
            phone: '081-333-3333',
            vehiclePlate: 'ทดสอบ 3333',
            vehicleModel: 'Nissan Teana',
            vehicleColor: 'สีเทา',
        },
    ],
    stepDelay: 3000,  // 3 seconds
};

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

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function printHeader(text) {
    console.log(`\n${c.bgMagenta}${c.white}${c.bright} ${text} ${c.reset}\n`);
}

function printStep(step, text) {
    console.log(`${c.cyan}[Step ${step}]${c.reset} ${text}`);
}

function printSuccess(text) {
    console.log(`   ${c.green}✓${c.reset} ${text}`);
}

function printWarning(text) {
    console.log(`   ${c.yellow}⚠${c.reset} ${text}`);
}

function printError(text) {
    console.log(`   ${c.red}✗${c.reset} ${text}`);
}

function printInfo(text) {
    console.log(`   ${c.blue}ℹ${c.reset} ${text}`);
}

async function cleanupBooking(db, bookingId) {
    printHeader('🧹 Cleanup Booking');

    try {
        const bookingRef = db.collection('bookings').doc(bookingId);
        const booking = await bookingRef.get();

        if (!booking.exists) {
            printWarning(`Booking ${bookingId} not found`);
            return;
        }

        const data = booking.data();

        // Reset driver status if assigned
        if (data.driver?.driverId) {
            try {
                const driverRef = db.collection('drivers').doc(data.driver.driverId);
                await driverRef.update({
                    status: 'available',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                printSuccess(`Driver ${data.driver.driverId} status → available`);
            } catch (e) {
                printWarning(`Could not reset driver status: ${e.message}`);
            }
        }

        // Delete booking
        await bookingRef.delete();
        printSuccess(`Booking ${bookingId} deleted`);

    } catch (error) {
        printError(`Cleanup failed: ${error.message}`);
    }
}

async function main() {
    printHeader('🔄 Test Auto Re-match Flow');

    // Check for cleanup flag
    const args = process.argv.slice(2);
    if (args[0] === '--cleanup' && args[1]) {
        const db = initFirebase();
        await cleanupBooking(db, args[1]);
        process.exit(0);
    }

    console.log(`\n${c.yellow}📋 Re-match Configuration:${c.reset}`);
    console.log(`   - MAX_ATTEMPTS: ${REMATCH_CONFIG.MAX_ATTEMPTS}`);
    console.log(`   - DRIVER_RESPONSE_TIMEOUT: ${REMATCH_CONFIG.DRIVER_RESPONSE_TIMEOUT / 1000}s`);
    console.log(`   - TOTAL_SEARCH_TIMEOUT: ${REMATCH_CONFIG.TOTAL_SEARCH_TIMEOUT / 1000}s`);
    console.log(`   - DELAY_BETWEEN_MATCHES: ${REMATCH_CONFIG.DELAY_BETWEEN_MATCHES / 1000}s`);

    const db = initFirebase();
    let testBookingId = null;
    let assignedDrivers = [];

    try {
        // Step 1: Create test booking
        printStep(1, 'สร้าง Booking ทดสอบ');

        const bookingData = {
            userId: CONFIG.customer.userId,
            firstName: 'Test',
            lastName: 'Rematch',
            email: CONFIG.customer.email,
            phone: '081-234-5678',
            pickupLocation: 'สนามบินสุวรรณภูมิ',
            dropoffLocation: 'พัทยา',
            pickupCoordinates: { lat: 13.690, lng: 100.750 },
            dropoffCoordinates: { lat: 12.925, lng: 100.882 },
            pickupDate: new Date().toISOString().split('T')[0],
            pickupTime: '14:00',
            vehicleId: 'test_vehicle',
            vehicleName: 'Comfort Sedan',
            totalCost: 1500,
            status: 'pending',
            paymentMethod: 'cash',
            paymentStatus: 'pending',
            // Auto Re-match fields
            rejectedDrivers: [],
            matchAttempts: 0,
            searchStartedAt: admin.firestore.Timestamp.now(),
            statusHistory: [{
                status: 'pending',
                timestamp: admin.firestore.Timestamp.now(),
                note: 'Test booking created for re-match test',
            }],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const bookingRef = await db.collection('bookings').add(bookingData);
        testBookingId = bookingRef.id;
        printSuccess(`Booking created: ${testBookingId}`);

        // Step 2: Confirm booking
        printStep(2, 'ยืนยัน Booking (pending → confirmed)');
        await wait(1000);

        await bookingRef.update({
            status: 'confirmed',
            statusHistory: admin.firestore.FieldValue.arrayUnion({
                status: 'confirmed',
                timestamp: admin.firestore.Timestamp.now(),
                note: 'Confirmed by test script',
                updatedBy: 'admin',
            }),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        printSuccess('Status → confirmed');

        // Step 3-5: Assign and reject drivers (simulate re-match)
        for (let attempt = 1; attempt <= REMATCH_CONFIG.MAX_ATTEMPTS; attempt++) {
            printStep(2 + attempt, `มอบหมายคนขับครั้งที่ ${attempt}/${REMATCH_CONFIG.MAX_ATTEMPTS}`);
            await wait(CONFIG.stepDelay);

            // Get fresh booking data
            const booking = await bookingRef.get();
            const currentData = booking.data();

            // Select a driver that hasn't rejected yet
            const availableDriver = CONFIG.mockDrivers[attempt - 1];
            if (!availableDriver) {
                printWarning('No more mock drivers available');
                break;
            }

            printInfo(`Assigning driver: ${availableDriver.name}`);

            // Assign driver
            await bookingRef.update({
                status: 'driver_assigned',
                driver: {
                    driverId: availableDriver.id,
                    name: availableDriver.name,
                    phone: availableDriver.phone,
                    vehiclePlate: availableDriver.vehiclePlate,
                    vehicleModel: availableDriver.vehicleModel,
                    vehicleColor: availableDriver.vehicleColor,
                },
                matchAttempts: attempt,
                lastMatchAttemptAt: admin.firestore.Timestamp.now(),
                statusHistory: admin.firestore.FieldValue.arrayUnion({
                    status: 'driver_assigned',
                    timestamp: admin.firestore.Timestamp.now(),
                    note: `คนขับ: ${availableDriver.name}`,
                    updatedBy: 'system',
                }),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            printSuccess(`Driver assigned: ${availableDriver.name}`);
            assignedDrivers.push(availableDriver);

            // Wait a bit then simulate driver rejection (except last one)
            if (attempt < REMATCH_CONFIG.MAX_ATTEMPTS) {
                await wait(CONFIG.stepDelay);
                printInfo(`คนขับ ${availableDriver.name} ปฏิเสธงาน...`);

                // Get updated rejected drivers
                const updatedBooking = await bookingRef.get();
                const updatedData = updatedBooking.data();
                const currentRejectedDrivers = updatedData.rejectedDrivers || [];
                currentRejectedDrivers.push(availableDriver.id);

                // Simulate driver rejection
                await bookingRef.update({
                    status: 'confirmed',
                    driver: null,
                    rejectedDrivers: currentRejectedDrivers,
                    statusHistory: admin.firestore.FieldValue.arrayUnion({
                        status: 'confirmed',
                        timestamp: admin.firestore.Timestamp.now(),
                        note: 'คนขับปฏิเสธงาน - รอมอบหมายคนขับใหม่',
                        updatedBy: 'driver',
                        rejectedBy: availableDriver.id,
                    }),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                printWarning(`${c.yellow}Driver ${availableDriver.name} rejected${c.reset}`);
                printInfo(`rejectedDrivers: [${currentRejectedDrivers.join(', ')}]`);

                console.log(`\n   ${c.cyan}🔄 Simulating re-match delay (${REMATCH_CONFIG.DELAY_BETWEEN_MATCHES / 1000}s)...${c.reset}`);
                await wait(REMATCH_CONFIG.DELAY_BETWEEN_MATCHES);
            } else {
                // Last driver accepts
                await wait(CONFIG.stepDelay);
                printInfo(`คนขับ ${availableDriver.name} รับงาน...`);

                await bookingRef.update({
                    status: 'driver_en_route',
                    statusHistory: admin.firestore.FieldValue.arrayUnion({
                        status: 'driver_en_route',
                        timestamp: admin.firestore.Timestamp.now(),
                        note: 'คนขับรับงานแล้ว',
                        updatedBy: 'driver',
                    }),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                printSuccess(`${c.green}Driver ${availableDriver.name} accepted!${c.reset}`);
            }
        }

        // Verify final state
        printStep(6, 'ตรวจสอบผลลัพธ์');
        await wait(1000);

        const finalBooking = await bookingRef.get();
        const finalData = finalBooking.data();

        console.log(`\n   ${c.cyan}📊 Final Booking State:${c.reset}`);
        console.log(`   - Status: ${c.bright}${finalData.status}${c.reset}`);
        console.log(`   - Match Attempts: ${finalData.matchAttempts || 0}`);
        console.log(`   - Rejected Drivers: [${(finalData.rejectedDrivers || []).join(', ')}]`);
        console.log(`   - Current Driver: ${finalData.driver?.name || 'None'}`);
        console.log(`   - Status History Count: ${(finalData.statusHistory || []).length}`);

        // Cleanup
        printStep(7, 'Cleanup - ลบ booking ทดสอบ');
        await wait(1000);
        await bookingRef.delete();
        printSuccess('Test booking deleted');

        // Summary
        printHeader('✅ Test Complete!');
        console.log(`${c.green}Auto Re-match system is working correctly!${c.reset}`);
        console.log(`\n${c.cyan}Summary:${c.reset}`);
        console.log(`   - Assigned ${assignedDrivers.length} drivers`);
        console.log(`   - ${assignedDrivers.length - 1} rejections simulated`);
        console.log(`   - Final driver: ${assignedDrivers[assignedDrivers.length - 1]?.name || 'N/A'}`);

        console.log(`\n${c.yellow}💡 To test with UI:${c.reset}`);
        console.log('   1. Open http://localhost:3000/test-maps1 (Live Mode)');
        console.log('   2. Open http://localhost:3000/demo-driver (Login as driver)');
        console.log('   3. Create a booking and watch the re-match animation when driver rejects');

    } catch (error) {
        printError(`Test failed: ${error.message}`);
        console.error(error);

        // Cleanup on error
        if (testBookingId) {
            printWarning('Attempting cleanup...');
            try {
                await db.collection('bookings').doc(testBookingId).delete();
                printSuccess('Test booking deleted');
            } catch (e) {
                printError(`Cleanup failed: ${e.message}`);
            }
        }
        process.exit(1);
    }
}

main();
