#!/usr/bin/env node
/**
 * Test Security Headers Script
 * ============================
 * ทดสอบว่า Security Headers ถูกตั้งค่าถูกต้อง
 *
 * Usage:
 *   node scripts/test-security-headers.js                    # Test localhost
 *   TEST_URL=https://example.com node scripts/test-security-headers.js
 */

const https = require('https');
const http = require('http');

// ===================== Configuration =====================
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// ===================== Colors =====================
const c = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

// ===================== Expected Headers =====================
const EXPECTED_HEADERS = [
    {
        name: 'x-content-type-options',
        expected: 'nosniff',
        description: 'ป้องกัน MIME type sniffing',
    },
    {
        name: 'x-frame-options',
        expected: ['DENY', 'SAMEORIGIN'],
        description: 'ป้องกัน Clickjacking',
    },
    {
        name: 'x-xss-protection',
        expected: '1; mode=block',
        description: 'ป้องกัน XSS (legacy browsers)',
    },
    {
        name: 'referrer-policy',
        expected: 'strict-origin-when-cross-origin',
        description: 'ควบคุม Referrer header',
    },
    {
        name: 'permissions-policy',
        expected: null, // Just check existence
        description: 'จำกัดการใช้งาน browser features',
    },
    {
        name: 'content-security-policy',
        expected: null, // Just check existence (value is complex)
        description: 'ป้องกัน XSS และ injection attacks',
    },
    {
        name: 'strict-transport-security',
        expected: null, // Just check existence
        description: 'บังคับใช้ HTTPS (HSTS)',
    },
];

// ===================== Test Results =====================
const results = {
    passed: 0,
    failed: 0,
    tests: [],
};

function recordTest(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
}

// ===================== Fetch Headers =====================
async function fetchHeaders(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const lib = parsedUrl.protocol === 'https:' ? https : http;

        const req = lib.request(url, { method: 'HEAD' }, (res) => {
            resolve({
                statusCode: res.statusCode,
                headers: res.headers,
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
}

// ===================== Main Test =====================
async function main() {
    console.log(`
${c.bright}${c.cyan}╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║          🔒 Security Headers Test                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝${c.reset}
`);

    console.log(`${c.gray}📍 Testing: ${BASE_URL}${c.reset}\n`);

    try {
        const response = await fetchHeaders(BASE_URL);
        console.log(`${c.green}✓${c.reset} Server responded with status ${response.statusCode}\n`);

        console.log(`${c.bright}Checking Security Headers:${c.reset}\n`);

        for (const header of EXPECTED_HEADERS) {
            const actualValue = response.headers[header.name];
            let passed = false;
            let details = '';

            if (actualValue) {
                if (header.expected === null) {
                    // Just check existence
                    passed = true;
                    details = `Found: ${actualValue}`;
                } else if (Array.isArray(header.expected)) {
                    // Check if value matches any expected
                    passed = header.expected.some(exp =>
                        actualValue.toUpperCase() === exp.toUpperCase()
                    );
                    details = passed
                        ? `✓ ${actualValue}`
                        : `Expected: ${header.expected.join(' or ')}, Got: ${actualValue}`;
                } else {
                    // Exact match
                    passed = actualValue.toLowerCase() === header.expected.toLowerCase();
                    details = passed
                        ? `✓ ${actualValue}`
                        : `Expected: ${header.expected}, Got: ${actualValue}`;
                }
            } else {
                details = 'Header not found!';
            }

            const icon = passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
            console.log(`  ${icon} ${c.bright}${header.name}${c.reset}`);
            console.log(`    ${c.gray}${header.description}${c.reset}`);
            console.log(`    ${passed ? c.green : c.red}${details}${c.reset}\n`);

            recordTest(header.name, passed, details);
        }

        // Check for dangerous headers that shouldn't be present
        console.log(`${c.bright}Checking for Dangerous Headers:${c.reset}\n`);

        const dangerousHeaders = [
            { name: 'server', description: 'ไม่ควรเปิดเผย server version' },
            { name: 'x-powered-by', description: 'ไม่ควรเปิดเผย framework' },
        ];

        for (const header of dangerousHeaders) {
            const actualValue = response.headers[header.name];
            const passed = !actualValue; // Passed if NOT present

            const icon = passed ? `${c.green}✓${c.reset}` : `${c.yellow}⚠${c.reset}`;
            const status = passed ? 'Not exposed (good!)' : `Exposed: ${actualValue}`;

            console.log(`  ${icon} ${c.bright}${header.name}${c.reset}`);
            console.log(`    ${c.gray}${header.description}${c.reset}`);
            console.log(`    ${passed ? c.green : c.yellow}${status}${c.reset}\n`);

            recordTest(`No ${header.name}`, passed, status);
        }

    } catch (error) {
        console.log(`${c.red}✗ Failed to connect: ${error.message}${c.reset}`);
        console.log(`${c.yellow}💡 Make sure the server is running: npm run dev${c.reset}\n`);
        process.exit(1);
    }

    // Print Summary
    console.log(`
${c.bright}${c.cyan}╔════════════════════════════════════════════════════════════════╗
║                        TEST SUMMARY                            ║
╚════════════════════════════════════════════════════════════════╝${c.reset}
`);

    for (const test of results.tests) {
        const icon = test.passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
        console.log(`  ${icon} ${test.name}`);
    }

    const total = results.passed + results.failed;
    const percentage = Math.round((results.passed / total) * 100);

    console.log(`
${c.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
  ${c.green}Passed: ${results.passed}${c.reset}  |  ${c.red}Failed: ${results.failed}${c.reset}  |  Score: ${percentage}%
${c.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
`);

    if (results.failed === 0) {
        console.log(`${c.green}🎉 All security headers are properly configured!${c.reset}\n`);
    } else {
        console.log(`${c.yellow}⚠️  Some headers need attention. Check above for details.${c.reset}\n`);
    }

    process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error(`${c.red}Error: ${err.message}${c.reset}`);
    process.exit(1);
});
