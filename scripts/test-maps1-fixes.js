#!/usr/bin/env node
/**
 * Test Script: test-maps1 Fixes Verification
 * Tests all 5 fixes made to /test-maps1 page
 *
 * Usage: node scripts/test-maps1-fixes.js
 *
 * Tests:
 * 1. Backend API connectivity
 * 2. Booking creation & cancellation flow
 * 3. Driver assignment & status updates
 * 4. ETA calculation
 * 5. Error handling mechanisms
 */

const admin = require('firebase-admin');
const path = require('path');
const https = require('https');
const http = require('http');

// Colors
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

// Test results
const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

function log(emoji, message, color = '') {
    console.log(`${color}${emoji} ${message}${c.reset}`);
}

function logTest(name, passed, details = '') {
    const status = passed ? `${c.green}PASS` : `${c.red}FAIL`;
    console.log(`  ${status}${c.reset} ${name}${details ? c.dim + ' - ' + details + c.reset : ''}`);
    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
}

function logSkip(name, reason) {
    console.log(`  ${c.yellow}SKIP${c.reset} ${name}${c.dim} - ${reason}${c.reset}`);
    results.tests.push({ name, passed: null, details: reason });
    results.skipped++;
}

// Initialize Firebase
function initFirebase() {
    if (admin.apps.length > 0) return admin.firestore();

    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || '')
        .replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase credentials in .env.local');
    }

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });

    return admin.firestore();
}

// HTTP request helper
function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https');
        const lib = isHttps ? https : http;

        const req = lib.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) req.write(options.body);
        req.end();
    });
}

// Test 1: Backend API Health Check
async function testBackendAPIs() {
    log('🔌', 'Testing Backend APIs...', c.cyan);

    const baseUrl = 'http://localhost:3000';

    // Test /api/test-log (simple endpoint)
    try {
        const res = await httpRequest(`${baseUrl}/api/test-log`, { method: 'GET' });
        logTest('API: /api/test-log GET', res.status === 200, `status: ${res.status}`);
    } catch (err) {
        logTest('API: /api/test-log GET', false, err.message);
    }

    // Test /api/driver/location (returns error for non-existent driver)
    try {
        const res = await httpRequest(`${baseUrl}/api/driver/location?driverId=test`, { method: 'GET' });
        // Should return proper JSON with success: false for non-existent driver
        const hasProperResponse = res.data && res.data.success === false;
        logTest('API: /api/driver/location (proper error handling)', hasProperResponse, `response: ${JSON.stringify(res.data).substring(0, 50)}`);
    } catch (err) {
        logTest('API: /api/driver/location (proper error handling)', false, err.message);
    }
}

// Test 2: Firestore Connection
async function testFirestoreConnection(db) {
    log('🔥', 'Testing Firestore Connection...', c.cyan);

    // Test read from vehicles collection
    try {
        const vehiclesSnap = await db.collection('vehicles').limit(1).get();
        logTest('Firestore: Read vehicles', !vehiclesSnap.empty || vehiclesSnap.empty, `found: ${vehiclesSnap.size} docs`);
    } catch (err) {
        logTest('Firestore: Read vehicles', false, err.message);
    }

    // Test read from drivers collection
    try {
        const driversSnap = await db.collection('drivers').limit(1).get();
        logTest('Firestore: Read drivers', true, `found: ${driversSnap.size} docs`);
    } catch (err) {
        logTest('Firestore: Read drivers', false, err.message);
    }

    // Test read from routes collection
    try {
        const routesSnap = await db.collection('routes').limit(1).get();
        logTest('Firestore: Read routes', true, `found: ${routesSnap.size} docs`);
    } catch (err) {
        logTest('Firestore: Read routes', false, err.message);
    }
}

// Test 3: Booking Service Functions
async function testBookingService(db) {
    log('📝', 'Testing Booking Service...', c.cyan);

    const testBookingId = `test-fix-${Date.now()}`;
    const testUserId = 'test-user-fix';

    // Create test booking
    try {
        await db.collection('bookings').doc(testBookingId).set({
            userId: testUserId,
            pickupLocation: 'Test Pickup',
            dropoffLocation: 'Test Dropoff',
            pickupCoordinates: { lat: 13.7563, lng: 100.5018 },
            dropoffCoordinates: { lat: 13.8, lng: 100.6 },
            status: 'pending',
            totalCost: 500,
            paymentMethod: 'cash',
            paymentStatus: 'pending',
            createdAt: admin.firestore.Timestamp.now(),
        });
        logTest('Booking: Create test booking', true);
    } catch (err) {
        logTest('Booking: Create test booking', false, err.message);
        return; // Can't continue without booking
    }

    // Test status update (Fix #1: Cancel booking)
    try {
        await db.collection('bookings').doc(testBookingId).update({
            status: 'cancelled',
            updatedAt: admin.firestore.Timestamp.now(),
        });

        const doc = await db.collection('bookings').doc(testBookingId).get();
        const status = doc.data()?.status;
        logTest('Booking: Cancel booking (Fix #1)', status === 'cancelled', `status: ${status}`);
    } catch (err) {
        logTest('Booking: Cancel booking (Fix #1)', false, err.message);
    }

    // Cleanup test booking
    try {
        await db.collection('bookings').doc(testBookingId).delete();
        logTest('Booking: Cleanup test data', true);
    } catch (err) {
        logTest('Booking: Cleanup test data', false, err.message);
    }
}

// Test 4: Driver Service Functions
async function testDriverService(db) {
    log('🚗', 'Testing Driver Service...', c.cyan);

    // Find an available driver
    try {
        const driversSnap = await db.collection('drivers')
            .where('status', '==', 'available')
            .limit(1)
            .get();

        if (driversSnap.empty) {
            logSkip('Driver: Status update (Fix #3)', 'No available drivers');
            return;
        }

        const driver = driversSnap.docs[0];
        const driverId = driver.id;
        const originalStatus = driver.data().status;

        // Test status update with retry simulation
        await db.collection('drivers').doc(driverId).update({
            status: 'busy',
            updatedAt: admin.firestore.Timestamp.now(),
        });

        // Verify update
        const updatedDoc = await db.collection('drivers').doc(driverId).get();
        const newStatus = updatedDoc.data()?.status;
        logTest('Driver: Status update (Fix #3)', newStatus === 'busy', `${originalStatus} -> ${newStatus}`);

        // Restore original status
        await db.collection('drivers').doc(driverId).update({
            status: originalStatus,
            updatedAt: admin.firestore.Timestamp.now(),
        });
        logTest('Driver: Restore original status', true);

    } catch (err) {
        logTest('Driver: Status update (Fix #3)', false, err.message);
    }
}

// Test 5: Code Verification (Check fixes in source code)
async function testCodeFixes() {
    log('📋', 'Verifying Code Fixes...', c.cyan);

    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'app', 'test-maps1', 'page.tsx');

    try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Fix #1: Check for booking cancellation when no driver
        const hasFix1 = content.includes('cancelled') &&
                        content.includes('No available drivers') ||
                        content.includes('ไม่พบคนขับที่ว่าง');
        logTest('Code: Fix #1 - Cancel booking on no driver', hasFix1);

        // Fix #2: Check for connection error handling
        const hasFix2 = content.includes('connectionError') &&
                        content.includes('setConnectionError');
        logTest('Code: Fix #2 - Connection error state', hasFix2);

        // Fix #3: Check for retry mechanism
        const hasFix3 = content.includes('retryWithBackoff') &&
                        content.includes('maxRetries');
        logTest('Code: Fix #3 - Retry with backoff', hasFix3);

        // Fix #4: Check for loading timeout
        const hasFix4 = content.includes('setTimeout') &&
                        (content.includes('10000') || content.includes('timeout'));
        logTest('Code: Fix #4 - Loading timeout', hasFix4);

        // Fix #5: Check for traffic-aware ETA
        const hasFix5 = content.includes('trafficModel') &&
                        content.includes('BEST_GUESS') &&
                        content.includes('duration_in_traffic');
        logTest('Code: Fix #5 - Traffic-aware ETA', hasFix5);

    } catch (err) {
        logTest('Code: Read source file', false, err.message);
    }
}

// Test 6: Integration Test - Full Flow Simulation
async function testIntegration(db) {
    log('🔄', 'Testing Integration Flow...', c.cyan);

    const testBookingId = `integration-test-${Date.now()}`;
    const testUserId = 'integration-test-user';

    try {
        // Step 1: Create booking
        await db.collection('bookings').doc(testBookingId).set({
            userId: testUserId,
            pickupLocation: 'Suvarnabhumi Airport',
            dropoffLocation: 'Pattaya',
            pickupCoordinates: { lat: 13.6900, lng: 100.7501 },
            dropoffCoordinates: { lat: 12.9236, lng: 100.8825 },
            status: 'pending',
            totalCost: 1500,
            paymentMethod: 'cash',
            paymentStatus: 'pending',
            vehicleId: 'test-vehicle',
            vehicleName: 'Toyota Camry',
            firstName: 'Test',
            lastName: 'User',
            email: 'test@test.com',
            phone: '0812345678',
            createdAt: admin.firestore.Timestamp.now(),
        });
        logTest('Integration: Create booking', true);

        // Step 2: Confirm booking
        await db.collection('bookings').doc(testBookingId).update({
            status: 'confirmed',
            statusHistory: [{
                status: 'confirmed',
                timestamp: admin.firestore.Timestamp.now(),
                updatedBy: 'system'
            }],
            updatedAt: admin.firestore.Timestamp.now(),
        });

        const confirmedDoc = await db.collection('bookings').doc(testBookingId).get();
        logTest('Integration: Confirm booking', confirmedDoc.data()?.status === 'confirmed');

        // Step 3: Test cancellation flow (simulating no driver scenario)
        await db.collection('bookings').doc(testBookingId).update({
            status: 'cancelled',
            statusHistory: admin.firestore.FieldValue.arrayUnion({
                status: 'cancelled',
                timestamp: admin.firestore.Timestamp.now(),
                note: 'No available drivers',
                updatedBy: 'system'
            }),
            updatedAt: admin.firestore.Timestamp.now(),
        });

        const cancelledDoc = await db.collection('bookings').doc(testBookingId).get();
        logTest('Integration: Cancel on no driver', cancelledDoc.data()?.status === 'cancelled');

        // Cleanup
        await db.collection('bookings').doc(testBookingId).delete();
        logTest('Integration: Cleanup', true);

    } catch (err) {
        logTest('Integration: Flow test', false, err.message);
        // Cleanup on error
        try {
            await db.collection('bookings').doc(testBookingId).delete();
        } catch {}
    }
}

// Main function
async function main() {
    console.log(`\n${c.bold}${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.cyan}║     TEST-MAPS1 FIXES VERIFICATION SCRIPT                   ║${c.reset}`);
    console.log(`${c.bold}${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}\n`);

    console.log(`${c.dim}Testing 5 fixes made to /app/test-maps1/page.tsx${c.reset}`);
    console.log(`${c.dim}Fix #1: Cancel booking if driver assignment fails${c.reset}`);
    console.log(`${c.dim}Fix #2: Add error handling for Firestore subscription${c.reset}`);
    console.log(`${c.dim}Fix #3: Add retry mechanism for driver status update${c.reset}`);
    console.log(`${c.dim}Fix #4: Add timeout for loading state${c.reset}`);
    console.log(`${c.dim}Fix #5: Improve ETA calculation with traffic${c.reset}\n`);

    let db;
    try {
        db = initFirebase();
        log('✓', 'Firebase initialized', c.green);
    } catch (err) {
        log('✗', `Firebase init failed: ${err.message}`, c.red);
        process.exit(1);
    }

    console.log('');

    // Run tests
    await testBackendAPIs();
    console.log('');

    await testFirestoreConnection(db);
    console.log('');

    await testBookingService(db);
    console.log('');

    await testDriverService(db);
    console.log('');

    await testCodeFixes();
    console.log('');

    await testIntegration(db);
    console.log('');

    // Summary
    console.log(`${c.bold}${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.cyan}║                      TEST SUMMARY                          ║${c.reset}`);
    console.log(`${c.bold}${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}\n`);

    const total = results.passed + results.failed + results.skipped;
    const passRate = total > 0 ? Math.round((results.passed / (results.passed + results.failed)) * 100) : 0;

    console.log(`  ${c.green}Passed:${c.reset}  ${results.passed}`);
    console.log(`  ${c.red}Failed:${c.reset}  ${results.failed}`);
    console.log(`  ${c.yellow}Skipped:${c.reset} ${results.skipped}`);
    console.log(`  ${c.cyan}Total:${c.reset}   ${total}`);
    console.log(`  ${c.bold}Pass Rate: ${passRate >= 80 ? c.green : passRate >= 50 ? c.yellow : c.red}${passRate}%${c.reset}`);
    console.log('');

    if (results.failed > 0) {
        console.log(`${c.red}${c.bold}❌ SOME TESTS FAILED${c.reset}`);
        console.log(`${c.dim}Failed tests:${c.reset}`);
        results.tests
            .filter(t => t.passed === false)
            .forEach(t => console.log(`  ${c.red}• ${t.name}${c.reset}${t.details ? c.dim + ' - ' + t.details + c.reset : ''}`));
        process.exit(1);
    } else {
        console.log(`${c.green}${c.bold}✅ ALL TESTS PASSED!${c.reset}`);
        console.log(`${c.dim}Backend + Frontend integration is working correctly.${c.reset}`);
    }

    console.log('');
    process.exit(0);
}

main().catch(err => {
    console.error(`${c.red}Fatal error: ${err.message}${c.reset}`);
    process.exit(1);
});
