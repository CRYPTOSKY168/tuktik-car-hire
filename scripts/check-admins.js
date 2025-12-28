/**
 * Script to check and fix admins in Firestore
 * Run with: node scripts/check-admins.js
 */

const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPER_ADMIN_EMAIL = 'phiopan@gmail.com';

async function initializeFirebase() {
    if (admin.apps.length > 0) {
        return admin.apps[0];
    }

    // Use service account from environment variable (base64 encoded)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(
            Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
        );
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
    }

    // Use individual environment variables
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

    throw new Error('Firebase credentials not found in environment variables');
}

async function main() {
    try {
        console.log('Initializing Firebase...');
        await initializeFirebase();
        const db = admin.firestore();

        console.log('\n=== Current Admins ===\n');

        // Get all users with admin role
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .get();

        if (adminsSnapshot.empty) {
            console.log('No admins found!');
        } else {
            console.log(`Found ${adminsSnapshot.size} admin(s):\n`);
            adminsSnapshot.docs.forEach((doc, index) => {
                const data = doc.data();
                const isSuperAdmin = data.email === SUPER_ADMIN_EMAIL;
                console.log(`${index + 1}. ${data.email || 'No email'} (UID: ${doc.id})${isSuperAdmin ? ' [SUPER ADMIN]' : ''}`);
            });
        }

        // Ask for action
        const args = process.argv.slice(2);

        if (args.includes('--fix')) {
            console.log('\n=== Fixing Admins ===\n');

            const wrongAdmins = [];
            const batch = db.batch();

            adminsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.email !== SUPER_ADMIN_EMAIL) {
                    batch.update(doc.ref, {
                        role: 'user',
                        adminRevokedAt: admin.firestore.FieldValue.serverTimestamp(),
                        adminRevokedReason: 'Security cleanup',
                    });
                    wrongAdmins.push(data.email || doc.id);
                }
            });

            if (wrongAdmins.length > 0) {
                await batch.commit();
                console.log(`Removed admin role from ${wrongAdmins.length} user(s):`);
                wrongAdmins.forEach(email => console.log(`  - ${email}`));
            } else {
                console.log('No wrong admins to fix.');
            }

            // Ensure super admin exists
            console.log(`\nEnsuring ${SUPER_ADMIN_EMAIL} is admin...`);

            // Find user by email
            const userQuery = await db.collection('users')
                .where('email', '==', SUPER_ADMIN_EMAIL)
                .get();

            if (!userQuery.empty) {
                const userDoc = userQuery.docs[0];
                await userDoc.ref.update({
                    role: 'admin',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`${SUPER_ADMIN_EMAIL} is now admin.`);
            } else {
                console.log(`User ${SUPER_ADMIN_EMAIL} not found in Firestore. They need to login first.`);
            }
        } else {
            console.log('\nTo fix wrong admins, run: node scripts/check-admins.js --fix');
        }

        console.log('\nDone!');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
