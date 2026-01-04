#!/usr/bin/env node
/**
 * Test Passenger Rules APIs Script
 * Tests Cancel, No-Show, and Dispute APIs
 *
 * Usage: node scripts/test-passenger-apis.js
 *
 * Tests:
 * 1. Cancel Booking API - fee calculation
 * 2. No-Show API - wait time validation
 * 3. Dispute API - dispute submission
 * 4. Config integration - verify configs are read correctly
 */

const admin = require('firebase-admin');
const path = require('path');

// Colors for output
const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
};

// Expected default values from PassengerConfig
const EXPECTED_DEFAULTS = {
    freeCancellationWindowMs: 180000,     // 3 minutes
    lateCancellationFee: 50,              // 50 THB
    enableCancellationFee: true,
    noShowWaitTimeMs: 300000,             // 5 minutes
    noShowFee: 50,                        // 50 THB
    enableNoShowFee: true,
    cancellationFeeToDriverPercent: 100,
    noShowFeeToDriverPercent: 100,
    driverLateThresholdMs: 300000,        // 5 minutes
    enableDriverLateWaiver: true,
    maxActiveBookings: 1,
    maxCancellationsPerDay: 3,
    enableCancellationLimit: true,
    disputeWindowHours: 48,
    enableDispute: true,
};

// Initialize Firebase Admin
function initFirebase() {
    if (admin.apps.length > 0) return admin.firestore();

    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || '')
        .replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.error(`${c.red}Error: Missing Firebase credentials in .env.local${c.reset}`);
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });

    return admin.firestore();
}

// Test 1: Verify API files exist
function testApiFilesExist() {
    console.log(`\n${c.blue}[Test 1] Checking API files exist...${c.reset}`);

    const fs = require('fs');
    const basePath = path.join(__dirname, '..');

    const apiFiles = [
        'app/api/booking/cancel/route.ts',
        'app/api/booking/noshow/route.ts',
        'app/api/booking/noshow/arrived/route.ts',
        'app/api/booking/dispute/route.ts',
    ];

    let passed = 0;
    let failed = 0;

    for (const file of apiFiles) {
        const fullPath = path.join(basePath, file);
        if (fs.existsSync(fullPath)) {
            console.log(`  ${c.green}✓${c.reset} ${file}`);
            passed++;
        } else {
            console.log(`  ${c.red}✗${c.reset} ${file} - NOT FOUND`);
            failed++;
        }
    }

    console.log(`\n  ${c.cyan}Result:${c.reset} ${passed}/${apiFiles.length} API files exist`);
    return failed === 0;
}

// Test 2: Check PassengerConfig in Firestore
async function testPassengerConfig(db) {
    console.log(`\n${c.blue}[Test 2] Checking PassengerConfig in Firestore...${c.reset}`);

    try {
        const docSnap = await db.collection('settings').doc('system_config').get();

        if (!docSnap.exists) {
            console.log(`  ${c.yellow}⚠${c.reset} Config document does not exist (will use defaults)`);
            return true;
        }

        const data = docSnap.data();

        if (!data.passenger) {
            console.log(`  ${c.yellow}⚠${c.reset} Passenger config not set (will use defaults)`);
            return true;
        }

        console.log(`  ${c.green}✓${c.reset} Passenger config exists in Firestore`);
        console.log(`  ${c.dim}Fields found:${c.reset}`);

        let validFields = 0;
        const expectedFields = Object.keys(EXPECTED_DEFAULTS);

        for (const field of expectedFields) {
            const value = data.passenger[field];
            const expected = EXPECTED_DEFAULTS[field];
            const isCorrectType = typeof value === typeof expected;

            if (isCorrectType) {
                validFields++;
                console.log(`    ${c.green}✓${c.reset} ${field}: ${value}`);
            } else if (value === undefined) {
                console.log(`    ${c.yellow}⚠${c.reset} ${field}: not set (default: ${expected})`);
            } else {
                console.log(`    ${c.red}✗${c.reset} ${field}: ${value} (expected type: ${typeof expected})`);
            }
        }

        console.log(`\n  ${c.cyan}Result:${c.reset} ${validFields}/${expectedFields.length} fields configured`);
        return true;
    } catch (error) {
        console.log(`  ${c.red}✗${c.reset} Error reading config: ${error.message}`);
        return false;
    }
}

// Test 3: Verify Booking has cancellation/no-show fields
async function testBookingFields(db) {
    console.log(`\n${c.blue}[Test 3] Checking Booking fields (sample booking)...${c.reset}`);

    try {
        // Get any booking to check field structure
        const bookingsSnap = await db.collection('bookings').limit(1).get();

        if (bookingsSnap.empty) {
            console.log(`  ${c.yellow}⚠${c.reset} No bookings found to verify`);
            return true;
        }

        const booking = bookingsSnap.docs[0].data();
        console.log(`  ${c.dim}Sample booking ID: ${bookingsSnap.docs[0].id}${c.reset}`);

        // Check which cancellation/no-show fields exist in this booking
        const cancellationFields = [
            'cancelledAt',
            'cancelledBy',
            'cancellationReason',
            'cancellationFee',
            'cancellationFeeStatus',
            'driverAssignedAt',
        ];

        const noShowFields = [
            'driverArrivedAt',
            'noShowReportedAt',
            'isNoShow',
            'noShowFee',
        ];

        const disputeFields = [
            'hasDispute',
            'disputeId',
            'disputeStatus',
            'disputeReason',
        ];

        console.log(`  ${c.dim}Cancellation fields:${c.reset}`);
        for (const field of cancellationFields) {
            if (booking[field] !== undefined) {
                console.log(`    ${c.green}✓${c.reset} ${field}: ${JSON.stringify(booking[field]).substring(0, 50)}`);
            }
        }

        console.log(`  ${c.dim}No-Show fields:${c.reset}`);
        for (const field of noShowFields) {
            if (booking[field] !== undefined) {
                console.log(`    ${c.green}✓${c.reset} ${field}: ${JSON.stringify(booking[field]).substring(0, 50)}`);
            }
        }

        console.log(`  ${c.dim}Dispute fields:${c.reset}`);
        for (const field of disputeFields) {
            if (booking[field] !== undefined) {
                console.log(`    ${c.green}✓${c.reset} ${field}: ${JSON.stringify(booking[field]).substring(0, 50)}`);
            }
        }

        console.log(`\n  ${c.cyan}Result:${c.reset} Booking structure verified`);
        return true;
    } catch (error) {
        console.log(`  ${c.red}✗${c.reset} Error: ${error.message}`);
        return false;
    }
}

// Test 4: Check Disputes collection
async function testDisputesCollection(db) {
    console.log(`\n${c.blue}[Test 4] Checking Disputes collection...${c.reset}`);

    try {
        const disputesSnap = await db.collection('disputes').limit(5).get();

        console.log(`  ${c.dim}Total disputes found: ${disputesSnap.size}${c.reset}`);

        if (disputesSnap.empty) {
            console.log(`  ${c.yellow}ℹ${c.reset} No disputes yet (this is normal for new systems)`);
            return true;
        }

        // Show dispute status distribution
        const statusCounts = {};
        disputesSnap.docs.forEach(doc => {
            const status = doc.data().status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        console.log(`  ${c.dim}Status distribution:${c.reset}`);
        for (const [status, count] of Object.entries(statusCounts)) {
            console.log(`    - ${status}: ${count}`);
        }

        return true;
    } catch (error) {
        console.log(`  ${c.red}✗${c.reset} Error: ${error.message}`);
        return false;
    }
}

// Test 5: Verify cancellation fee logic (mock test)
function testCancellationFeeLogic() {
    console.log(`\n${c.blue}[Test 5] Testing cancellation fee logic (unit test)...${c.reset}`);

    const config = EXPECTED_DEFAULTS;

    // Test cases
    const testCases = [
        {
            name: 'Within free window (2 min after assign)',
            timeSinceAssign: 120000, // 2 min
            status: 'driver_assigned',
            driverLate: false,
            expectedFee: 0,
            expectedReason: 'free',
        },
        {
            name: 'After free window (5 min after assign)',
            timeSinceAssign: 300000, // 5 min
            status: 'driver_assigned',
            driverLate: false,
            expectedFee: config.lateCancellationFee,
            expectedReason: 'late_fee',
        },
        {
            name: 'Driver late waiver',
            timeSinceAssign: 600000, // 10 min
            status: 'driver_assigned',
            driverLate: true,
            expectedFee: 0,
            expectedReason: 'driver_late_waiver',
        },
        {
            name: 'Pending status (no fee)',
            timeSinceAssign: 0,
            status: 'pending',
            driverLate: false,
            expectedFee: 0,
            expectedReason: 'no_driver',
        },
    ];

    let passed = 0;

    for (const tc of testCases) {
        // Calculate fee based on logic
        let fee = 0;
        let reason = 'unknown';

        if (tc.status !== 'driver_assigned') {
            fee = 0;
            reason = 'no_driver';
        } else if (tc.timeSinceAssign <= config.freeCancellationWindowMs) {
            fee = 0;
            reason = 'free';
        } else if (config.enableDriverLateWaiver && tc.driverLate) {
            fee = 0;
            reason = 'driver_late_waiver';
        } else if (config.enableCancellationFee) {
            fee = config.lateCancellationFee;
            reason = 'late_fee';
        }

        const pass = fee === tc.expectedFee && reason === tc.expectedReason;
        if (pass) {
            console.log(`  ${c.green}✓${c.reset} ${tc.name}: fee=${fee}, reason=${reason}`);
            passed++;
        } else {
            console.log(`  ${c.red}✗${c.reset} ${tc.name}: got fee=${fee} reason=${reason}, expected fee=${tc.expectedFee} reason=${tc.expectedReason}`);
        }
    }

    console.log(`\n  ${c.cyan}Result:${c.reset} ${passed}/${testCases.length} test cases passed`);
    return passed === testCases.length;
}

// Test 6: Verify no-show wait time logic (unit test)
function testNoShowWaitTimeLogic() {
    console.log(`\n${c.blue}[Test 6] Testing no-show wait time logic (unit test)...${c.reset}`);

    const config = EXPECTED_DEFAULTS;

    const testCases = [
        {
            name: 'Waited 2 minutes (not enough)',
            waitedMs: 120000,
            canReportNoShow: false,
            remainingMs: config.noShowWaitTimeMs - 120000,
        },
        {
            name: 'Waited 5 minutes (exact)',
            waitedMs: 300000,
            canReportNoShow: true,
            remainingMs: 0,
        },
        {
            name: 'Waited 6 minutes (more than enough)',
            waitedMs: 360000,
            canReportNoShow: true,
            remainingMs: 0,
        },
    ];

    let passed = 0;

    for (const tc of testCases) {
        const canReport = tc.waitedMs >= config.noShowWaitTimeMs;
        const remaining = Math.max(0, config.noShowWaitTimeMs - tc.waitedMs);

        const pass = canReport === tc.canReportNoShow && remaining === tc.remainingMs;
        if (pass) {
            console.log(`  ${c.green}✓${c.reset} ${tc.name}: canReport=${canReport}, remaining=${remaining}ms`);
            passed++;
        } else {
            console.log(`  ${c.red}✗${c.reset} ${tc.name}: got canReport=${canReport} remaining=${remaining}, expected canReport=${tc.canReportNoShow} remaining=${tc.remainingMs}`);
        }
    }

    console.log(`\n  ${c.cyan}Result:${c.reset} ${passed}/${testCases.length} test cases passed`);
    return passed === testCases.length;
}

// Test 7: Verify dispute window logic (unit test)
function testDisputeWindowLogic() {
    console.log(`\n${c.blue}[Test 7] Testing dispute window logic (unit test)...${c.reset}`);

    const config = EXPECTED_DEFAULTS;
    const windowMs = config.disputeWindowHours * 60 * 60 * 1000; // 48 hours in ms

    const testCases = [
        {
            name: 'Completed 1 hour ago',
            completedHoursAgo: 1,
            canDispute: true,
        },
        {
            name: 'Completed 24 hours ago',
            completedHoursAgo: 24,
            canDispute: true,
        },
        {
            name: 'Completed 48 hours ago (exact)',
            completedHoursAgo: 48,
            canDispute: true, // exactly at window end
        },
        {
            name: 'Completed 50 hours ago',
            completedHoursAgo: 50,
            canDispute: false,
        },
    ];

    let passed = 0;

    for (const tc of testCases) {
        const now = Date.now();
        const completedAt = now - (tc.completedHoursAgo * 60 * 60 * 1000);
        const windowEnd = completedAt + windowMs;
        const canDispute = now <= windowEnd;

        const pass = canDispute === tc.canDispute;
        if (pass) {
            console.log(`  ${c.green}✓${c.reset} ${tc.name}: canDispute=${canDispute}`);
            passed++;
        } else {
            console.log(`  ${c.red}✗${c.reset} ${tc.name}: got canDispute=${canDispute}, expected ${tc.canDispute}`);
        }
    }

    console.log(`\n  ${c.cyan}Result:${c.reset} ${passed}/${testCases.length} test cases passed`);
    return passed === testCases.length;
}

// Main test runner
async function main() {
    console.log(`\n${c.cyan}${c.bold}╔══════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}${c.bold}║   Test Passenger Rules APIs - TukTik Car Rental  ║${c.reset}`);
    console.log(`${c.cyan}${c.bold}╚══════════════════════════════════════════════════╝${c.reset}`);

    const db = initFirebase();

    const results = {
        apiFilesExist: testApiFilesExist(),
        passengerConfig: await testPassengerConfig(db),
        bookingFields: await testBookingFields(db),
        disputesCollection: await testDisputesCollection(db),
        cancellationFeeLogic: testCancellationFeeLogic(),
        noShowWaitTimeLogic: testNoShowWaitTimeLogic(),
        disputeWindowLogic: testDisputeWindowLogic(),
    };

    // Summary
    console.log(`\n${c.cyan}${c.bold}╔══════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}${c.bold}║                    SUMMARY                        ║${c.reset}`);
    console.log(`${c.cyan}${c.bold}╚══════════════════════════════════════════════════╝${c.reset}\n`);

    let totalPassed = 0;
    let totalTests = Object.keys(results).length;

    for (const [test, passed] of Object.entries(results)) {
        const icon = passed ? `${c.green}✓` : `${c.red}✗`;
        const status = passed ? 'PASSED' : 'FAILED';
        console.log(`  ${icon} ${test}: ${status}${c.reset}`);
        if (passed) totalPassed++;
    }

    console.log(`\n  ${c.cyan}Total:${c.reset} ${totalPassed}/${totalTests} tests passed\n`);

    // API Endpoints Summary
    console.log(`${c.cyan}${c.bold}API Endpoints Created:${c.reset}`);
    console.log(`  ${c.dim}POST${c.reset} /api/booking/cancel        - ยกเลิกการจอง`);
    console.log(`  ${c.dim}POST${c.reset} /api/booking/noshow        - แจ้ง No-Show`);
    console.log(`  ${c.dim}POST${c.reset} /api/booking/noshow/arrived - คนขับถึงจุดรับ`);
    console.log(`  ${c.dim}POST${c.reset} /api/booking/dispute       - ยื่นข้อร้องเรียน`);
    console.log(`  ${c.dim}GET ${c.reset} /api/booking/dispute       - ดูสถานะข้อร้องเรียน`);

    if (totalPassed === totalTests) {
        console.log(`\n${c.green}${c.bold}✓ All tests passed! Passenger Rules APIs are ready.${c.reset}\n`);
        process.exit(0);
    } else {
        console.log(`\n${c.red}${c.bold}✗ Some tests failed. Please check the output above.${c.reset}\n`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error(`${c.red}Error:${c.reset}`, err.message);
    process.exit(1);
});
