#!/usr/bin/env node
/**
 * Check Firebase Console Settings via Admin SDK
 * ตรวจสอบการตั้งค่า Firebase Console
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

async function main() {
    console.log(`\n${c.cyan}${c.bold}🔥 Firebase Console Checker${c.reset}\n`);

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID;

    console.log(`${c.blue}Project ID:${c.reset} ${projectId}\n`);

    // Initialize Firebase Admin
    const admin = require('firebase-admin');

    if (admin.apps.length === 0) {
        // Support both naming conventions
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;

        if (!privateKey || !clientEmail) {
            console.log(`${c.red}✗ Missing Firebase Admin credentials${c.reset}`);
            console.log(`  CLIENT_EMAIL: ${clientEmail ? '✓' : '✗ MISSING'}`);
            console.log(`  PRIVATE_KEY: ${privateKey ? '✓' : '✗ MISSING'}`);
            process.exit(1);
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        });
    }

    const auth = admin.auth();

    // ============================================
    // 1. List Auth Providers (Sign-in Methods)
    // ============================================
    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.cyan}${c.bold}  1. Authentication Providers (Sign-in Methods)${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}\n`);

    try {
        // Get project config using REST API
        const { google } = require('googleapis');

        // Create auth client
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

        const authClient = new google.auth.GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
        });

        const client = await authClient.getClient();

        // Get Identity Toolkit config
        const identityToolkitUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

        try {
            const response = await client.request({ url: identityToolkitUrl });
            const config = response.data;

            console.log(`  ${c.green}✓${c.reset} Successfully retrieved auth config\n`);

            // Check sign-in providers
            if (config.signIn) {
                console.log(`  ${c.bold}Sign-in Methods:${c.reset}`);

                // Email
                const emailEnabled = config.signIn.email?.enabled;
                console.log(`    ${emailEnabled ? c.green + '✓' : c.red + '✗'}${c.reset} Email/Password: ${emailEnabled ? 'Enabled' : 'Disabled'}`);

                // Phone
                const phoneEnabled = config.signIn.phoneNumber?.enabled;
                console.log(`    ${phoneEnabled ? c.green + '✓' : c.red + '✗'}${c.reset} Phone: ${phoneEnabled ? 'Enabled' : 'Disabled'}`);

                if (!phoneEnabled) {
                    console.log(`\n    ${c.red}${c.bold}⚠️  PHONE AUTH IS DISABLED!${c.reset}`);
                    console.log(`    ${c.yellow}This is why you're getting auth/invalid-app-credential${c.reset}`);
                    console.log(`\n    ${c.cyan}To enable:${c.reset}`);
                    console.log(`    1. Go to Firebase Console > Authentication > Sign-in method`);
                    console.log(`    2. Click on "Phone" provider`);
                    console.log(`    3. Enable it and save`);
                }

                // Anonymous
                const anonymousEnabled = config.signIn.anonymous?.enabled;
                console.log(`    ${anonymousEnabled ? c.green + '✓' : c.dim + '○'}${c.reset} Anonymous: ${anonymousEnabled ? 'Enabled' : 'Disabled'}`);
            }

            // Check authorized domains
            if (config.authorizedDomains) {
                console.log(`\n  ${c.bold}Authorized Domains:${c.reset}`);
                config.authorizedDomains.forEach(domain => {
                    const isLocalhost = domain === 'localhost' || domain.includes('127.0.0.1');
                    const color = isLocalhost ? c.green : c.dim;
                    console.log(`    ${color}•${c.reset} ${domain}`);
                });

                const hasLocalhost = config.authorizedDomains.includes('localhost');
                if (!hasLocalhost) {
                    console.log(`\n    ${c.red}${c.bold}⚠️  LOCALHOST NOT IN AUTHORIZED DOMAINS!${c.reset}`);
                    console.log(`    ${c.yellow}Add "localhost" to authorized domains in Firebase Console${c.reset}`);
                }
            }

        } catch (apiError) {
            if (apiError.code === 403 || apiError.message?.includes('403')) {
                console.log(`  ${c.yellow}⚠${c.reset} Cannot access Identity Toolkit API directly`);
                console.log(`  ${c.dim}(This is normal - need to check via Firebase Console)${c.reset}\n`);
            } else {
                throw apiError;
            }
        }

    } catch (err) {
        console.log(`  ${c.yellow}⚠${c.reset} Could not check providers via API: ${err.message}`);
        console.log(`  ${c.dim}Falling back to basic checks...${c.reset}\n`);
    }

    // ============================================
    // 2. Try to verify a test phone number
    // ============================================
    console.log(`\n${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.cyan}${c.bold}  2. Phone Auth Test${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}\n`);

    // Check if there are any users with phone numbers
    try {
        const listResult = await auth.listUsers(10);
        const phoneUsers = listResult.users.filter(u => u.phoneNumber);

        console.log(`  ${c.blue}ℹ${c.reset} Total users in system: ${listResult.users.length}`);
        console.log(`  ${c.blue}ℹ${c.reset} Users with phone numbers: ${phoneUsers.length}`);

        if (phoneUsers.length > 0) {
            console.log(`\n  ${c.green}✓${c.reset} Phone auth has been used before (${phoneUsers.length} phone users found)`);
        } else {
            console.log(`\n  ${c.yellow}⚠${c.reset} No users with phone numbers found`);
            console.log(`    ${c.dim}This could mean phone auth was never used or is disabled${c.reset}`);
        }
    } catch (listErr) {
        console.log(`  ${c.red}✗${c.reset} Error listing users: ${listErr.message}`);
    }

    // ============================================
    // 3. Check Firestore for config
    // ============================================
    console.log(`\n${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.cyan}${c.bold}  3. System Config Check${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}\n`);

    try {
        const db = admin.firestore();
        const configDoc = await db.collection('settings').doc('system').get();

        if (configDoc.exists) {
            console.log(`  ${c.green}✓${c.reset} System config exists in Firestore`);
        } else {
            console.log(`  ${c.yellow}⚠${c.reset} No system config in Firestore (using defaults)`);
        }
    } catch (dbErr) {
        console.log(`  ${c.red}✗${c.reset} Firestore error: ${dbErr.message}`);
    }

    // ============================================
    // Summary & Links
    // ============================================
    console.log(`\n${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.cyan}${c.bold}  📋 Manual Check Required${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}\n`);

    console.log(`  Please check these settings manually:\n`);

    console.log(`  ${c.bold}1. Phone Auth Provider:${c.reset}`);
    console.log(`     ${c.blue}https://console.firebase.google.com/project/${projectId}/authentication/providers${c.reset}`);
    console.log(`     → Make sure "Phone" is ${c.green}Enabled${c.reset}\n`);

    console.log(`  ${c.bold}2. Authorized Domains:${c.reset}`);
    console.log(`     ${c.blue}https://console.firebase.google.com/project/${projectId}/authentication/settings${c.reset}`);
    console.log(`     → Make sure "localhost" is in the list\n`);

    console.log(`  ${c.bold}3. API Key Restrictions:${c.reset}`);
    console.log(`     ${c.blue}https://console.cloud.google.com/apis/credentials?project=${projectId}${c.reset}`);
    console.log(`     → Check if API key has HTTP referrer restrictions\n`);

    console.log(`  ${c.bold}4. Identity Toolkit API:${c.reset}`);
    console.log(`     ${c.blue}https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${projectId}${c.reset}`);
    console.log(`     → Make sure it's ${c.green}Enabled${c.reset}\n`);

    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}\n`);
}

main().catch(err => {
    console.error(`${c.red}Error: ${err.message}${c.reset}`);
    console.error(err.stack);
    process.exit(1);
});
