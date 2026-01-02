const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const token = process.argv[2];
const title = process.argv[3] || '🎉 ทดสอบสำเร็จ!';
const body = process.argv[4] || 'Push notification ทำงานปกติแล้ว';

console.log('📤 Sending:', title);

admin.messaging().send({
    token: token,
    notification: { title, body },
    android: {
        priority: 'high',
        notification: {
            sound: 'default',
            channelId: 'default'
        }
    }
})
.then(response => console.log('✅ สำเร็จ!'))
.catch(error => console.log('❌ Error:', error.message));
