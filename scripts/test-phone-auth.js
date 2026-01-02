#!/usr/bin/env node
/**
 * Test Phone Authentication Script
 * ทดสอบ Firebase Phone Auth โดยตรงผ่าน REST API
 *
 * Usage: node scripts/test-phone-auth.js [phone_number]
 * Example: node scripts/test-phone-auth.js 0890565061
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Colors for output
const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
};

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

async function checkFirebaseConfig() {
    console.log(`\n${c.cyan}🔧 Checking Firebase Configuration${c.reset}\n`);

    console.log(`  API Key: ${API_KEY ? c.green + '✓ Found' + c.reset : c.red + '✗ Missing' + c.reset}`);
    console.log(`  Project ID: ${PROJECT_ID ? c.green + PROJECT_ID + c.reset : c.red + 'Missing' + c.reset}`);

    if (!API_KEY) {
        console.log(`\n${c.red}❌ NEXT_PUBLIC_FIREBASE_API_KEY not found in .env.local${c.reset}`);
        return false;
    }
    return true;
}

async function getRecaptchaConfig() {
    console.log(`\n${c.cyan}🔐 Checking reCAPTCHA Configuration${c.reset}\n`);

    try {
        const url = `https://identitytoolkit.googleapis.com/v1/recaptchaParams?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.log(`  ${c.red}Error: ${data.error.message}${c.reset}`);
            return null;
        }

        console.log(`  reCAPTCHA Site Key: ${c.green}${data.recaptchaSiteKey?.substring(0, 20)}...${c.reset}`);
        console.log(`  Producer Project: ${c.dim}${data.producerProjectNumber}${c.reset}`);

        return data;
    } catch (error) {
        console.log(`  ${c.red}Error fetching reCAPTCHA config: ${error.message}${c.reset}`);
        return null;
    }
}

async function sendVerificationCode(phoneNumber) {
    console.log(`\n${c.cyan}📱 Sending Verification Code${c.reset}\n`);
    console.log(`  Phone: ${c.yellow}${phoneNumber}${c.reset}`);

    // Format phone number for Thailand
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '+66' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+66' + formattedPhone;
    }

    console.log(`  Formatted: ${c.yellow}${formattedPhone}${c.reset}`);

    try {
        // First, we need to get a reCAPTCHA token
        // For server-side testing, we'll use the REST API directly
        // Note: This requires reCAPTCHA verification which we can't do from server

        const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber: formattedPhone,
                // recaptchaToken is required but we don't have it from server-side
                // This will show us the error message from Firebase
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.log(`\n  ${c.yellow}⚠️ Expected Error (no reCAPTCHA token):${c.reset}`);
            console.log(`  Code: ${c.red}${data.error.code}${c.reset}`);
            console.log(`  Message: ${c.red}${data.error.message}${c.reset}`);

            if (data.error.message.includes('MISSING_RECAPTCHA_TOKEN')) {
                console.log(`\n  ${c.green}✓ Firebase Phone Auth is ENABLED and working!${c.reset}`);
                console.log(`  ${c.dim}(reCAPTCHA token required - this is expected for security)${c.reset}`);
                return { success: true, needsRecaptcha: true };
            }

            if (data.error.message.includes('OPERATION_NOT_ALLOWED')) {
                console.log(`\n  ${c.red}❌ Phone Auth is DISABLED in Firebase Console!${c.reset}`);
                console.log(`  ${c.yellow}→ Go to Firebase Console → Authentication → Sign-in method → Enable Phone${c.reset}`);
                return { success: false, reason: 'disabled' };
            }

            if (data.error.message.includes('INVALID_PHONE_NUMBER')) {
                console.log(`\n  ${c.red}❌ Invalid phone number format${c.reset}`);
                return { success: false, reason: 'invalid_phone' };
            }

            return { success: false, reason: data.error.message };
        }

        // If we got here without error, verification was sent (unlikely without reCAPTCHA)
        console.log(`\n  ${c.green}✓ Verification code sent!${c.reset}`);
        console.log(`  Session Info: ${data.sessionInfo?.substring(0, 30)}...`);
        return { success: true, sessionInfo: data.sessionInfo };

    } catch (error) {
        console.log(`  ${c.red}Network Error: ${error.message}${c.reset}`);
        return { success: false, reason: error.message };
    }
}

async function checkSignInMethods() {
    console.log(`\n${c.cyan}🔍 Checking Sign-in Methods${c.reset}\n`);

    try {
        // Check what sign-in methods are enabled for a test email
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identifier: 'test@example.com',
                continueUri: 'https://car-rental-phi-lime.vercel.app',
            }),
        });

        const data = await response.json();

        if (data.signinMethods) {
            console.log(`  Available methods: ${c.green}${data.signinMethods.join(', ') || 'None'}${c.reset}`);
        }

        if (data.error) {
            console.log(`  ${c.yellow}Note: ${data.error.message}${c.reset}`);
        }

    } catch (error) {
        console.log(`  ${c.red}Error: ${error.message}${c.reset}`);
    }
}

async function testWithAdminSDK(phoneNumber) {
    console.log(`\n${c.cyan}🔑 Testing with Firebase Admin SDK${c.reset}\n`);

    try {
        const admin = require('firebase-admin');

        // Initialize if not already
        if (admin.apps.length === 0) {
            const serviceAccount = require('../service-account.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }

        // Format phone number
        let formattedPhone = phoneNumber.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+66' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+66' + formattedPhone;
        }

        // Check if user exists with this phone
        try {
            const user = await admin.auth().getUserByPhoneNumber(formattedPhone);
            console.log(`  ${c.green}✓ User exists with this phone:${c.reset}`);
            console.log(`    UID: ${user.uid}`);
            console.log(`    Email: ${user.email || 'None'}`);
            console.log(`    Phone: ${user.phoneNumber}`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`  ${c.yellow}ℹ No user registered with ${formattedPhone}${c.reset}`);
                console.log(`  ${c.dim}(This is OK - user will be created on first login)${c.reset}`);
            } else {
                console.log(`  ${c.red}Error: ${error.message}${c.reset}`);
            }
        }

        // List auth providers
        console.log(`\n  ${c.cyan}Checking project auth settings...${c.reset}`);
        const projectConfig = await admin.auth().projectConfigManager().getProjectConfig();
        console.log(`  ${c.dim}Project config retrieved${c.reset}`);

    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.log(`  ${c.yellow}service-account.json not found${c.reset}`);
        } else {
            console.log(`  ${c.red}Error: ${error.message}${c.reset}`);
        }
    }
}

async function main() {
    console.log(`${c.cyan}╔═══════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}║     Firebase Phone Authentication Test Script         ║${c.reset}`);
    console.log(`${c.cyan}╚═══════════════════════════════════════════════════════╝${c.reset}`);

    const phoneNumber = process.argv[2] || '0890565061';

    // 1. Check Firebase config
    const configOk = await checkFirebaseConfig();
    if (!configOk) {
        process.exit(1);
    }

    // 2. Check reCAPTCHA config
    await getRecaptchaConfig();

    // 3. Check sign-in methods
    await checkSignInMethods();

    // 4. Test sending verification (will fail without reCAPTCHA but shows if enabled)
    const result = await sendVerificationCode(phoneNumber);

    // 5. Test with Admin SDK
    await testWithAdminSDK(phoneNumber);

    // Summary
    console.log(`\n${c.cyan}═══════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.cyan}                      SUMMARY                           ${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════════${c.reset}\n`);

    if (result.success || result.needsRecaptcha) {
        console.log(`  ${c.green}✓ Firebase Phone Auth is properly configured!${c.reset}`);
        console.log(`\n  ${c.yellow}Note for Capacitor/Android:${c.reset}`);
        console.log(`  The error in the app might be due to:`);
        console.log(`  1. ${c.dim}Emulator without Google Play Services${c.reset}`);
        console.log(`  2. ${c.dim}SafetyNet/Play Integrity not available${c.reset}`);
        console.log(`  3. ${c.dim}Plugin initialization issue${c.reset}`);
        console.log(`\n  ${c.cyan}Recommended:${c.reset}`);
        console.log(`  - Test on a real Android device with Google Play Services`);
        console.log(`  - Or use Firebase Test Phone Numbers (no SMS sent)`);
    } else {
        console.log(`  ${c.red}✗ Phone Auth issue: ${result.reason}${c.reset}`);
    }

    console.log(`\n${c.dim}Done.${c.reset}\n`);
}

main().catch(console.error);
