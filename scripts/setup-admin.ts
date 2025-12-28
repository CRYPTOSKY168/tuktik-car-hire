/**
 * Setup Admin Script
 * ใช้สำหรับตั้งค่า user เป็น admin ครั้งแรก
 *
 * วิธีใช้:
 * npx ts-node --esm scripts/setup-admin.ts <email>
 *
 * ตัวอย่าง:
 * npx ts-node --esm scripts/setup-admin.ts admin@example.com
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const initAdmin = () => {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    // Try to load service account from environment or file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(
            Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
        );
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
    }

    if (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY) {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
            projectId: process.env.FIREBASE_PROJECT_ID,
        });
    }

    throw new Error('Firebase credentials not found');
};

async function setupAdmin(email: string) {
    try {
        console.log('🔧 Initializing Firebase Admin...');
        const app = initAdmin();
        const auth = admin.auth(app);
        const db = admin.firestore(app);

        console.log(`🔍 Looking for user with email: ${email}`);

        // Find user by email
        const userRecord = await auth.getUserByEmail(email);
        console.log(`✅ Found user: ${userRecord.uid}`);
        console.log(`   Name: ${userRecord.displayName || 'N/A'}`);
        console.log(`   Email: ${userRecord.email}`);

        // Update user role to admin in Firestore
        console.log('🔧 Setting role to admin...');
        await db.collection('users').doc(userRecord.uid).set({
            role: 'admin',
            email: userRecord.email,
            displayName: userRecord.displayName || email.split('@')[0],
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log('✅ SUCCESS! User is now an admin.');
        console.log(`   UID: ${userRecord.uid}`);
        console.log(`   Email: ${email}`);
        console.log(`   Role: admin`);
        console.log('\n🎉 You can now access admin features!');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.code === 'auth/user-not-found') {
            console.error('   User with this email does not exist in Firebase Auth.');
            console.error('   Please make sure you have registered/logged in first.');
        }
        process.exit(1);
    }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.log('Usage: npx ts-node --esm scripts/setup-admin.ts <email>');
    console.log('Example: npx ts-node --esm scripts/setup-admin.ts admin@example.com');
    process.exit(1);
}

setupAdmin(email);
