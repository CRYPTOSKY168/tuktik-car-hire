/**
 * Seed Routes to Firebase Firestore
 *
 * Usage: node scripts/seed-routes.js
 *
 * This script uploads all 52 routes from lib/data/routes.ts to Firestore.
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase credentials!');
    console.error('Required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
    }),
    projectId,
});

const db = admin.firestore();

// Routes data (from lib/data/routes.ts)
const routes = [
    // BANGKOK AREA
    { originId: "bkk-airport", destinationId: "bangkok", origin: "Suvarnabhumi Airport (BKK)", destination: "Bangkok City Center", prices: { sedan: 800, suv: 1000, van: 1200, luxury: 3000, minibus: 1500 }, isActive: true },
    { originId: "bangkok", destinationId: "bkk-airport", origin: "Bangkok City Center", destination: "Suvarnabhumi Airport (BKK)", prices: { sedan: 800, suv: 1000, van: 1200, luxury: 3000, minibus: 1500 }, isActive: true },
    { originId: "dmk-airport", destinationId: "bangkok", origin: "Don Mueang Airport (DMK)", destination: "Bangkok City Center", prices: { sedan: 700, suv: 900, van: 1100, luxury: 2800, minibus: 1400 }, isActive: true },
    { originId: "bangkok", destinationId: "dmk-airport", origin: "Bangkok City Center", destination: "Don Mueang Airport (DMK)", prices: { sedan: 700, suv: 900, van: 1100, luxury: 2800, minibus: 1400 }, isActive: true },
    { originId: "bkk-airport", destinationId: "dmk-airport", origin: "Suvarnabhumi Airport (BKK)", destination: "Don Mueang Airport (DMK)", prices: { sedan: 900, suv: 1100, van: 1300, luxury: 3200, minibus: 1600 }, isActive: true },
    { originId: "dmk-airport", destinationId: "bkk-airport", origin: "Don Mueang Airport (DMK)", destination: "Suvarnabhumi Airport (BKK)", prices: { sedan: 900, suv: 1100, van: 1300, luxury: 3200, minibus: 1600 }, isActive: true },

    // BANGKOK → EASTERN (Pattaya)
    { originId: "bkk-airport", destinationId: "pattaya", origin: "Suvarnabhumi Airport (BKK)", destination: "Pattaya", prices: { sedan: 1500, suv: 1800, van: 2200, luxury: 5500, minibus: 2800 }, isActive: true },
    { originId: "pattaya", destinationId: "bkk-airport", origin: "Pattaya", destination: "Suvarnabhumi Airport (BKK)", prices: { sedan: 1500, suv: 1800, van: 2200, luxury: 5500, minibus: 2800 }, isActive: true },
    { originId: "dmk-airport", destinationId: "pattaya", origin: "Don Mueang Airport (DMK)", destination: "Pattaya", prices: { sedan: 1800, suv: 2000, van: 2500, luxury: 6000, minibus: 3000 }, isActive: true },
    { originId: "pattaya", destinationId: "dmk-airport", origin: "Pattaya", destination: "Don Mueang Airport (DMK)", prices: { sedan: 1800, suv: 2000, van: 2500, luxury: 6000, minibus: 3000 }, isActive: true },
    { originId: "bangkok", destinationId: "pattaya", origin: "Bangkok City Center", destination: "Pattaya", prices: { sedan: 1400, suv: 1700, van: 2000, luxury: 5000, minibus: 2500 }, isActive: true },
    { originId: "pattaya", destinationId: "bangkok", origin: "Pattaya", destination: "Bangkok City Center", prices: { sedan: 1400, suv: 1700, van: 2000, luxury: 5000, minibus: 2500 }, isActive: true },

    // BANGKOK → WESTERN (Hua Hin)
    { originId: "bkk-airport", destinationId: "hua-hin", origin: "Suvarnabhumi Airport (BKK)", destination: "Hua Hin", prices: { sedan: 2500, suv: 2800, van: 3200, luxury: 7500, minibus: 3800 }, isActive: true },
    { originId: "hua-hin", destinationId: "bkk-airport", origin: "Hua Hin", destination: "Suvarnabhumi Airport (BKK)", prices: { sedan: 2500, suv: 2800, van: 3200, luxury: 7500, minibus: 3800 }, isActive: true },
    { originId: "dmk-airport", destinationId: "hua-hin", origin: "Don Mueang Airport (DMK)", destination: "Hua Hin", prices: { sedan: 2700, suv: 3000, van: 3400, luxury: 8000, minibus: 4000 }, isActive: true },
    { originId: "hua-hin", destinationId: "dmk-airport", origin: "Hua Hin", destination: "Don Mueang Airport (DMK)", prices: { sedan: 2700, suv: 3000, van: 3400, luxury: 8000, minibus: 4000 }, isActive: true },
    { originId: "bangkok", destinationId: "hua-hin", origin: "Bangkok City Center", destination: "Hua Hin", prices: { sedan: 2400, suv: 2700, van: 3000, luxury: 7000, minibus: 3500 }, isActive: true },
    { originId: "hua-hin", destinationId: "bangkok", origin: "Hua Hin", destination: "Bangkok City Center", prices: { sedan: 2400, suv: 2700, van: 3000, luxury: 7000, minibus: 3500 }, isActive: true },

    // BANGKOK → CENTRAL (Ayutthaya)
    { originId: "bkk-airport", destinationId: "ayutthaya", origin: "Suvarnabhumi Airport (BKK)", destination: "Ayutthaya", prices: { sedan: 1200, suv: 1400, van: 1700, luxury: 4000, minibus: 2000 }, isActive: true },
    { originId: "ayutthaya", destinationId: "bkk-airport", origin: "Ayutthaya", destination: "Suvarnabhumi Airport (BKK)", prices: { sedan: 1200, suv: 1400, van: 1700, luxury: 4000, minibus: 2000 }, isActive: true },
    { originId: "dmk-airport", destinationId: "ayutthaya", origin: "Don Mueang Airport (DMK)", destination: "Ayutthaya", prices: { sedan: 1000, suv: 1200, van: 1500, luxury: 3500, minibus: 1800 }, isActive: true },
    { originId: "ayutthaya", destinationId: "dmk-airport", origin: "Ayutthaya", destination: "Don Mueang Airport (DMK)", prices: { sedan: 1000, suv: 1200, van: 1500, luxury: 3500, minibus: 1800 }, isActive: true },
    { originId: "bangkok", destinationId: "ayutthaya", origin: "Bangkok City Center", destination: "Ayutthaya", prices: { sedan: 1000, suv: 1200, van: 1500, luxury: 3500, minibus: 1800 }, isActive: true },
    { originId: "ayutthaya", destinationId: "bangkok", origin: "Ayutthaya", destination: "Bangkok City Center", prices: { sedan: 1000, suv: 1200, van: 1500, luxury: 3500, minibus: 1800 }, isActive: true },

    // NORTHERN REGION (Chiang Mai)
    { originId: "cnx-airport", destinationId: "chiang-mai", origin: "Chiang Mai Airport (CNX)", destination: "Chiang Mai City", prices: { sedan: 500, suv: 650, van: 800, luxury: 2000, minibus: 1000 }, isActive: true },
    { originId: "chiang-mai", destinationId: "cnx-airport", origin: "Chiang Mai City", destination: "Chiang Mai Airport (CNX)", prices: { sedan: 500, suv: 650, van: 800, luxury: 2000, minibus: 1000 }, isActive: true },
    { originId: "cnx-airport", destinationId: "chiang-rai", origin: "Chiang Mai Airport (CNX)", destination: "Chiang Rai", prices: { sedan: 2500, suv: 2800, van: 3200, luxury: 7500, minibus: 3800 }, isActive: true },
    { originId: "chiang-rai", destinationId: "cnx-airport", origin: "Chiang Rai", destination: "Chiang Mai Airport (CNX)", prices: { sedan: 2500, suv: 2800, van: 3200, luxury: 7500, minibus: 3800 }, isActive: true },
    { originId: "chiang-mai", destinationId: "chiang-rai", origin: "Chiang Mai City", destination: "Chiang Rai", prices: { sedan: 2400, suv: 2700, van: 3000, luxury: 7000, minibus: 3500 }, isActive: true },
    { originId: "chiang-rai", destinationId: "chiang-mai", origin: "Chiang Rai", destination: "Chiang Mai City", prices: { sedan: 2400, suv: 2700, van: 3000, luxury: 7000, minibus: 3500 }, isActive: true },

    // SOUTHERN REGION - PHUKET
    { originId: "hkt-airport", destinationId: "phuket-town", origin: "Phuket Airport (HKT)", destination: "Phuket Town", prices: { sedan: 600, suv: 750, van: 900, luxury: 2200, minibus: 1100 }, isActive: true },
    { originId: "phuket-town", destinationId: "hkt-airport", origin: "Phuket Town", destination: "Phuket Airport (HKT)", prices: { sedan: 600, suv: 750, van: 900, luxury: 2200, minibus: 1100 }, isActive: true },
    { originId: "hkt-airport", destinationId: "patong", origin: "Phuket Airport (HKT)", destination: "Patong Beach", prices: { sedan: 800, suv: 1000, van: 1200, luxury: 3000, minibus: 1500 }, isActive: true },
    { originId: "patong", destinationId: "hkt-airport", origin: "Patong Beach", destination: "Phuket Airport (HKT)", prices: { sedan: 800, suv: 1000, van: 1200, luxury: 3000, minibus: 1500 }, isActive: true },
    { originId: "hkt-airport", destinationId: "krabi", origin: "Phuket Airport (HKT)", destination: "Krabi", prices: { sedan: 2800, suv: 3200, van: 3600, luxury: 8500, minibus: 4200 }, isActive: true },
    { originId: "krabi", destinationId: "hkt-airport", origin: "Krabi", destination: "Phuket Airport (HKT)", prices: { sedan: 2800, suv: 3200, van: 3600, luxury: 8500, minibus: 4200 }, isActive: true },
    { originId: "phuket-town", destinationId: "patong", origin: "Phuket Town", destination: "Patong Beach", prices: { sedan: 400, suv: 500, van: 650, luxury: 1500, minibus: 800 }, isActive: true },
    { originId: "patong", destinationId: "phuket-town", origin: "Patong Beach", destination: "Phuket Town", prices: { sedan: 400, suv: 500, van: 650, luxury: 1500, minibus: 800 }, isActive: true },
    { originId: "phuket-town", destinationId: "krabi", origin: "Phuket Town", destination: "Krabi", prices: { sedan: 2600, suv: 3000, van: 3400, luxury: 8000, minibus: 4000 }, isActive: true },
    { originId: "krabi", destinationId: "phuket-town", origin: "Krabi", destination: "Phuket Town", prices: { sedan: 2600, suv: 3000, van: 3400, luxury: 8000, minibus: 4000 }, isActive: true },
    { originId: "patong", destinationId: "krabi", origin: "Patong Beach", destination: "Krabi", prices: { sedan: 2700, suv: 3100, van: 3500, luxury: 8200, minibus: 4100 }, isActive: true },
    { originId: "krabi", destinationId: "patong", origin: "Krabi", destination: "Patong Beach", prices: { sedan: 2700, suv: 3100, van: 3500, luxury: 8200, minibus: 4100 }, isActive: true },

    // SOUTHERN REGION - SAMUI
    { originId: "usm-airport", destinationId: "koh-samui", origin: "Samui Airport (USM)", destination: "Koh Samui", prices: { sedan: 500, suv: 650, van: 800, luxury: 2000, minibus: 1000 }, isActive: true },
    { originId: "koh-samui", destinationId: "usm-airport", origin: "Koh Samui", destination: "Samui Airport (USM)", prices: { sedan: 500, suv: 650, van: 800, luxury: 2000, minibus: 1000 }, isActive: true },

    // CROSS-REGION: Pattaya ↔ Hua Hin
    { originId: "pattaya", destinationId: "hua-hin", origin: "Pattaya", destination: "Hua Hin", prices: { sedan: 3500, suv: 4000, van: 4500, luxury: 10000, minibus: 5500 }, isActive: true },
    { originId: "hua-hin", destinationId: "pattaya", origin: "Hua Hin", destination: "Pattaya", prices: { sedan: 3500, suv: 4000, van: 4500, luxury: 10000, minibus: 5500 }, isActive: true },
];

async function seedRoutes() {
    console.log('Starting route seeding...');
    console.log(`Total routes to upload: ${routes.length}`);
    console.log('');

    const batch = db.batch();
    const routesRef = db.collection('routes');

    // First, delete existing routes
    console.log('Deleting existing routes...');
    const existingRoutes = await routesRef.get();
    for (const doc of existingRoutes.docs) {
        batch.delete(doc.ref);
    }
    console.log(`Deleted ${existingRoutes.size} existing routes`);

    // Add new routes
    console.log('Adding new routes...');
    for (const route of routes) {
        const docId = `${route.originId}-to-${route.destinationId}`;
        const docRef = routesRef.doc(docId);
        batch.set(docRef, {
            ...route,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // Commit the batch
    await batch.commit();

    console.log('');
    console.log('Route seeding completed!');
    console.log(`Uploaded ${routes.length} routes to Firestore`);
    console.log('');
    console.log('Routes by region:');
    console.log('- Bangkok Area: 6 routes');
    console.log('- Bangkok ↔ Pattaya: 6 routes');
    console.log('- Bangkok ↔ Hua Hin: 6 routes');
    console.log('- Bangkok ↔ Ayutthaya: 6 routes');
    console.log('- Chiang Mai Area: 6 routes');
    console.log('- Phuket Area: 12 routes');
    console.log('- Samui Area: 2 routes');
    console.log('- Cross-region: 2 routes');
    console.log('');
    console.log('Total: 52 routes');
}

seedRoutes()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error seeding routes:', error);
        process.exit(1);
    });
