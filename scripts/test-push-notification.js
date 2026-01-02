#!/usr/bin/env node
/**
 * 🔔 Test Push Notification Script
 * ใช้ทดสอบส่ง Push Notification ไปยัง Android App
 * 
 * Usage:
 *   node scripts/test-push-notification.js                    # ส่งไปทุก device (topic: all)
 *   node scripts/test-push-notification.js --token <FCM_TOKEN>  # ส่งไป device เฉพาะ
 *   node scripts/test-push-notification.js --list-tokens      # ดู tokens ทั้งหมดใน database
 */

const admin = require('firebase-admin');
const path = require('path');
const readline = require('readline');

// Colors for terminal
const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    dim: '\x1b[2m',
};

// Initialize Firebase Admin
function initFirebase() {
    if (admin.apps.length > 0) {
        return admin;
    }

    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

    // Try service account file first
    const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
    try {
        const fs = require('fs');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = require(serviceAccountPath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id,
            });
            return admin;
        }
    } catch (e) {
        // Continue with env vars
    }

    // Use environment variables
    if (!process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !process.env.FIREBASE_PRIVATE_KEY) {
        console.error(`${c.red}❌ ไม่พบ Firebase credentials ใน .env.local${c.reset}`);
        console.error(`${c.dim}ต้องมี: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY${c.reset}`);
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
    });

    return admin;
}

// ดึง FCM tokens จาก Firestore
async function getFcmTokens() {
    const db = admin.firestore();
    const tokens = [];

    // ดึงจาก users collection
    const usersSnap = await db.collection('users').where('fcmToken', '!=', null).get();
    usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) {
            tokens.push({
                token: data.fcmToken,
                userId: doc.id,
                email: data.email || 'N/A',
                type: 'user'
            });
        }
    });

    // ดึงจาก fcm_tokens collection (ถ้ามี)
    try {
        const tokensSnap = await db.collection('fcm_tokens').get();
        tokensSnap.forEach(doc => {
            const data = doc.data();
            if (data.token) {
                tokens.push({
                    token: data.token,
                    oderId: doc.id,
                    userId: data.userId || 'N/A',
                    type: 'fcm_tokens'
                });
            }
        });
    } catch (e) {
        // collection อาจไม่มี
    }

    return tokens;
}

// ส่ง notification ไป token เฉพาะ
async function sendToToken(token, title, body, data = {}) {
    const message = {
        token: token,
        notification: {
            title: title,
            body: body,
        },
        data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'default',
                priority: 'high',
                defaultSound: true,
                defaultVibrateTimings: true,
            },
        },
    };

    try {
        const response = await admin.messaging().send(message);
        return { success: true, messageId: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ส่ง notification ไป topic
async function sendToTopic(topic, title, body, data = {}) {
    const message = {
        topic: topic,
        notification: {
            title: title,
            body: body,
        },
        data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'default',
                priority: 'high',
            },
        },
    };

    try {
        const response = await admin.messaging().send(message);
        return { success: true, messageId: response };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Interactive menu
async function interactiveMenu() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (q) => new Promise(resolve => rl.question(q, resolve));

    console.log(`\n${c.cyan}╔════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}║  🔔 TukTik Push Notification Tester   ║${c.reset}`);
    console.log(`${c.cyan}╚════════════════════════════════════════╝${c.reset}\n`);

    // ดึง tokens จาก database
    console.log(`${c.dim}กำลังดึง FCM tokens จาก database...${c.reset}`);
    const tokens = await getFcmTokens();
    
    if (tokens.length > 0) {
        console.log(`\n${c.green}✅ พบ ${tokens.length} tokens ใน database:${c.reset}`);
        tokens.forEach((t, i) => {
            console.log(`   ${c.yellow}${i + 1}.${c.reset} ${t.email || t.userId} ${c.dim}(${t.token.substring(0, 20)}...)${c.reset}`);
        });
    } else {
        console.log(`${c.yellow}⚠️  ไม่พบ FCM tokens ใน database${c.reset}`);
        console.log(`${c.dim}   (แอปต้องเปิดและ login ก่อนถึงจะมี token)${c.reset}`);
    }

    console.log(`\n${c.blue}เลือกวิธีส่ง:${c.reset}`);
    console.log(`   ${c.yellow}1.${c.reset} ส่งไป Token จาก database (เลือกจากรายการ)`);
    console.log(`   ${c.yellow}2.${c.reset} ใส่ Token เอง (copy จาก Logcat)`);
    console.log(`   ${c.yellow}3.${c.reset} ส่งไป Topic "all" (ทุก device ที่ subscribe)`);
    console.log(`   ${c.yellow}4.${c.reset} ออก\n`);

    const choice = await question(`${c.cyan}เลือก (1-4): ${c.reset}`);

    let targetToken = null;
    let useTopic = false;

    switch (choice.trim()) {
        case '1':
            if (tokens.length === 0) {
                console.log(`${c.red}❌ ไม่มี tokens ให้เลือก${c.reset}`);
                rl.close();
                return;
            }
            const tokenIndex = await question(`${c.cyan}เลือก token (1-${tokens.length}): ${c.reset}`);
            const idx = parseInt(tokenIndex) - 1;
            if (idx >= 0 && idx < tokens.length) {
                targetToken = tokens[idx].token;
            } else {
                console.log(`${c.red}❌ เลือกไม่ถูกต้อง${c.reset}`);
                rl.close();
                return;
            }
            break;

        case '2':
            targetToken = await question(`${c.cyan}ใส่ FCM Token: ${c.reset}`);
            if (!targetToken.trim()) {
                console.log(`${c.red}❌ Token ว่างเปล่า${c.reset}`);
                rl.close();
                return;
            }
            targetToken = targetToken.trim();
            break;

        case '3':
            useTopic = true;
            break;

        case '4':
            console.log(`${c.dim}👋 ออกจากโปรแกรม${c.reset}`);
            rl.close();
            return;

        default:
            console.log(`${c.red}❌ เลือกไม่ถูกต้อง${c.reset}`);
            rl.close();
            return;
    }

    // เลือกประเภท notification
    console.log(`\n${c.blue}เลือกประเภท Notification:${c.reset}`);
    console.log(`   ${c.yellow}1.${c.reset} 🧪 ทดสอบทั่วไป`);
    console.log(`   ${c.yellow}2.${c.reset} 🚗 แจ้งเตือนคนขับ (มีงานใหม่)`);
    console.log(`   ${c.yellow}3.${c.reset} ✅ แจ้งเตือนลูกค้า (คนขับรับงาน)`);
    console.log(`   ${c.yellow}4.${c.reset} 📍 แจ้งเตือนลูกค้า (คนขับกำลังมา)`);
    console.log(`   ${c.yellow}5.${c.reset} 🎉 แจ้งเตือนลูกค้า (ถึงปลายทาง)`);
    console.log(`   ${c.yellow}6.${c.reset} ✍️  กำหนดเอง\n`);

    const notifType = await question(`${c.cyan}เลือก (1-6): ${c.reset}`);

    let title, body, data = {};

    switch (notifType.trim()) {
        case '1':
            title = '🧪 ทดสอบ Push Notification';
            body = 'ถ้าเห็นข้อความนี้ แสดงว่าระบบแจ้งเตือนทำงานปกติ!';
            data = { type: 'test' };
            break;
        case '2':
            title = '🚗 มีงานใหม่!';
            body = 'สุวรรณภูมิ → พัทยา | ฿1,500';
            data = { type: 'new_job', bookingId: 'test-123' };
            break;
        case '3':
            title = '✅ คนขับรับงานแล้ว';
            body = 'คนขับ สมชาย กำลังเตรียมตัวมารับคุณ';
            data = { type: 'driver_accepted', bookingId: 'test-123' };
            break;
        case '4':
            title = '📍 คนขับกำลังมารับคุณ';
            body = 'คาดว่าจะถึงใน 8 นาที';
            data = { type: 'driver_en_route', bookingId: 'test-123' };
            break;
        case '5':
            title = '🎉 ถึงปลายทางแล้ว!';
            body = 'ขอบคุณที่ใช้บริการ TukTik';
            data = { type: 'trip_completed', bookingId: 'test-123' };
            break;
        case '6':
            title = await question(`${c.cyan}Title: ${c.reset}`);
            body = await question(`${c.cyan}Body: ${c.reset}`);
            break;
        default:
            title = '🔔 แจ้งเตือนจาก TukTik';
            body = 'ข้อความทดสอบ';
    }

    // ส่ง notification
    console.log(`\n${c.dim}กำลังส่ง notification...${c.reset}`);
    
    let result;
    if (useTopic) {
        result = await sendToTopic('all', title, body, data);
    } else {
        result = await sendToToken(targetToken, title, body, data);
    }

    if (result.success) {
        console.log(`\n${c.green}╔════════════════════════════════════════╗${c.reset}`);
        console.log(`${c.green}║  ✅ ส่ง Notification สำเร็จ!           ║${c.reset}`);
        console.log(`${c.green}╚════════════════════════════════════════╝${c.reset}`);
        console.log(`${c.dim}Message ID: ${result.messageId}${c.reset}`);
        console.log(`\n${c.yellow}📱 ตรวจสอบบนมือถือ/Emulator ว่าได้รับ notification หรือไม่${c.reset}`);
    } else {
        console.log(`\n${c.red}╔════════════════════════════════════════╗${c.reset}`);
        console.log(`${c.red}║  ❌ ส่ง Notification ไม่สำเร็จ         ║${c.reset}`);
        console.log(`${c.red}╚════════════════════════════════════════╝${c.reset}`);
        console.log(`${c.red}Error: ${result.error}${c.reset}`);
        
        if (result.error.includes('not a valid FCM registration token')) {
            console.log(`\n${c.yellow}💡 วิธีแก้:${c.reset}`);
            console.log(`   1. เปิดแอปบน Emulator/มือถือ`);
            console.log(`   2. Login เข้าระบบ`);
            console.log(`   3. ดู FCM Token ใน Logcat: ${c.dim}adb logcat | grep -i fcm${c.reset}`);
            console.log(`   4. รัน script นี้อีกครั้งและใส่ Token ใหม่`);
        }
    }

    rl.close();
}

// Command line arguments
async function main() {
    initFirebase();
    
    const args = process.argv.slice(2);
    
    if (args.includes('--list-tokens')) {
        const tokens = await getFcmTokens();
        console.log(`\n${c.cyan}📋 FCM Tokens ใน Database:${c.reset}\n`);
        if (tokens.length === 0) {
            console.log(`${c.yellow}ไม่พบ tokens${c.reset}`);
        } else {
            tokens.forEach((t, i) => {
                console.log(`${c.yellow}${i + 1}.${c.reset} ${t.email || t.userId}`);
                console.log(`   ${c.dim}Token: ${t.token}${c.reset}\n`);
            });
        }
        process.exit(0);
    }
    
    if (args.includes('--token')) {
        const tokenIndex = args.indexOf('--token');
        const token = args[tokenIndex + 1];
        if (!token) {
            console.error(`${c.red}❌ กรุณาระบุ token: --token <FCM_TOKEN>${c.reset}`);
            process.exit(1);
        }
        
        console.log(`${c.dim}ส่งไป token: ${token.substring(0, 30)}...${c.reset}`);
        const result = await sendToToken(token, '🧪 Test Notification', 'ทดสอบจาก script', { type: 'test' });
        
        if (result.success) {
            console.log(`${c.green}✅ สำเร็จ! Message ID: ${result.messageId}${c.reset}`);
        } else {
            console.log(`${c.red}❌ Error: ${result.error}${c.reset}`);
        }
        process.exit(0);
    }
    
    // Interactive mode
    await interactiveMenu();
}

main().catch(err => {
    console.error(`${c.red}❌ Error:${c.reset}`, err.message);
    process.exit(1);
});
