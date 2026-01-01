#!/usr/bin/env node
/**
 * Fix Stuck Bookings Script
 * ยกเลิก booking ที่ค้างและ reset สถานะคนขับ
 *
 * Usage: node scripts/fix-stuck-bookings.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Colors
const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(emoji, msg, color = '') {
    console.log(`${color}${emoji} ${msg}${c.reset}`);
}

// Init Firebase
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

async function main() {
    console.log(`\n${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}║     FIX STUCK BOOKINGS SCRIPT                              ║${c.reset}`);
    console.log(`${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}\n`);

    const db = initFirebase();

    // 1. หา bookings ที่มี driver assigned แต่ค้างอยู่
    log('🔍', 'ค้นหา bookings ที่ค้างอยู่ (driver_assigned)...', c.cyan);

    const stuckBookings = await db.collection('bookings')
        .where('status', '==', 'driver_assigned')
        .get();

    if (stuckBookings.empty) {
        log('✅', 'ไม่พบ booking ที่ค้างอยู่', c.green);
    } else {
        log('📦', `พบ ${stuckBookings.size} booking(s) ที่ค้างอยู่`, c.yellow);

        for (const doc of stuckBookings.docs) {
            const booking = doc.data();
            const bookingId = doc.id;
            const driverId = booking.driver?.driverId;
            const driverName = booking.driver?.name || 'Unknown';

            log('  →', `Booking: ${bookingId.substring(0, 12)}... | Driver: ${driverName}`, c.yellow);

            // ยกเลิก booking
            await db.collection('bookings').doc(bookingId).update({
                status: 'cancelled',
                statusHistory: admin.firestore.FieldValue.arrayUnion({
                    status: 'cancelled',
                    timestamp: admin.firestore.Timestamp.now(),
                    note: 'ยกเลิกโดยระบบ - cleanup stuck booking',
                    updatedBy: 'system'
                }),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            log('    ✓', `Booking ${bookingId.substring(0, 8)}... → cancelled`, c.green);

            // Reset driver status
            if (driverId) {
                await db.collection('drivers').doc(driverId).update({
                    status: 'available',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                log('    ✓', `Driver ${driverName} → available`, c.green);
            }
        }
    }

    // 2. หา pending bookings และถามว่าจะลบไหม
    log('\n🔍', 'ค้นหา bookings ที่ pending...', c.cyan);

    const pendingBookings = await db.collection('bookings')
        .where('status', '==', 'pending')
        .get();

    if (pendingBookings.empty) {
        log('✅', 'ไม่พบ booking ที่ pending', c.green);
    } else {
        log('📦', `พบ ${pendingBookings.size} booking(s) ที่ pending`, c.yellow);

        for (const doc of pendingBookings.docs) {
            const booking = doc.data();
            log('  →', `${doc.id.substring(0, 12)}... | ${booking.pickupLocation} → ${booking.dropoffLocation}`, c.yellow);
        }

        // ยกเลิกทั้งหมด
        log('\n🗑️', 'กำลังยกเลิก pending bookings ทั้งหมด...', c.cyan);
        for (const doc of pendingBookings.docs) {
            await db.collection('bookings').doc(doc.id).update({
                status: 'cancelled',
                statusHistory: admin.firestore.FieldValue.arrayUnion({
                    status: 'cancelled',
                    timestamp: admin.firestore.Timestamp.now(),
                    note: 'ยกเลิกโดยระบบ - cleanup test bookings',
                    updatedBy: 'system'
                }),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            log('  ✓', `${doc.id.substring(0, 8)}... → cancelled`, c.green);
        }
    }

    // 3. Sync driver statuses
    log('\n🔍', 'ตรวจสอบและ sync สถานะคนขับ...', c.cyan);

    const drivers = await db.collection('drivers').get();

    for (const driverDoc of drivers.docs) {
        const driver = driverDoc.data();
        const driverId = driverDoc.id;

        // เช็คว่าคนขับมี active booking หรือไม่
        const activeBookings = await db.collection('bookings')
            .where('driver.driverId', '==', driverId)
            .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
            .get();

        const hasActiveJob = !activeBookings.empty;
        const expectedStatus = hasActiveJob ? 'busy' : 'available';

        if (driver.status !== expectedStatus) {
            log('  ⚠️', `${driver.name}: ${driver.status} → ${expectedStatus} (fixing...)`, c.yellow);
            await db.collection('drivers').doc(driverId).update({
                status: expectedStatus,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            log('    ✓', `Fixed: ${driver.name} → ${expectedStatus}`, c.green);
        } else {
            log('  ✓', `${driver.name}: ${driver.status} (OK)`, c.green);
        }
    }

    // 4. สรุป
    console.log(`\n${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}║                      สรุป                                  ║${c.reset}`);
    console.log(`${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}\n`);

    // เช็คสถานะหลังแก้ไข
    const finalDrivers = await db.collection('drivers').get();
    const activeBookings = await db.collection('bookings')
        .where('status', 'in', ['pending', 'confirmed', 'driver_assigned', 'driver_en_route', 'in_progress'])
        .get();

    log('👥', `คนขับทั้งหมด: ${finalDrivers.size}`, c.cyan);
    finalDrivers.docs.forEach(doc => {
        const d = doc.data();
        const statusColor = d.status === 'available' ? c.green : d.status === 'busy' ? c.yellow : c.red;
        log('  →', `${d.name}: ${d.status}`, statusColor);
    });

    log('\n📦', `Bookings ที่กำลังดำเนินการ: ${activeBookings.size}`, c.cyan);
    if (activeBookings.empty) {
        log('  ✅', 'ไม่มี bookings ที่กำลังดำเนินการ - พร้อมใช้งาน!', c.green);
    } else {
        activeBookings.docs.forEach(doc => {
            const b = doc.data();
            log('  →', `${doc.id.substring(0, 12)}... | ${b.status}`, c.yellow);
        });
    }

    console.log(`\n${c.green}✅ เสร็จสิ้น! ระบบพร้อมใช้งานแล้ว${c.reset}\n`);
}

main().catch(err => {
    console.error(`${c.red}❌ Error: ${err.message}${c.reset}`);
    process.exit(1);
});
