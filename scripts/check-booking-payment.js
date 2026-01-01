#!/usr/bin/env node
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

async function main() {
    const snapshot = await db.collection('bookings').get();

    console.log('\n=== Recent Cancelled Bookings ===\n');

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'cancelled') {
            console.log('ID:', doc.id);
            console.log('Status:', data.status);
            console.log('Payment Status:', data.paymentStatus);
            console.log('Payment Method:', data.paymentMethod);
            console.log('---');
        }
    });

    process.exit(0);
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
