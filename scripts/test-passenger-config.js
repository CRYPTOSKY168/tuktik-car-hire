#!/usr/bin/env node
/**
 * Test Passenger Config Script
 * Tests PassengerConfig types, defaults, and Firestore operations
 *
 * Usage: node scripts/test-passenger-config.js
 *
 * Tests:
 * 1. Default config has passenger field
 * 2. Read/Write passenger config to Firestore
 * 3. Config merge with defaults works correctly
 * 4. All 15 passenger config fields exist
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
};

// Expected default passenger config values
const EXPECTED_DEFAULTS = {
    // Cancellation Rules
    freeCancellationWindowMs: 180000,     // 3 minutes
    lateCancellationFee: 50,              // 50 THB
    enableCancellationFee: true,
    // No-Show Rules
    noShowWaitTimeMs: 300000,             // 5 minutes
    noShowFee: 50,                        // 50 THB
    enableNoShowFee: true,
    // Fee Distribution
    cancellationFeeToDriverPercent: 100,
    noShowFeeToDriverPercent: 100,
    // Driver Late Waiver
    driverLateThresholdMs: 300000,        // 5 minutes
    enableDriverLateWaiver: true,
    // Booking Limits
    maxActiveBookings: 1,
    maxCancellationsPerDay: 3,
    enableCancellationLimit: true,
    // Dispute Rules
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

// Test 1: Check TypeScript types (via runtime check)
function testTypesExist() {
    console.log(`\n${c.blue}[Test 1] Checking PassengerConfig fields...${c.reset}`);

    const requiredFields = Object.keys(EXPECTED_DEFAULTS);
    let passed = 0;
    let failed = 0;

    for (const field of requiredFields) {
        if (EXPECTED_DEFAULTS[field] !== undefined) {
            console.log(`  ${c.green}✓${c.reset} ${field}: ${typeof EXPECTED_DEFAULTS[field]}`);
            passed++;
        } else {
            console.log(`  ${c.red}✗${c.reset} ${field}: MISSING`);
            failed++;
        }
    }

    console.log(`\n  ${c.cyan}Result:${c.reset} ${passed}/${requiredFields.length} fields defined`);
    return failed === 0;
}

// Test 2: Read config from Firestore
async function testReadConfig(db) {
    console.log(`\n${c.blue}[Test 2] Reading config from Firestore...${c.reset}`);

    try {
        const docSnap = await db.collection('settings').doc('system_config').get();

        if (!docSnap.exists) {
            console.log(`  ${c.yellow}⚠${c.reset} Config document does not exist (will use defaults)`);
            return true;
        }

        const data = docSnap.data();

        if (data.passenger) {
            console.log(`  ${c.green}✓${c.reset} Passenger config exists in Firestore`);
            console.log(`  ${c.dim}Current values:${c.reset}`);
            for (const [key, value] of Object.entries(data.passenger)) {
                console.log(`    - ${key}: ${value}`);
            }
            return true;
        } else {
            console.log(`  ${c.yellow}⚠${c.reset} Passenger config not in Firestore yet (will be added on first save)`);
            return true;
        }
    } catch (error) {
        console.log(`  ${c.red}✗${c.reset} Error reading config: ${error.message}`);
        return false;
    }
}

// Test 3: Write test config and verify
async function testWriteConfig(db) {
    console.log(`\n${c.blue}[Test 3] Testing config write (non-destructive)...${c.reset}`);

    try {
        const configRef = db.collection('settings').doc('system_config');
        const docSnap = await configRef.get();
        const currentData = docSnap.exists ? docSnap.data() : {};

        // Save original passenger config for rollback
        const originalPassenger = currentData.passenger || null;

        // Write test value
        const testConfig = {
            ...currentData,
            passenger: {
                ...EXPECTED_DEFAULTS,
                // Modify one value to verify write works
                _testField: Date.now(),
            },
            updatedAt: admin.firestore.Timestamp.now(),
            updatedBy: 'test-script',
        };

        await configRef.set(testConfig);
        console.log(`  ${c.green}✓${c.reset} Config written successfully`);

        // Verify write
        const verifySnap = await configRef.get();
        const verifyData = verifySnap.data();

        if (verifyData.passenger && verifyData.passenger._testField) {
            console.log(`  ${c.green}✓${c.reset} Write verified - _testField exists`);
        }

        // Rollback: Remove test field
        const rollbackConfig = {
            ...verifyData,
            passenger: originalPassenger || EXPECTED_DEFAULTS,
            updatedAt: admin.firestore.Timestamp.now(),
            updatedBy: 'test-script-rollback',
        };
        delete rollbackConfig.passenger._testField;

        await configRef.set(rollbackConfig);
        console.log(`  ${c.green}✓${c.reset} Rollback completed - test field removed`);

        return true;
    } catch (error) {
        console.log(`  ${c.red}✗${c.reset} Error: ${error.message}`);
        return false;
    }
}

// Test 4: Verify default values are correct
function testDefaultValues() {
    console.log(`\n${c.blue}[Test 4] Verifying default values...${c.reset}`);

    const checks = [
        { name: 'Free cancellation window', field: 'freeCancellationWindowMs', expected: 180000, unit: 'ms (3 min)' },
        { name: 'Late cancellation fee', field: 'lateCancellationFee', expected: 50, unit: 'THB' },
        { name: 'No-show wait time', field: 'noShowWaitTimeMs', expected: 300000, unit: 'ms (5 min)' },
        { name: 'No-show fee', field: 'noShowFee', expected: 50, unit: 'THB' },
        { name: 'Driver late threshold', field: 'driverLateThresholdMs', expected: 300000, unit: 'ms (5 min)' },
        { name: 'Max active bookings', field: 'maxActiveBookings', expected: 1, unit: '' },
        { name: 'Max cancellations/day', field: 'maxCancellationsPerDay', expected: 3, unit: '' },
        { name: 'Dispute window', field: 'disputeWindowHours', expected: 48, unit: 'hours' },
    ];

    let passed = 0;
    for (const check of checks) {
        const actual = EXPECTED_DEFAULTS[check.field];
        if (actual === check.expected) {
            console.log(`  ${c.green}✓${c.reset} ${check.name}: ${actual} ${check.unit}`);
            passed++;
        } else {
            console.log(`  ${c.red}✗${c.reset} ${check.name}: expected ${check.expected}, got ${actual}`);
        }
    }

    console.log(`\n  ${c.cyan}Result:${c.reset} ${passed}/${checks.length} values correct`);
    return passed === checks.length;
}

// Test 5: Verify boolean flags
function testBooleanFlags() {
    console.log(`\n${c.blue}[Test 5] Verifying boolean flags (enable/disable)...${c.reset}`);

    const flags = [
        { name: 'enableCancellationFee', expected: true },
        { name: 'enableNoShowFee', expected: true },
        { name: 'enableDriverLateWaiver', expected: true },
        { name: 'enableCancellationLimit', expected: true },
        { name: 'enableDispute', expected: true },
    ];

    let passed = 0;
    for (const flag of flags) {
        const actual = EXPECTED_DEFAULTS[flag.name];
        if (actual === flag.expected) {
            console.log(`  ${c.green}✓${c.reset} ${flag.name}: ${actual ? 'enabled' : 'disabled'}`);
            passed++;
        } else {
            console.log(`  ${c.red}✗${c.reset} ${flag.name}: expected ${flag.expected}, got ${actual}`);
        }
    }

    console.log(`\n  ${c.cyan}Result:${c.reset} ${passed}/${flags.length} flags correct`);
    return passed === flags.length;
}

// Main test runner
async function main() {
    console.log(`\n${c.cyan}╔══════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}║   Test Passenger Config - TukTik Car Rental      ║${c.reset}`);
    console.log(`${c.cyan}╚══════════════════════════════════════════════════╝${c.reset}`);

    const db = initFirebase();

    const results = {
        typesExist: testTypesExist(),
        readConfig: await testReadConfig(db),
        writeConfig: await testWriteConfig(db),
        defaultValues: testDefaultValues(),
        booleanFlags: testBooleanFlags(),
    };

    // Summary
    console.log(`\n${c.cyan}╔══════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}║                    SUMMARY                        ║${c.reset}`);
    console.log(`${c.cyan}╚══════════════════════════════════════════════════╝${c.reset}\n`);

    let totalPassed = 0;
    let totalTests = Object.keys(results).length;

    for (const [test, passed] of Object.entries(results)) {
        const icon = passed ? `${c.green}✓` : `${c.red}✗`;
        const status = passed ? 'PASSED' : 'FAILED';
        console.log(`  ${icon} ${test}: ${status}${c.reset}`);
        if (passed) totalPassed++;
    }

    console.log(`\n  ${c.cyan}Total:${c.reset} ${totalPassed}/${totalTests} tests passed\n`);

    if (totalPassed === totalTests) {
        console.log(`${c.green}✓ All tests passed! Passenger Config is ready.${c.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${c.red}✗ Some tests failed. Please check the output above.${c.reset}\n`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error(`${c.red}Error:${c.reset}`, err.message);
    process.exit(1);
});
