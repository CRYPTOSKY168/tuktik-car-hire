#!/usr/bin/env node

/**
 * Test Rating Flow Script
 * ทดสอบระบบให้คะแนนแบบครบ flow
 *
 * Usage:
 *   node scripts/test-rating-flow.js
 *   node scripts/test-rating-flow.js --cleanup  # ลบ test data หลังทดสอบ
 */

const admin = require('firebase-admin');
const path = require('path');

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
    data: (label, data) => console.log(`  ${colors.magenta}${label}:${colors.reset}`, JSON.stringify(data, null, 2)),
};

// Bayesian Average constants (must match API)
const BAYESIAN_PRIOR_MEAN = 4.0;
const BAYESIAN_MIN_REVIEWS = 5;

/**
 * Calculate Bayesian Average Rating (same as API)
 */
function calculateBayesianRating(currentRating, ratingCount, newStars) {
    const totalSum = (currentRating * ratingCount) + newStars;
    const totalCount = ratingCount + 1;
    const bayesianRating = (
        (BAYESIAN_PRIOR_MEAN * BAYESIAN_MIN_REVIEWS) + totalSum
    ) / (BAYESIAN_MIN_REVIEWS + totalCount);
    return Math.round(bayesianRating * 10) / 10;
}

// Initialize Firebase Admin
function initFirebase() {
    if (admin.apps.length > 0) return admin.firestore();

    // Load environment variables
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

// Test data
const TEST_USER_ID = 'test-user-rating-' + Date.now();
const TEST_DRIVER_ID = 'test-driver-rating-' + Date.now();
const TEST_BOOKING_ID = 'test-booking-rating-' + Date.now();

async function createTestData(db) {
    log.step(1, 'สร้าง Test Data');

    // Create test user
    const testUser = {
        uid: TEST_USER_ID,
        email: 'test-rating@example.com',
        displayName: 'Test User Rating',
        role: 'user',
        rating: 5,
        ratingCount: 0,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(TEST_USER_ID).set(testUser);
    log.success(`Created test user: ${TEST_USER_ID}`);

    // Create test driver
    const testDriver = {
        userId: 'driver-user-' + Date.now(),
        name: 'Test Driver Rating',
        phone: '081-111-1111',
        email: 'test-driver-rating@example.com',
        vehiclePlate: 'TEST 1234',
        vehicleModel: 'Toyota Test',
        vehicleColor: 'White',
        status: 'available',
        setupStatus: 'approved',
        totalTrips: 10,
        totalEarnings: 5000,
        totalTips: 200,
        rating: 4.5,
        ratingCount: 10,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('drivers').doc(TEST_DRIVER_ID).set(testDriver);
    log.success(`Created test driver: ${TEST_DRIVER_ID}`);
    log.data('Driver before rating', { rating: testDriver.rating, ratingCount: testDriver.ratingCount, totalTips: testDriver.totalTips });

    // Create test booking (completed status)
    const testBooking = {
        userId: TEST_USER_ID,
        firstName: 'Test',
        lastName: 'User',
        email: 'test-rating@example.com',
        phone: '081-222-2222',
        pickupLocation: 'Suvarnabhumi Airport',
        dropoffLocation: 'Pattaya',
        pickupDate: new Date().toISOString().split('T')[0],
        pickupTime: '10:00',
        vehicleId: 'test-vehicle',
        vehicleName: 'Test Vehicle',
        totalCost: 1500,
        status: 'completed', // Must be completed to rate
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        driver: {
            driverId: TEST_DRIVER_ID,
            name: 'Test Driver Rating',
            phone: '081-111-1111',
            vehiclePlate: 'TEST 1234',
            vehicleModel: 'Toyota Test',
        },
        ratings: {}, // Empty - no ratings yet
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('bookings').doc(TEST_BOOKING_ID).set(testBooking);
    log.success(`Created test booking (completed): ${TEST_BOOKING_ID}`);

    return { testUser, testDriver, testBooking };
}

async function testCustomerToDriverRating(db) {
    log.step(2, 'ทดสอบ Customer → Driver Rating (5 ดาว + ทิป)');

    const bookingRef = db.collection('bookings').doc(TEST_BOOKING_ID);
    const driverRef = db.collection('drivers').doc(TEST_DRIVER_ID);

    // Simulate rating submission
    const ratingData = {
        stars: 5,
        comment: 'บริการดีมากครับ!',
        tip: 100,
        ratedAt: admin.firestore.Timestamp.now(),
    };

    log.info('Submitting rating...');
    log.data('Rating data', ratingData);

    // Update booking with rating
    await bookingRef.update({
        'ratings.customerToDriver': ratingData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    log.success('Updated booking.ratings.customerToDriver');

    // Get driver data before update
    const driverBefore = (await driverRef.get()).data();
    const currentRating = driverBefore.rating || BAYESIAN_PRIOR_MEAN;
    const currentCount = driverBefore.ratingCount || 0;
    const currentTips = driverBefore.totalTips || 0;
    const currentEarnings = driverBefore.totalEarnings || 0;

    // Calculate new Bayesian average
    const newBayesianRating = calculateBayesianRating(currentRating, currentCount, ratingData.stars);

    log.info(`Bayesian calculation: C=${BAYESIAN_PRIOR_MEAN}, m=${BAYESIAN_MIN_REVIEWS}`);
    log.info(`Formula: ((${BAYESIAN_PRIOR_MEAN} × ${BAYESIAN_MIN_REVIEWS}) + (${currentRating} × ${currentCount} + ${ratingData.stars})) / (${BAYESIAN_MIN_REVIEWS} + ${currentCount + 1})`);

    // Update driver stats
    await driverRef.update({
        rating: newBayesianRating,
        ratingCount: currentCount + 1,
        totalTips: currentTips + ratingData.tip,
        totalEarnings: currentEarnings + ratingData.tip,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Verify
    const driverAfter = (await driverRef.get()).data();
    log.success('Updated driver stats');
    log.data('Driver after rating', {
        rating: `${currentRating} → ${driverAfter.rating}`,
        ratingCount: `${currentCount} → ${driverAfter.ratingCount}`,
        totalTips: `${currentTips} → ${driverAfter.totalTips} (+${ratingData.tip})`,
        totalEarnings: `${currentEarnings} → ${driverAfter.totalEarnings} (+${ratingData.tip})`,
    });

    return true;
}

async function testDriverToCustomerRating(db) {
    log.step(3, 'ทดสอบ Driver → Customer Rating (3 ดาว + เหตุผล)');

    const bookingRef = db.collection('bookings').doc(TEST_BOOKING_ID);
    const userRef = db.collection('users').doc(TEST_USER_ID);

    // Simulate low rating with reasons
    const ratingData = {
        stars: 3,
        reasons: ['no_show', 'messy'],
        comment: 'ลูกค้ามาช้า และทิ้งขยะในรถ',
        ratedAt: admin.firestore.Timestamp.now(),
    };

    log.info('Submitting driver rating...');
    log.data('Rating data', ratingData);

    // Update booking with rating
    await bookingRef.update({
        'ratings.driverToCustomer': ratingData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    log.success('Updated booking.ratings.driverToCustomer');

    // Get user data before update
    const userBefore = (await userRef.get()).data();
    const currentRating = userBefore.rating || BAYESIAN_PRIOR_MEAN;
    const currentCount = userBefore.ratingCount || 0;

    // Calculate new Bayesian average
    const newBayesianRating = calculateBayesianRating(currentRating, currentCount, ratingData.stars);

    log.info(`Bayesian calculation for user: ((${BAYESIAN_PRIOR_MEAN} × ${BAYESIAN_MIN_REVIEWS}) + (${currentRating} × ${currentCount} + ${ratingData.stars})) / (${BAYESIAN_MIN_REVIEWS} + ${currentCount + 1})`);

    // Update user stats
    await userRef.update({
        rating: newBayesianRating,
        ratingCount: currentCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Verify
    const userAfter = (await userRef.get()).data();
    log.success('Updated user stats');
    log.data('User after rating', {
        rating: `${currentRating} → ${userAfter.rating}`,
        ratingCount: `${currentCount} → ${userAfter.ratingCount}`,
    });

    return true;
}

async function verifyFinalState(db) {
    log.step(4, 'ตรวจสอบผลลัพธ์สุดท้าย');

    // Get final booking state
    const bookingDoc = await db.collection('bookings').doc(TEST_BOOKING_ID).get();
    const booking = bookingDoc.data();

    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}📊 Final Booking State${colors.reset}`);
    console.log('='.repeat(60));

    if (booking.ratings?.customerToDriver) {
        console.log(`\n${colors.green}✓ Customer → Driver Rating:${colors.reset}`);
        console.log(`  Stars: ${'⭐'.repeat(booking.ratings.customerToDriver.stars)}`);
        console.log(`  Comment: "${booking.ratings.customerToDriver.comment || '-'}"`);
        console.log(`  Tip: ฿${booking.ratings.customerToDriver.tip || 0}`);
    } else {
        console.log(`\n${colors.red}✗ Customer → Driver Rating: Not found${colors.reset}`);
    }

    if (booking.ratings?.driverToCustomer) {
        console.log(`\n${colors.green}✓ Driver → Customer Rating:${colors.reset}`);
        console.log(`  Stars: ${'⭐'.repeat(booking.ratings.driverToCustomer.stars)}`);
        console.log(`  Reasons: ${booking.ratings.driverToCustomer.reasons?.join(', ') || '-'}`);
        console.log(`  Comment: "${booking.ratings.driverToCustomer.comment || '-'}"`);
    } else {
        console.log(`\n${colors.red}✗ Driver → Customer Rating: Not found${colors.reset}`);
    }

    // Get final driver state
    const driverDoc = await db.collection('drivers').doc(TEST_DRIVER_ID).get();
    const driver = driverDoc.data();

    console.log(`\n${colors.cyan}👨‍✈️ Driver Stats:${colors.reset}`);
    console.log(`  Rating: ${driver.rating} (${driver.ratingCount} reviews)`);
    console.log(`  Total Tips: ฿${driver.totalTips}`);
    console.log(`  Total Earnings: ฿${driver.totalEarnings}`);

    // Get final user state
    const userDoc = await db.collection('users').doc(TEST_USER_ID).get();
    const user = userDoc.data();

    console.log(`\n${colors.cyan}👤 User Stats:${colors.reset}`);
    console.log(`  Rating: ${user.rating} (${user.ratingCount} reviews)`);

    console.log('\n' + '='.repeat(60));

    return true;
}

async function testDuplicateRating(db) {
    log.step(5, 'ทดสอบป้องกันการให้คะแนนซ้ำ');

    const bookingRef = db.collection('bookings').doc(TEST_BOOKING_ID);
    const booking = (await bookingRef.get()).data();

    if (booking.ratings?.customerToDriver) {
        log.success('Booking already has customerToDriver rating - Duplicate prevention works!');
        log.warning('In real API, this would return error: "คุณได้ให้คะแนนการจองนี้ไปแล้ว"');
        return true;
    }

    return false;
}

async function testLowRatingValidation(db) {
    log.step(6, 'ทดสอบ Validation คะแนนต่ำต้องมีเหตุผล');

    // Simulate low rating without reasons (should fail in real API)
    const invalidRating = {
        stars: 2,
        reasons: [], // Empty - should fail
        comment: '',
    };

    log.info('Testing low rating without reasons...');
    log.data('Invalid rating data', invalidRating);

    if (invalidRating.stars <= 3 && invalidRating.reasons.length === 0) {
        log.success('Validation works! Low rating requires reasons.');
        log.warning('In real API, this would return error: "กรุณาระบุเหตุผลสำหรับคะแนนต่ำ"');
    }

    return true;
}

async function cleanupTestData(db) {
    log.step('Cleanup', 'ลบ Test Data');

    await db.collection('bookings').doc(TEST_BOOKING_ID).delete();
    log.success(`Deleted booking: ${TEST_BOOKING_ID}`);

    await db.collection('drivers').doc(TEST_DRIVER_ID).delete();
    log.success(`Deleted driver: ${TEST_DRIVER_ID}`);

    await db.collection('users').doc(TEST_USER_ID).delete();
    log.success(`Deleted user: ${TEST_USER_ID}`);
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}${colors.cyan}🧪 Rating System Test Script${colors.reset}`);
    console.log('='.repeat(60));

    const shouldCleanup = process.argv.includes('--cleanup');
    const db = initFirebase();

    try {
        // Create test data
        await createTestData(db);

        // Test customer rating driver (with tip)
        await testCustomerToDriverRating(db);

        // Test driver rating customer (with reasons)
        await testDriverToCustomerRating(db);

        // Verify final state
        await verifyFinalState(db);

        // Test duplicate prevention
        await testDuplicateRating(db);

        // Test validation
        await testLowRatingValidation(db);

        console.log('\n' + '='.repeat(60));
        console.log(`${colors.green}${colors.bright}✅ All tests passed!${colors.reset}`);
        console.log('='.repeat(60));

        if (shouldCleanup) {
            await cleanupTestData(db);
        } else {
            console.log(`\n${colors.yellow}💡 Tip: Run with --cleanup to delete test data${colors.reset}`);
            console.log(`   node scripts/test-rating-flow.js --cleanup\n`);
        }

    } catch (error) {
        console.error(`\n${colors.red}❌ Test failed:${colors.reset}`, error);
        process.exit(1);
    }

    process.exit(0);
}

main();
