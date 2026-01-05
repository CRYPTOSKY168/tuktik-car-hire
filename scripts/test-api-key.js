#!/usr/bin/env node
/**
 * Test Firebase API Key & Phone Auth Configuration
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const https = require('https');

const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
};

function makeRequest(url, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'http://localhost:3000',
                'Origin': 'http://localhost:3000',
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log(`\n${c.cyan}${c.bold}🔑 Firebase API Key & Phone Auth Test${c.reset}\n`);

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    console.log(`${c.blue}API Key:${c.reset} ${apiKey?.substring(0, 20)}...`);
    console.log(`${c.blue}Project ID:${c.reset} ${projectId}\n`);

    // ============================================
    // Test 1: Basic API Key validation
    // ============================================
    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.cyan}${c.bold}  Test 1: API Key Validation${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}\n`);

    try {
        // Test with getProjectConfig endpoint (v2 API)
        const configUrl = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config?key=${apiKey}`;
        const configResult = await makeRequest(configUrl);

        if (configResult.status === 200) {
            console.log(`  ${c.green}✓${c.reset} API Key is valid\n`);

            const config = configResult.data;

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
                    console.log(`\n  ${c.red}${c.bold}❌ PHONE AUTH IS DISABLED!${c.reset}`);
                    console.log(`  ${c.yellow}This is WHY you're getting "auth/invalid-app-credential"${c.reset}\n`);
                    console.log(`  ${c.cyan}To fix:${c.reset}`);
                    console.log(`  1. Go to: https://console.firebase.google.com/project/${projectId}/authentication/providers`);
                    console.log(`  2. Click "Phone" provider`);
                    console.log(`  3. Toggle it ON and Save`);
                }
            }

            // Check authorized domains
            if (config.authorizedDomains) {
                console.log(`\n  ${c.bold}Authorized Domains:${c.reset}`);
                let hasLocalhost = false;
                config.authorizedDomains.forEach(domain => {
                    if (domain === 'localhost') hasLocalhost = true;
                    const color = domain === 'localhost' ? c.green : c.blue;
                    console.log(`    ${color}•${c.reset} ${domain}`);
                });

                if (!hasLocalhost) {
                    console.log(`\n  ${c.red}${c.bold}❌ "localhost" NOT IN AUTHORIZED DOMAINS!${c.reset}`);
                    console.log(`  ${c.cyan}To fix:${c.reset}`);
                    console.log(`  1. Go to: https://console.firebase.google.com/project/${projectId}/authentication/settings`);
                    console.log(`  2. Add "localhost" to authorized domains`);
                }
            }

        } else if (configResult.status === 400) {
            const error = configResult.data?.error;
            console.log(`  ${c.red}✗${c.reset} API Error: ${error?.message || 'Unknown error'}`);

            if (error?.message?.includes('API key not valid')) {
                console.log(`\n  ${c.red}${c.bold}❌ API KEY IS INVALID OR RESTRICTED${c.reset}`);
                console.log(`  ${c.yellow}The API key may have HTTP referrer restrictions blocking localhost${c.reset}\n`);
                console.log(`  ${c.cyan}To fix:${c.reset}`);
                console.log(`  1. Go to: https://console.cloud.google.com/apis/credentials?project=${projectId}`);
                console.log(`  2. Find your API key (usually "Browser key")`);
                console.log(`  3. Under "Application restrictions":`);
                console.log(`     - Set to "None" (less secure but works)`);
                console.log(`     - OR add these to "HTTP referrers":`);
                console.log(`       • localhost`);
                console.log(`       • localhost:3000`);
                console.log(`       • http://localhost/*`);
                console.log(`       • http://localhost:3000/*`);
            }
        } else if (configResult.status === 403) {
            console.log(`  ${c.red}✗${c.reset} Access Denied (403)`);
            console.log(`  ${c.yellow}The API key might be restricted or Identity Toolkit API not enabled${c.reset}`);
        } else {
            console.log(`  ${c.red}✗${c.reset} Unexpected status: ${configResult.status}`);
            console.log(`  Response:`, configResult.data);
        }
    } catch (err) {
        console.log(`  ${c.red}✗${c.reset} Error: ${err.message}`);
    }

    // ============================================
    // Test 2: reCAPTCHA config
    // ============================================
    console.log(`\n${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.cyan}${c.bold}  Test 2: reCAPTCHA Configuration${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}\n`);

    try {
        const recaptchaUrl = `https://identitytoolkit.googleapis.com/v1/recaptchaConfig?key=${apiKey}`;
        const recaptchaResult = await makeRequest(recaptchaUrl);

        if (recaptchaResult.status === 200) {
            console.log(`  ${c.green}✓${c.reset} reCAPTCHA config accessible`);

            const config = recaptchaResult.data;
            if (config.recaptchaEnforcementState) {
                config.recaptchaEnforcementState.forEach(state => {
                    console.log(`    • ${state.provider}: ${state.enforcementState}`);
                });
            }
        } else {
            console.log(`  ${c.yellow}⚠${c.reset} Could not get reCAPTCHA config: ${recaptchaResult.status}`);
            if (recaptchaResult.data?.error) {
                console.log(`    Error: ${recaptchaResult.data.error.message}`);
            }
        }
    } catch (err) {
        console.log(`  ${c.red}✗${c.reset} Error: ${err.message}`);
    }

    // ============================================
    // Summary
    // ============================================
    console.log(`\n${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.cyan}${c.bold}  Quick Fix Links${c.reset}`);
    console.log(`${c.cyan}═══════════════════════════════════════════════════${c.reset}\n`);

    console.log(`  ${c.bold}Enable Phone Auth:${c.reset}`);
    console.log(`  ${c.blue}https://console.firebase.google.com/project/${projectId}/authentication/providers${c.reset}\n`);

    console.log(`  ${c.bold}Add localhost to Authorized Domains:${c.reset}`);
    console.log(`  ${c.blue}https://console.firebase.google.com/project/${projectId}/authentication/settings${c.reset}\n`);

    console.log(`  ${c.bold}Check API Key Restrictions:${c.reset}`);
    console.log(`  ${c.blue}https://console.cloud.google.com/apis/credentials?project=${projectId}${c.reset}\n`);
}

main().catch(err => {
    console.error(`${c.red}Error: ${err.message}${c.reset}`);
    process.exit(1);
});
