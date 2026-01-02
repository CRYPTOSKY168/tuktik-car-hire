#!/usr/bin/env node
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

async function findUser() {
    const email = process.argv[2] || 'phiopan2@gmail.com';
    console.log('Looking for user:', email);

    const usersSnap = await db.collection('users').where('email', '==', email).get();

    if (usersSnap.empty) {
        console.log('User not found');
        return;
    }

    usersSnap.forEach(doc => {
        const data = doc.data();
        console.log('\n=== User Found ===');
        console.log('User ID:', doc.id);
        console.log('Email:', data.email);
        console.log('Display Name:', data.displayName || 'N/A');
        console.log('FCM Token:', data.fcmToken ? data.fcmToken.substring(0, 50) + '...' : 'NOT SET');
        console.log('Full FCM Token:', data.fcmToken || 'NOT SET');
    });
}

findUser().catch(console.error);
