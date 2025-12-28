require('dotenv').config({ path: '.env.local.vercel' });

const admin = require('firebase-admin');

async function main() {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
            projectId: process.env.FIREBASE_PROJECT_ID,
        });
    }

    const db = admin.firestore();

    console.log('\n=== Checking Stale Driver Status ===\n');

    // Find all drivers with 'busy' status
    const busyDriversSnapshot = await db.collection('drivers')
        .where('status', '==', 'busy')
        .get();

    console.log('Found ' + busyDriversSnapshot.size + ' driver(s) with "busy" status\n');

    const staleDrivers = [];

    for (const driverDoc of busyDriversSnapshot.docs) {
        const driverId = driverDoc.id;
        const driverData = driverDoc.data();

        // Check if driver has active bookings
        const activeBookingsSnap = await db.collection('bookings')
            .where('driver.driverId', '==', driverId)
            .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
            .get();

        console.log('Driver: ' + (driverData.name || driverId));
        console.log('  Email: ' + (driverData.email || 'N/A'));
        console.log('  Status: ' + driverData.status);
        console.log('  Active bookings: ' + activeBookingsSnap.size);

        if (activeBookingsSnap.empty) {
            staleDrivers.push({
                id: driverId,
                name: driverData.name,
                email: driverData.email
            });
            console.log('  -> STALE! Will fix to "available"');
        } else {
            console.log('  -> OK (has active jobs)');
        }
        console.log('');
    }

    if (staleDrivers.length > 0) {
        console.log('=== Fixing Stale Status ===\n');

        const batch = db.batch();
        staleDrivers.forEach(driver => {
            const ref = db.collection('drivers').doc(driver.id);
            batch.update(ref, {
                status: 'available',
                statusFixedAt: admin.firestore.FieldValue.serverTimestamp(),
                statusFixedReason: 'Auto-fix stale busy status - no active bookings',
            });
        });

        await batch.commit();

        console.log('Fixed ' + staleDrivers.length + ' driver(s):');
        staleDrivers.forEach(driver => {
            console.log('  - ' + (driver.name || driver.id) + ' (' + (driver.email || 'no email') + ')');
        });
    } else {
        console.log('No stale driver status to fix.');
    }

    console.log('\nDone!');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
