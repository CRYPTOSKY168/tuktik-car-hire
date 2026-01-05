#!/usr/bin/env node
/**
 * Check Firebase Phone Auth Configuration
 * ตรวจสอบการตั้งค่า Firebase Phone Authentication
 *
 * Usage: node scripts/check-phone-auth.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
};

function print(text, color = '') {
    console.log(`${color}${text}${c.reset}`);
}

function printHeader(text) {
    console.log('');
    print('═'.repeat(60), c.cyan);
    print(`  ${text}`, c.cyan + c.bold);
    print('═'.repeat(60), c.cyan);
}

function printCheck(passed, text) {
    const icon = passed ? '✓' : '✗';
    const color = passed ? c.green : c.red;
    console.log(`  ${color}${icon}${c.reset} ${text}`);
    return passed;
}

function printWarning(text) {
    console.log(`  ${c.yellow}⚠${c.reset} ${text}`);
}

function printInfo(text) {
    console.log(`  ${c.blue}ℹ${c.reset} ${text}`);
}

async function main() {
    console.clear();
    print(`
╔══════════════════════════════════════════════════════════╗
║     🔥 Firebase Phone Auth Diagnostic Tool               ║
╚══════════════════════════════════════════════════════════╝
`, c.cyan);

    let issues = [];
    let warnings = [];

    // ============================================
    // 1. Check Environment Variables
    // ============================================
    printHeader('1. Environment Variables');

    const requiredEnvVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    ];

    let allEnvPresent = true;
    for (const envVar of requiredEnvVars) {
        const value = process.env[envVar];
        const present = !!value;
        if (!present) allEnvPresent = false;
        printCheck(present, `${envVar}: ${present ? value.substring(0, 20) + '...' : 'MISSING!'}`);
    }

    if (!allEnvPresent) {
        issues.push('Missing required environment variables');
    }

    // ============================================
    // 2. Check Firebase Config Details
    // ============================================
    printHeader('2. Firebase Configuration Analysis');

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // Check API Key format
    if (apiKey) {
        const validApiKeyFormat = apiKey.startsWith('AIza') && apiKey.length >= 35;
        printCheck(validApiKeyFormat, `API Key format: ${validApiKeyFormat ? 'Valid' : 'Invalid (should start with AIza)'}`);
        if (!validApiKeyFormat) issues.push('Invalid API Key format');
    }

    // Check Auth Domain
    if (authDomain) {
        const validAuthDomain = authDomain.includes('.firebaseapp.com') || authDomain.includes('.web.app');
        printCheck(validAuthDomain, `Auth Domain: ${authDomain}`);
        if (!validAuthDomain) warnings.push('Auth Domain should be *.firebaseapp.com or *.web.app');
    }

    // Check Project ID
    if (projectId) {
        printCheck(true, `Project ID: ${projectId}`);
    }

    // ============================================
    // 3. Check for Common Issues
    // ============================================
    printHeader('3. Common Phone Auth Issues');

    // Issue 1: Authorized Domains
    print('\n  📋 Authorized Domains (must be configured in Firebase Console):', c.dim);
    printInfo('localhost');
    printInfo('127.0.0.1');
    printInfo(authDomain || 'your-project.firebaseapp.com');
    printInfo('car-rental-phi-lime.vercel.app (production)');

    printWarning('Go to Firebase Console > Authentication > Settings > Authorized domains');
    printWarning('Make sure "localhost" is in the list');

    // Issue 2: Phone Auth Provider
    print('\n  📋 Phone Authentication Provider:', c.dim);
    printWarning('Go to Firebase Console > Authentication > Sign-in method');
    printWarning('Make sure "Phone" provider is ENABLED');

    // Issue 3: reCAPTCHA
    print('\n  📋 reCAPTCHA Configuration:', c.dim);
    printInfo('Firebase uses invisible reCAPTCHA for phone auth');
    printWarning('If you see "auth/invalid-app-credential":');
    printWarning('  1. The reCAPTCHA verification failed');
    printWarning('  2. Or the domain is not authorized');
    printWarning('  3. Or there\'s an API key restriction issue');

    // ============================================
    // 4. Test Firebase Admin Connection
    // ============================================
    printHeader('4. Firebase Admin SDK Check');

    try {
        const admin = require('firebase-admin');

        // Initialize if not already
        if (admin.apps.length === 0) {
            const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
            if (privateKey) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || projectId,
                        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                        privateKey: privateKey.replace(/\\n/g, '\n'),
                    }),
                });
            }
        }

        if (admin.apps.length > 0) {
            printCheck(true, 'Firebase Admin SDK initialized');

            // Try to get auth settings
            try {
                const auth = admin.auth();
                printCheck(true, 'Firebase Auth service accessible');

                // Try to list sign-in providers (this might fail without proper permissions)
                // We'll skip this as it requires additional permissions

            } catch (authErr) {
                printCheck(false, `Firebase Auth error: ${authErr.message}`);
                issues.push('Cannot access Firebase Auth service');
            }
        } else {
            printCheck(false, 'Firebase Admin SDK not initialized (missing credentials)');
            warnings.push('Cannot verify server-side Firebase config');
        }
    } catch (err) {
        printCheck(false, `Firebase Admin error: ${err.message}`);
    }

    // ============================================
    // 5. API Key Restrictions Check
    // ============================================
    printHeader('5. API Key Restrictions (Important!)');

    printInfo('The "auth/invalid-app-credential" error often occurs because:');
    print('');
    printWarning('API Key may have HTTP referrer restrictions that block localhost');
    print('');
    print('  📋 To fix:', c.yellow);
    print('  1. Go to Google Cloud Console: https://console.cloud.google.com', c.dim);
    print('  2. Select your project: ' + (projectId || 'your-project'), c.dim);
    print('  3. Go to APIs & Services > Credentials', c.dim);
    print('  4. Find your API key (Browser key)', c.dim);
    print('  5. Under "Application restrictions":', c.dim);
    print('     - Either set to "None" (less secure)', c.dim);
    print('     - Or add these to "HTTP referrers":', c.dim);
    print('       • localhost', c.dim);
    print('       • localhost:3000', c.dim);
    print('       • http://localhost:3000/*', c.dim);
    print('       • http://localhost/*', c.dim);
    print('       • https://car-rental-phi-lime.vercel.app/*', c.dim);
    print('');

    // ============================================
    // 6. Check if Identity Toolkit API is enabled
    // ============================================
    printHeader('6. Required Google Cloud APIs');

    print('  📋 These APIs must be enabled in Google Cloud Console:', c.dim);
    printInfo('Identity Toolkit API (for phone auth)');
    printInfo('Token Service API');
    print('');
    printWarning('Go to: https://console.cloud.google.com/apis/library');
    printWarning('Search for "Identity Toolkit API" and enable it');

    // ============================================
    // Summary
    // ============================================
    printHeader('📊 Summary');

    if (issues.length === 0 && warnings.length === 0) {
        print('  ✅ No obvious issues found in configuration', c.green);
    }

    if (issues.length > 0) {
        print('\n  ❌ Issues Found:', c.red);
        issues.forEach(issue => print(`     • ${issue}`, c.red));
    }

    if (warnings.length > 0) {
        print('\n  ⚠️  Warnings:', c.yellow);
        warnings.forEach(warning => print(`     • ${warning}`, c.yellow));
    }

    // ============================================
    // Recommended Actions
    // ============================================
    printHeader('🔧 Recommended Actions');

    print(`
  Most likely cause of "auth/invalid-app-credential":

  ${c.yellow}1. Check Authorized Domains in Firebase Console${c.reset}
     Firebase Console > Authentication > Settings > Authorized domains
     Add: localhost

  ${c.yellow}2. Enable Phone Auth Provider${c.reset}
     Firebase Console > Authentication > Sign-in method
     Enable: Phone

  ${c.yellow}3. Check API Key Restrictions${c.reset}
     Google Cloud Console > APIs & Services > Credentials
     Your API key > Application restrictions
     Add localhost to allowed HTTP referrers

  ${c.yellow}4. Enable Identity Toolkit API${c.reset}
     Google Cloud Console > APIs & Services > Library
     Search and enable: Identity Toolkit API

  ${c.yellow}5. Wait 5-10 minutes${c.reset}
     After making changes, it may take a few minutes to propagate

  ${c.cyan}Quick Links:${c.reset}
  • Firebase Console: https://console.firebase.google.com/project/${projectId || 'YOUR_PROJECT'}/authentication/providers
  • Google Cloud Console: https://console.cloud.google.com/apis/credentials?project=${projectId || 'YOUR_PROJECT'}
`);

    print('═'.repeat(60), c.cyan);
}

main().catch(err => {
    console.error(`${c.red}Error: ${err.message}${c.reset}`);
    process.exit(1);
});
