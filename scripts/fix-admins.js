require('dotenv').config({ path: '.env.local.vercel' });

const admin = require('firebase-admin');

const SUPER_ADMIN_EMAIL = 'phiopan@gmail.com';

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

    console.log('\n=== Removing Wrong Admins ===\n');

    const adminsSnapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .get();

    const wrongAdmins = [];
    const batch = db.batch();

    adminsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.email !== SUPER_ADMIN_EMAIL) {
            batch.update(doc.ref, {
                role: 'user',
                adminRevokedAt: admin.firestore.FieldValue.serverTimestamp(),
                adminRevokedReason: 'Security cleanup - unauthorized admin access',
            });
            wrongAdmins.push(data.email || doc.id);
        }
    });

    if (wrongAdmins.length > 0) {
        await batch.commit();
        console.log('Removed admin role from ' + wrongAdmins.length + ' user(s):');
        wrongAdmins.forEach(email => console.log('  - ' + email));
    } else {
        console.log('No wrong admins to fix.');
    }

    console.log('\n=== Verifying ===\n');

    const afterSnapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .get();

    console.log('Remaining admins: ' + afterSnapshot.size);
    afterSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('  - ' + (data.email || doc.id));
    });

    console.log('\nDone!');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
