#!/usr/bin/env node

/**
 * Real-time Log Monitor
 * ติดตาม logs แบบ real-time และแจ้งเตือนเมื่อพบ bugs
 *
 * Usage:
 *   node scripts/monitor-logs.js              # Monitor Vercel logs
 *   node scripts/monitor-logs.js --dev        # Monitor dev server (localhost)
 */

const { spawn, execSync } = require('child_process');
const readline = require('readline');

// Colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
    bgGreen: '\x1b[42m',
};

// Bug patterns
const ERROR_PATTERNS = [
    { pattern: /error/i, color: colors.red, icon: '🔴' },
    { pattern: /TypeError/i, color: colors.red, icon: '🔴' },
    { pattern: /ReferenceError/i, color: colors.red, icon: '🔴' },
    { pattern: /permission.denied/i, color: colors.red, icon: '🔴' },
    { pattern: /500|502|503/i, color: colors.red, icon: '🔴' },
    { pattern: /ECONNREFUSED/i, color: colors.red, icon: '🔴' },
];

const WARNING_PATTERNS = [
    { pattern: /warning/i, color: colors.yellow, icon: '🟡' },
    { pattern: /401|403|404/i, color: colors.yellow, icon: '🟡' },
    { pattern: /timeout/i, color: colors.yellow, icon: '🟡' },
    { pattern: /deprecated/i, color: colors.yellow, icon: '🟡' },
];

const SUCCESS_PATTERNS = [
    { pattern: /success/i, color: colors.green, icon: '🟢' },
    { pattern: /completed/i, color: colors.green, icon: '🟢' },
    { pattern: /200 OK/i, color: colors.green, icon: '🟢' },
];

// Stats
let stats = {
    errors: 0,
    warnings: 0,
    success: 0,
    total: 0,
    startTime: Date.now(),
};

// Process log line
function processLine(line) {
    stats.total++;

    // Check for errors
    for (const { pattern, color, icon } of ERROR_PATTERNS) {
        if (pattern.test(line)) {
            stats.errors++;
            console.log(`${icon} ${color}${line}${colors.reset}`);
            playAlert();
            return;
        }
    }

    // Check for warnings
    for (const { pattern, color, icon } of WARNING_PATTERNS) {
        if (pattern.test(line)) {
            stats.warnings++;
            console.log(`${icon} ${color}${line}${colors.reset}`);
            return;
        }
    }

    // Check for success
    for (const { pattern, color, icon } of SUCCESS_PATTERNS) {
        if (pattern.test(line)) {
            stats.success++;
            console.log(`${icon} ${color}${line}${colors.reset}`);
            return;
        }
    }

    // Normal log
    console.log(`${colors.gray}${line}${colors.reset}`);
}

// Play alert sound
function playAlert() {
    try {
        // macOS
        execSync('afplay /System/Library/Sounds/Basso.aiff &', { stdio: 'ignore' });
    } catch {
        // Fallback: terminal bell
        process.stdout.write('\x07');
    }
}

// Show stats
function showStats() {
    const runtime = Math.floor((Date.now() - stats.startTime) / 1000);
    const minutes = Math.floor(runtime / 60);
    const seconds = runtime % 60;

    console.log(`
${colors.cyan}╔═══════════════════════════════════════╗
║            📊 Live Stats              ║
╠═══════════════════════════════════════╣
║  Runtime:     ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}                     ║
║  Total Logs:  ${String(stats.total).padStart(5)}                   ║
║  🔴 Errors:   ${String(stats.errors).padStart(5)}                   ║
║  🟡 Warnings: ${String(stats.warnings).padStart(5)}                   ║
║  🟢 Success:  ${String(stats.success).padStart(5)}                   ║
╚═══════════════════════════════════════╝${colors.reset}
`);
}

// Monitor Vercel logs
function monitorVercel() {
    console.log(`
${colors.bold}${colors.cyan}
╔═══════════════════════════════════════╗
║    🔍 Real-time Log Monitor           ║
║    Production: Vercel                 ║
╚═══════════════════════════════════════╝
${colors.reset}
${colors.gray}Press Ctrl+C to stop | Press 's' for stats${colors.reset}
`);

    const vercel = spawn('vercel', ['logs', 'car-rental-phi-lime.vercel.app', '--follow'], {
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    const rl = readline.createInterface({ input: vercel.stdout });
    rl.on('line', processLine);

    vercel.stderr.on('data', (data) => {
        console.error(`${colors.red}${data}${colors.reset}`);
    });

    vercel.on('close', (code) => {
        console.log(`\n${colors.yellow}Monitor stopped (code: ${code})${colors.reset}`);
        showStats();
    });

    // Handle keyboard input
    if (process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
                vercel.kill();
                process.exit();
            }
            if (str === 's') {
                showStats();
            }
        });
    }
}

// Monitor dev server
function monitorDev() {
    console.log(`
${colors.bold}${colors.cyan}
╔═══════════════════════════════════════╗
║    🔍 Real-time Log Monitor           ║
║    Development: localhost:3000        ║
╚═══════════════════════════════════════╝
${colors.reset}
${colors.gray}Press Ctrl+C to stop | Press 's' for stats${colors.reset}
`);

    const npm = spawn('npm', ['run', 'dev'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
    });

    const rlStdout = readline.createInterface({ input: npm.stdout });
    rlStdout.on('line', processLine);

    const rlStderr = readline.createInterface({ input: npm.stderr });
    rlStderr.on('line', processLine);

    npm.on('close', (code) => {
        console.log(`\n${colors.yellow}Dev server stopped (code: ${code})${colors.reset}`);
        showStats();
    });

    // Handle keyboard input
    if (process.stdin.isTTY) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
                npm.kill();
                process.exit();
            }
            if (str === 's') {
                showStats();
            }
        });
    }
}

// Main
const args = process.argv.slice(2);
const isDev = args.includes('--dev');

if (isDev) {
    monitorDev();
} else {
    monitorVercel();
}
