#!/usr/bin/env node
/**
 * 🔔 Simple Push Notification Test
 * ส่ง notification ไปยัง Android app โดยตรง
 */

const https = require('https');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Colors
const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
};

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Get Google OAuth2 access token
async function getAccessToken() {
    const { GoogleAuth } = require('google-auth-library');
    
    // Try service account file first
    const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
    
    let auth;
    if (fs.existsSync(serviceAccountPath)) {
        console.log(`${c.dim}Using service-account.json${c.reset}`);
        auth = new GoogleAuth({
            keyFile: serviceAccountPath,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
    } else {
        // Use env vars
        const credentials = {
            type: 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
        };
        
        auth = new GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
    }
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
}

// Send FCM message
async function sendFcmMessage(token, title, body, data = {}) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'y9kwjw47a2jytykyv2mlbyok4qw47i';
    const accessToken = await getAccessToken();
    
    const message = {
        message: {
            token: token,
            notification: {
                title: title,
                body: body,
            },
            data: data,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channel_id: 'default',
                },
            },
        },
    };
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'fcm.googleapis.com',
            path: `/v1/projects/${projectId}/messages:send`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`FCM Error ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(JSON.stringify(message));
        req.end();
    });
}

// Main
async function main() {
    console.log(`\n${c.cyan}╔════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}║  🔔 Push Notification Test (Simple)    ║${c.reset}`);
    console.log(`${c.cyan}╚════════════════════════════════════════╝${c.reset}\n`);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const question = (q) => new Promise(resolve => rl.question(q, resolve));
    
    // Get FCM token from user
    console.log(`${c.yellow}📱 วิธีดู FCM Token:${c.reset}`);
    console.log(`   1. เปิดแอปบน Emulator`);
    console.log(`   2. Logcat → Filter: "Capacitor" หรือ "chromium"`);
    console.log(`   3. หา "[Capacitor] 🔑 FCM Token: xxxxx..."${c.reset}\n`);
    
    const fcmToken = await question(`${c.cyan}วาง FCM Token: ${c.reset}`);
    
    if (!fcmToken || fcmToken.length < 20) {
        console.log(`${c.red}❌ Token ไม่ถูกต้อง${c.reset}`);
        rl.close();
        return;
    }
    
    console.log(`\n${c.dim}กำลังส่ง notification...${c.reset}`);
    
    try {
        const result = await sendFcmMessage(
            fcmToken.trim(),
            '🎉 ทดสอบสำเร็จ!',
            'Push notification ทำงานปกติแล้ว',
            { type: 'test', timestamp: Date.now().toString() }
        );
        
        console.log(`\n${c.green}╔════════════════════════════════════════╗${c.reset}`);
        console.log(`${c.green}║  ✅ ส่ง Notification สำเร็จ!           ║${c.reset}`);
        console.log(`${c.green}╚════════════════════════════════════════╝${c.reset}`);
        console.log(`${c.dim}Message: ${result.name}${c.reset}`);
        console.log(`\n${c.yellow}📱 ดูบน Emulator - notification ควรเด้งขึ้นมา!${c.reset}`);
        
    } catch (error) {
        console.log(`\n${c.red}❌ Error: ${error.message}${c.reset}`);
        
        if (error.message.includes('401') || error.message.includes('403')) {
            console.log(`\n${c.yellow}💡 ต้อง download service-account.json ใหม่:${c.reset}`);
            console.log(`   1. ไป Firebase Console → Project Settings → Service accounts`);
            console.log(`   2. กด "Generate new private key"`);
            console.log(`   3. Save เป็น: ${c.cyan}service-account.json${c.reset} ในโฟลเดอร์โปรเจค`);
            console.log(`   4. รัน script นี้อีกครั้ง`);
        }
    }
    
    rl.close();
}

main();
