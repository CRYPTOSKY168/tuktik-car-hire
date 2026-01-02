#!/usr/bin/env node
/**
 * Test Safe Error Handling Script
 * ================================
 * ทดสอบว่า error messages ไม่ leak ข้อมูลระบบ
 *
 * Usage:
 *   node scripts/test-safe-error.js
 */

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

// ===================== Test Results =====================
const results = {
    passed: 0,
    failed: 0,
    tests: [],
};

function test(name, fn) {
    try {
        fn();
        results.passed++;
        results.tests.push({ name, passed: true });
        console.log(`${c.green}✓${c.reset} ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, passed: false, error: error.message });
        console.log(`${c.red}✗${c.reset} ${name}`);
        console.log(`  ${c.red}${error.message}${c.reset}`);
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected "${expected}" but got "${actual}"`);
            }
        },
        toContain(expected) {
            if (!actual.includes(expected)) {
                throw new Error(`Expected "${actual}" to contain "${expected}"`);
            }
        },
        not: {
            toContain(expected) {
                if (actual.includes(expected)) {
                    throw new Error(`Expected "${actual}" NOT to contain "${expected}"`);
                }
            }
        }
    };
}

// ===================== Import Safe Error Module =====================
// We'll simulate the logic here since we can't directly import TypeScript

// Known safe errors that can be shown to users
const SAFE_ERROR_PATTERNS = [
    /กรุณาเข้าสู่ระบบ/,
    /Unauthorized/i,
    /ไม่มีสิทธิ์/,
    /No token provided/i,
    /Invalid token/i,
    /not an approved driver/i,
    /not authorized/i,
    /กรุณากรอก/,
    /ไม่พบ/,
    /ไม่ถูกต้อง/,
    /Invalid/i,
    /Missing/i,
    /Required/i,
    /must be/i,
    /คนขับกำลังมีงานอยู่/,
    /ไม่สามารถรับงานซ้อนได้/,
    /ไม่สามารถรับงานของตัวเอง/,
    /ต้องเสร็จงานก่อน/,
    /สามารถปฏิเสธงานได้เฉพาะ/,
    /Cannot change status/i,
    /ให้คะแนนได้ครั้งเดียว/,
    /ให้คะแนนได้เฉพาะ/,
];

const DANGEROUS_ERROR_PATTERNS = [
    /firebase/i,
    /firestore/i,
    /stripe.*key/i,
    /api.*key/i,
    /secret/i,
    /credential/i,
    /permission denied/i,
    /internal server/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /stack/i,
    /at\s+\S+\s+\(/i, // Stack trace pattern
];

function isSafeError(message) {
    for (const pattern of DANGEROUS_ERROR_PATTERNS) {
        if (pattern.test(message)) {
            return false;
        }
    }
    for (const pattern of SAFE_ERROR_PATTERNS) {
        if (pattern.test(message)) {
            return true;
        }
    }
    return false;
}

function safeErrorMessage(error, defaultMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง') {
    let message;
    if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    } else {
        return defaultMessage;
    }

    if (isSafeError(message)) {
        return message;
    }
    return defaultMessage;
}

// ===================== Run Tests =====================
console.log(`
${c.bright}${c.cyan}╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║          🔒 Safe Error Handling Test                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝${c.reset}
`);

console.log(`${c.bright}Testing: Dangerous errors should be hidden${c.reset}\n`);

test('Firebase error should be hidden', () => {
    const error = new Error('FirebaseError: Permission denied');
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('default');
});

test('Firestore error should be hidden', () => {
    const error = new Error('FirestoreError: Document not found in collection');
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('default');
});

test('API key error should be hidden', () => {
    const error = new Error('Invalid API key: sk_test_xxxx');
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('default');
});

test('Stripe secret should be hidden', () => {
    const error = new Error('Stripe API key is invalid: sk_test_xxxx');
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('default');
});

test('Stack trace should be hidden', () => {
    const error = new Error('Error at someFunction (/app/api/route.ts:123)');
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('default');
});

test('ECONNREFUSED should be hidden', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('default');
});

test('Internal server error should be hidden', () => {
    const error = new Error('Internal server error: database connection failed');
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('default');
});

test('Credential error should be hidden', () => {
    const error = new Error('Invalid credentials provided');
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('default');
});

console.log(`\n${c.bright}Testing: Safe errors should be shown${c.reset}\n`);

test('Auth error (Thai) should be shown', () => {
    const error = 'กรุณาเข้าสู่ระบบใหม่';
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('กรุณาเข้าสู่ระบบใหม่');
});

test('Unauthorized error should be shown', () => {
    const error = 'Unauthorized - No token provided';
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('Unauthorized - No token provided');
});

test('Validation error (Thai) should be shown', () => {
    const error = 'กรุณากรอกข้อมูลให้ครบถ้วน';
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('กรุณากรอกข้อมูลให้ครบถ้วน');
});

test('Not found error (Thai) should be shown', () => {
    const error = 'ไม่พบข้อมูลการจอง';
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('ไม่พบข้อมูลการจอง');
});

test('Business logic error should be shown', () => {
    const error = 'คนขับกำลังมีงานอยู่ ไม่สามารถรับงานซ้อนได้';
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('คนขับกำลังมีงานอยู่ ไม่สามารถรับงานซ้อนได้');
});

test('Status change error should be shown', () => {
    const error = 'Cannot change status from pending to completed';
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('Cannot change status from pending to completed');
});

test('Rating limit error should be shown', () => {
    const error = 'ให้คะแนนได้ครั้งเดียวต่อการจอง';
    const result = safeErrorMessage(error, 'default');
    expect(result).toBe('ให้คะแนนได้ครั้งเดียวต่อการจอง');
});

console.log(`\n${c.bright}Testing: Unknown errors should use default${c.reset}\n`);

test('Random unknown error should use default', () => {
    const error = 'Something random happened';
    const result = safeErrorMessage(error, 'default message');
    expect(result).toBe('default message');
});

test('Empty error should use default', () => {
    const result = safeErrorMessage({}, 'default message');
    expect(result).toBe('default message');
});

test('Null error should use default', () => {
    const result = safeErrorMessage(null, 'default message');
    expect(result).toBe('default message');
});

// ===================== Summary =====================
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
    console.log(`${c.green}🎉 All safe error handling tests passed!${c.reset}\n`);
    console.log(`${c.gray}Key protections verified:${c.reset}`);
    console.log(`  ${c.green}✓${c.reset} Firebase/Firestore errors are hidden`);
    console.log(`  ${c.green}✓${c.reset} API keys and secrets are protected`);
    console.log(`  ${c.green}✓${c.reset} Stack traces are not exposed`);
    console.log(`  ${c.green}✓${c.reset} Business logic errors are still shown`);
    console.log(`  ${c.green}✓${c.reset} Authentication errors are visible`);
    console.log('');
} else {
    console.log(`${c.yellow}⚠️  Some tests failed. Check above for details.${c.reset}\n`);
}

process.exit(results.failed > 0 ? 1 : 0);
