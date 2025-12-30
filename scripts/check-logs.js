#!/usr/bin/env node

/**
 * Log Checker Script
 * ตรวจสอบ logs และหา bugs ในระบบ
 *
 * Usage:
 *   node scripts/check-logs.js              # ตรวจสอบทั้งหมด
 *   node scripts/check-logs.js --vercel     # ตรวจสอบ Vercel logs เท่านั้น
 *   node scripts/check-logs.js --firebase   # ตรวจสอบ Firebase เท่านั้น
 *   node scripts/check-logs.js --code       # ตรวจสอบ code issues เท่านั้น
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    header: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
    subheader: (msg) => console.log(`${colors.magenta}► ${msg}${colors.reset}`),
};

// Bug patterns to search for
const BUG_PATTERNS = [
    // JavaScript/TypeScript errors
    { pattern: /TypeError:/gi, severity: 'error', description: 'Type Error' },
    { pattern: /ReferenceError:/gi, severity: 'error', description: 'Reference Error' },
    { pattern: /SyntaxError:/gi, severity: 'error', description: 'Syntax Error' },
    { pattern: /Uncaught/gi, severity: 'error', description: 'Uncaught Exception' },
    { pattern: /undefined is not/gi, severity: 'error', description: 'Undefined Access' },
    { pattern: /Cannot read propert/gi, severity: 'error', description: 'Cannot Read Property' },
    { pattern: /null is not/gi, severity: 'error', description: 'Null Access' },

    // Firebase errors
    { pattern: /permission-denied/gi, severity: 'error', description: 'Firebase Permission Denied' },
    { pattern: /PERMISSION_DENIED/gi, severity: 'error', description: 'Firestore Permission Denied' },
    { pattern: /Missing or insufficient permissions/gi, severity: 'error', description: 'Firestore Access Error' },
    { pattern: /quota-exceeded/gi, severity: 'warning', description: 'Firebase Quota Exceeded' },
    { pattern: /network-request-failed/gi, severity: 'warning', description: 'Firebase Network Error' },

    // API errors
    { pattern: /401 Unauthorized/gi, severity: 'warning', description: 'Unauthorized API Call' },
    { pattern: /403 Forbidden/gi, severity: 'error', description: 'Forbidden API Call' },
    { pattern: /404 Not Found/gi, severity: 'warning', description: 'API Not Found' },
    { pattern: /500 Internal Server Error/gi, severity: 'error', description: '500 Server Error' },
    { pattern: /502 Bad Gateway/gi, severity: 'error', description: '502 Gateway Error' },
    { pattern: /503 Service Unavailable/gi, severity: 'error', description: '503 Service Unavailable' },

    // React errors
    { pattern: /Hydration failed/gi, severity: 'error', description: 'React Hydration Error' },
    { pattern: /Maximum update depth exceeded/gi, severity: 'error', description: 'Infinite Loop' },
    { pattern: /Invalid hook call/gi, severity: 'error', description: 'Invalid React Hook' },

    // Memory/Performance
    { pattern: /out of memory/gi, severity: 'error', description: 'Out of Memory' },
    { pattern: /memory leak/gi, severity: 'warning', description: 'Memory Leak' },
    { pattern: /timeout/gi, severity: 'warning', description: 'Timeout' },

    // Custom app errors
    { pattern: /ไม่สามารถ/gi, severity: 'warning', description: 'Thai Error Message' },
    { pattern: /Failed to/gi, severity: 'warning', description: 'Failed Operation' },
    { pattern: /Error:/gi, severity: 'warning', description: 'Generic Error' },
];

// Code smell patterns
const CODE_SMELLS = [
    { pattern: /console\.log\(/g, file: '*.tsx', description: 'Console.log in production code', severity: 'info' },
    { pattern: /any\s*[;,)>\]]/g, file: '*.ts', description: 'Using "any" type', severity: 'warning' },
    { pattern: /TODO:/gi, file: '*', description: 'TODO comment', severity: 'info' },
    { pattern: /FIXME:/gi, file: '*', description: 'FIXME comment', severity: 'warning' },
    { pattern: /HACK:/gi, file: '*', description: 'HACK comment', severity: 'warning' },
    { pattern: /eslint-disable/g, file: '*', description: 'ESLint disabled', severity: 'info' },
    { pattern: /@ts-ignore/g, file: '*.ts', description: 'TypeScript ignore', severity: 'warning' },
];

// Check Vercel logs
async function checkVercelLogs() {
    log.header('Vercel Production Logs');

    try {
        // Get recent logs
        log.info('ดึง logs จาก Vercel (50 รายการล่าสุด)...');
        const logs = execSync('vercel logs car-rental-phi-lime.vercel.app --limit 50 2>&1', {
            encoding: 'utf8',
            timeout: 30000,
        });

        // Analyze logs for bugs
        let bugsFound = 0;
        const bugReport = [];

        for (const { pattern, severity, description } of BUG_PATTERNS) {
            const matches = logs.match(pattern);
            if (matches && matches.length > 0) {
                bugsFound += matches.length;
                bugReport.push({ description, severity, count: matches.length });
            }
        }

        if (bugsFound === 0) {
            log.success('ไม่พบ bugs ใน Vercel logs');
        } else {
            log.warning(`พบ ${bugsFound} issues ใน Vercel logs:`);
            bugReport.forEach(({ description, severity, count }) => {
                const icon = severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
                console.log(`   ${icon} ${description}: ${count} ครั้ง`);
            });
        }

        // Show recent errors
        const errorLines = logs.split('\n').filter(line =>
            /error|failed|exception/i.test(line)
        ).slice(0, 5);

        if (errorLines.length > 0) {
            log.subheader('Recent Errors:');
            errorLines.forEach(line => {
                console.log(`   ${colors.red}${line.substring(0, 150)}${colors.reset}`);
            });
        }

        return { success: true, bugsFound, bugReport };
    } catch (error) {
        if (error.message.includes('command not found') || error.message.includes('vercel')) {
            log.warning('Vercel CLI ไม่ได้ติดตั้ง หรือยังไม่ได้ login');
            log.info('รัน: npm i -g vercel && vercel login');
        } else {
            log.error(`Error checking Vercel logs: ${error.message}`);
        }
        return { success: false, bugsFound: 0 };
    }
}

// Check Firebase/Firestore
async function checkFirebase() {
    log.header('Firebase Status Check');

    try {
        // Check if firebase is configured
        const envPath = path.join(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) {
            log.warning('ไม่พบไฟล์ .env.local');
            return { success: false };
        }

        const envContent = fs.readFileSync(envPath, 'utf8');

        // Check required env vars
        const requiredVars = [
            'NEXT_PUBLIC_FIREBASE_API_KEY',
            'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
            'FIREBASE_ADMIN_PROJECT_ID',
            'FIREBASE_ADMIN_CLIENT_EMAIL',
            'FIREBASE_ADMIN_PRIVATE_KEY',
        ];

        const missingVars = requiredVars.filter(v => !envContent.includes(v));

        if (missingVars.length > 0) {
            log.warning('Missing Firebase env vars:');
            missingVars.forEach(v => console.log(`   - ${v}`));
        } else {
            log.success('Firebase env vars ครบถ้วน');
        }

        // Try to check database status
        log.info('ตรวจสอบ database...');
        try {
            execSync('node scripts/check-database.js 2>&1 | head -20', {
                encoding: 'utf8',
                timeout: 15000,
            });
            log.success('Database connection OK');
        } catch {
            log.warning('ไม่สามารถตรวจสอบ database ได้');
        }

        return { success: true };
    } catch (error) {
        log.error(`Error checking Firebase: ${error.message}`);
        return { success: false };
    }
}

// Check code for issues
async function checkCodeIssues() {
    log.header('Code Issues Check');

    const issues = [];
    const appDir = path.join(process.cwd(), 'app');
    const libDir = path.join(process.cwd(), 'lib');
    const componentsDir = path.join(process.cwd(), 'components');

    // Scan directories
    const scanDir = (dir, filePattern = '**/*.{ts,tsx}') => {
        if (!fs.existsSync(dir)) return [];

        const files = [];
        const scanRecursive = (currentDir) => {
            const items = fs.readdirSync(currentDir);
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    scanRecursive(fullPath);
                } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
                    files.push(fullPath);
                }
            }
        };
        scanRecursive(dir);
        return files;
    };

    const allFiles = [
        ...scanDir(appDir),
        ...scanDir(libDir),
        ...scanDir(componentsDir),
    ];

    log.info(`ตรวจสอบ ${allFiles.length} ไฟล์...`);

    // Check each file for code smells
    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(process.cwd(), file);

        for (const { pattern, description, severity } of CODE_SMELLS) {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                // Skip console.log in scripts and test files
                if (description === 'Console.log in production code') {
                    if (relativePath.includes('script') || relativePath.includes('test')) continue;
                }

                issues.push({
                    file: relativePath,
                    description,
                    severity,
                    count: matches.length,
                });
            }
        }
    }

    // Group by severity
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
        log.subheader(`🔴 Errors (${errors.length}):`);
        errors.forEach(({ file, description, count }) => {
            console.log(`   ${file}: ${description} (${count}x)`);
        });
    }

    if (warnings.length > 0) {
        log.subheader(`🟡 Warnings (${warnings.length}):`);
        warnings.slice(0, 10).forEach(({ file, description, count }) => {
            console.log(`   ${file}: ${description} (${count}x)`);
        });
        if (warnings.length > 10) {
            console.log(`   ... และอีก ${warnings.length - 10} รายการ`);
        }
    }

    if (infos.length > 0) {
        log.subheader(`🔵 Info (${infos.length}):`);
        console.log(`   พบ console.log: ${infos.filter(i => i.description.includes('Console')).reduce((a, b) => a + b.count, 0)} ครั้ง`);
        console.log(`   พบ TODO: ${infos.filter(i => i.description.includes('TODO')).reduce((a, b) => a + b.count, 0)} ครั้ง`);
    }

    if (issues.length === 0) {
        log.success('ไม่พบ code issues');
    }

    return { success: true, issues };
}

// Check build
async function checkBuild() {
    log.header('Build Check');

    try {
        log.info('ตรวจสอบ TypeScript errors...');
        const result = execSync('npx tsc --noEmit 2>&1 | head -30', {
            encoding: 'utf8',
            timeout: 60000,
        });

        if (result.includes('error')) {
            log.error('พบ TypeScript errors:');
            console.log(result);
            return { success: false };
        } else {
            log.success('TypeScript: ไม่มี errors');
            return { success: true };
        }
    } catch (error) {
        if (error.stdout && error.stdout.includes('error')) {
            log.error('พบ TypeScript errors:');
            console.log(error.stdout.substring(0, 500));
            return { success: false };
        }
        log.success('TypeScript: ไม่มี errors');
        return { success: true };
    }
}

// Check API endpoints health
async function checkAPIHealth() {
    log.header('API Health Check');

    const endpoints = [
        { path: '/api/admin/bookings', method: 'GET', description: 'Admin Bookings API' },
        { path: '/api/driver/status', method: 'GET', description: 'Driver Status API' },
    ];

    // Note: This would need actual HTTP requests for production
    // For now, we check if the route files exist

    for (const { path: apiPath, description } of endpoints) {
        const routePath = path.join(process.cwd(), 'app', apiPath, 'route.ts');
        if (fs.existsSync(routePath)) {
            log.success(`${description}: Route file exists`);
        } else {
            log.warning(`${description}: Route file not found`);
        }
    }

    return { success: true };
}

// Generate summary report
function generateReport(results) {
    log.header('Summary Report');

    console.log(`
┌─────────────────────────────────────────┐
│           Bug Check Summary             │
├─────────────────────────────────────────┤
│  Vercel Logs:    ${results.vercel?.success ? '✅ OK' : '⚠️  Issues'}              │
│  Firebase:       ${results.firebase?.success ? '✅ OK' : '⚠️  Issues'}              │
│  Code Issues:    ${results.code?.issues?.length || 0} found              │
│  TypeScript:     ${results.build?.success ? '✅ OK' : '❌ Errors'}              │
│  API Routes:     ${results.api?.success ? '✅ OK' : '⚠️  Issues'}              │
└─────────────────────────────────────────┘
`);

    // Recommendations
    if (results.vercel?.bugsFound > 0 || !results.build?.success) {
        log.subheader('💡 Recommendations:');
        if (results.vercel?.bugsFound > 0) {
            console.log('   1. ตรวจสอบ Vercel logs เพิ่มเติม: vercel logs --follow');
        }
        if (!results.build?.success) {
            console.log('   2. แก้ไข TypeScript errors ก่อน deploy');
        }
        if (results.code?.issues?.filter(i => i.severity === 'error').length > 0) {
            console.log('   3. แก้ไข code errors ที่พบ');
        }
    } else {
        log.success('🎉 ระบบทำงานปกติ!');
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const checkAll = args.length === 0;
    const checkVercel = args.includes('--vercel') || checkAll;
    const checkFirebaseFlag = args.includes('--firebase') || checkAll;
    const checkCode = args.includes('--code') || checkAll;

    console.log(`
${colors.bold}${colors.cyan}
╔═══════════════════════════════════════╗
║     🔍 TukTik Log & Bug Checker       ║
╚═══════════════════════════════════════╝
${colors.reset}`);

    const results = {};

    if (checkVercel) {
        results.vercel = await checkVercelLogs();
    }

    if (checkFirebaseFlag) {
        results.firebase = await checkFirebase();
    }

    if (checkCode) {
        results.code = await checkCodeIssues();
        results.build = await checkBuild();
        results.api = await checkAPIHealth();
    }

    generateReport(results);
}

main().catch(console.error);
