#!/usr/bin/env node
/**
 * Payment Flow Checker Script
 * ตรวจสอบ bugs และ flow การทำงานของระบบชำระเงิน
 *
 * Usage: node scripts/check-payment-flow.js
 *
 * สิ่งที่ตรวจสอบ:
 * 1. FieldValue.serverTimestamp() ใน array (Firebase bug)
 * 2. API parameters ถูกต้อง
 * 3. Payment flow ครบถ้วน
 * 4. Refund flow ครบถ้วน
 */

const fs = require('fs');
const path = require('path');

// Colors
const c = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
};

let errors = [];
let warnings = [];
let passed = [];

console.log(`\n${c.cyan}${c.bold}🔍 Payment Flow Checker${c.reset}\n`);
console.log('='.repeat(60));

// ============================================================
// CHECK 1: FieldValue.serverTimestamp() ใน array
// ============================================================
console.log(`\n${c.blue}[1/4] Checking FieldValue.serverTimestamp() in arrays...${c.reset}`);

const apiFiles = [
    'app/api/payment/confirm/route.ts',
    'app/api/payment/refund/route.ts',
    'app/api/payment/create-intent/route.ts',
    'app/api/driver/bookings/route.ts',
    'app/api/booking/assign-driver/route.ts',
    'app/api/booking/rate/route.ts',
];

apiFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
        warnings.push(`File not found: ${file}`);
        return;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');

    // More accurate check: look for pattern like:
    // statusHistory.push({
    //     ...
    //     timestamp: FieldValue.serverTimestamp()  <-- BUG!
    //     ...
    // });
    const pushPattern = /\.push\(\{[\s\S]*?timestamp:\s*FieldValue\.serverTimestamp\(\)[\s\S]*?\}\)/g;
    const matches = content.match(pushPattern);

    if (matches) {
        matches.forEach(match => {
            // Find line number
            const index = content.indexOf(match);
            const lineNum = content.substring(0, index).split('\n').length;
            errors.push(`${file}:${lineNum} - FieldValue.serverTimestamp() ใน .push() array! ใช้ Timestamp.now() แทน`);
        });
    }

    // Check if Timestamp is imported when Timestamp.now() is used
    if (content.includes('Timestamp.now()') && !content.includes("from 'firebase-admin/firestore'")) {
        errors.push(`${file} - ใช้ Timestamp.now() แต่ไม่ได้ import Timestamp`);
    }
});

if (errors.length === 0) {
    passed.push('FieldValue.serverTimestamp() check passed');
    console.log(`   ${c.green}✓ No FieldValue.serverTimestamp() in arrays${c.reset}`);
}

// ============================================================
// CHECK 2: API Parameters
// ============================================================
console.log(`\n${c.blue}[2/4] Checking API parameters...${c.reset}`);

// Check refund API expects bookingId
const refundApiPath = path.join(process.cwd(), 'app/api/payment/refund/route.ts');
if (fs.existsSync(refundApiPath)) {
    const refundContent = fs.readFileSync(refundApiPath, 'utf-8');

    if (refundContent.includes("const { bookingId, reason } = body")) {
        passed.push('Refund API expects bookingId');
        console.log(`   ${c.green}✓ Refund API expects bookingId${c.reset}`);
    } else {
        errors.push('Refund API should expect bookingId parameter');
    }
}

// Check confirm API expects bookingId
const confirmApiPath = path.join(process.cwd(), 'app/api/payment/confirm/route.ts');
if (fs.existsSync(confirmApiPath)) {
    const confirmContent = fs.readFileSync(confirmApiPath, 'utf-8');

    if (confirmContent.includes("const { bookingId } = body")) {
        passed.push('Confirm API expects bookingId');
        console.log(`   ${c.green}✓ Confirm API expects bookingId${c.reset}`);
    } else {
        errors.push('Confirm API should expect bookingId parameter');
    }
}

// Check test-maps1 sends correct params to refund API
const testMaps1Path = path.join(process.cwd(), 'app/test-maps1/page.tsx');
if (fs.existsSync(testMaps1Path)) {
    const testMaps1Content = fs.readFileSync(testMaps1Path, 'utf-8');

    // Check refund call uses bookingId
    if (testMaps1Content.includes("bookingId: activeBooking.id") &&
        testMaps1Content.includes("/api/payment/refund")) {
        passed.push('test-maps1 sends bookingId to refund API');
        console.log(`   ${c.green}✓ test-maps1 sends bookingId to refund API${c.reset}`);
    } else if (testMaps1Content.includes("paymentIntentId:") &&
               testMaps1Content.includes("/api/payment/refund")) {
        errors.push('test-maps1 sends paymentIntentId instead of bookingId to refund API!');
    }
}

// ============================================================
// CHECK 3: Payment Flow Completeness
// ============================================================
console.log(`\n${c.blue}[3/4] Checking Payment Flow completeness...${c.reset}`);

const paymentFlowChecks = [
    {
        name: 'Create Intent API exists',
        file: 'app/api/payment/create-intent/route.ts',
        check: (content) => content.includes('paymentIntents.create'),
    },
    {
        name: 'Confirm API updates paymentStatus to paid',
        file: 'app/api/payment/confirm/route.ts',
        check: (content) => content.includes("paymentStatus: 'paid'"),
    },
    {
        name: 'Confirm API records paymentCompletedAt',
        file: 'app/api/payment/confirm/route.ts',
        check: (content) => content.includes('paymentCompletedAt'),
    },
    {
        name: 'Confirm API updates status to pending',
        file: 'app/api/payment/confirm/route.ts',
        check: (content) => content.includes("status: 'pending'"),
    },
    {
        name: 'Refund API exists',
        file: 'app/api/payment/refund/route.ts',
        check: (content) => content.includes('refunds.create'),
    },
    {
        name: 'Refund API updates paymentStatus to refunded',
        file: 'app/api/payment/refund/route.ts',
        check: (content) => content.includes("paymentStatus: 'refunded'"),
    },
    {
        name: 'test-maps1 calls confirm API after payment',
        file: 'app/test-maps1/page.tsx',
        check: (content) => content.includes('/api/payment/confirm'),
    },
    {
        name: 'test-maps1 calls refund API when cancelling',
        file: 'app/test-maps1/page.tsx',
        check: (content) => content.includes('/api/payment/refund'),
    },
];

paymentFlowChecks.forEach(check => {
    const fullPath = path.join(process.cwd(), check.file);
    if (!fs.existsSync(fullPath)) {
        warnings.push(`${check.name}: File not found (${check.file})`);
        return;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    if (check.check(content)) {
        passed.push(check.name);
        console.log(`   ${c.green}✓ ${check.name}${c.reset}`);
    } else {
        errors.push(`${check.name} - FAILED`);
        console.log(`   ${c.red}✗ ${check.name}${c.reset}`);
    }
});

// ============================================================
// CHECK 4: Cash Payment Completion
// ============================================================
console.log(`\n${c.blue}[4/5] Checking Cash Payment completion...${c.reset}`);

const driverBookingsPath = path.join(process.cwd(), 'app/api/driver/bookings/route.ts');
if (fs.existsSync(driverBookingsPath)) {
    const content = fs.readFileSync(driverBookingsPath, 'utf-8');

    const cashChecks = [
        {
            name: 'Checks paymentMethod === cash on completion',
            pattern: /paymentMethod\s*===\s*['"]cash['"]/,
        },
        {
            name: 'Updates paymentStatus to paid for cash',
            pattern: /paymentStatus.*['"]paid['"]/,
        },
        {
            name: 'Records paymentCompletedAt for cash',
            pattern: /paymentCompletedAt/,
        },
    ];

    cashChecks.forEach(check => {
        if (check.pattern.test(content)) {
            passed.push(check.name);
            console.log(`   ${c.green}✓ ${check.name}${c.reset}`);
        } else {
            errors.push(check.name);
            console.log(`   ${c.red}✗ ${check.name}${c.reset}`);
        }
    });
}

// ============================================================
// CHECK 5: Auto Refund on Cancel
// ============================================================
console.log(`\n${c.blue}[5/6] Checking Auto Refund on Cancel...${c.reset}`);

if (fs.existsSync(testMaps1Path)) {
    const content = fs.readFileSync(testMaps1Path, 'utf-8');

    const autoRefundChecks = [
        {
            name: 'Checks paymentMethod === card before refund',
            pattern: /paymentMethod\s*===\s*['"]card['"]/,
        },
        {
            name: 'Checks stripePaymentIntentId exists',
            pattern: /stripePaymentIntentId/,
        },
        {
            name: 'Checks paymentStatus === paid',
            pattern: /paymentStatus\s*===\s*['"]paid['"]/,
        },
        {
            name: 'Calls refund API in confirmCancelBooking',
            pattern: /confirmCancelBooking[\s\S]*?\/api\/payment\/refund/,
        },
    ];

    autoRefundChecks.forEach(check => {
        if (check.pattern.test(content)) {
            passed.push(check.name);
            console.log(`   ${c.green}✓ ${check.name}${c.reset}`);
        } else {
            warnings.push(check.name);
            console.log(`   ${c.yellow}⚠ ${check.name}${c.reset}`);
        }
    });
}

// ============================================================
// CHECK 6: PaymentStatus Cancellation Handling
// ============================================================
console.log(`\n${c.blue}[6/6] Checking PaymentStatus Cancellation Handling...${c.reset}`);

if (fs.existsSync(testMaps1Path)) {
    const content = fs.readFileSync(testMaps1Path, 'utf-8');

    const cancellationChecks = [
        {
            name: 'Tracks refund processed state (confirmCancelBooking)',
            pattern: /refundProcessed\s*=\s*(true|false)/,
        },
        {
            name: 'Updates paymentStatus to cancelled for non-refunded',
            pattern: /paymentStatus:\s*['"]cancelled['"]/,
        },
        {
            name: 'Only updates paymentStatus if refund not processed',
            pattern: /!refundProcessed/,
        },
        {
            name: 'handlePaymentCancel updates paymentStatus',
            pattern: /handlePaymentCancel[\s\S]*?paymentStatus:\s*['"]cancelled['"]/,
        },
    ];

    cancellationChecks.forEach(check => {
        if (check.pattern.test(content)) {
            passed.push(check.name);
            console.log(`   ${c.green}✓ ${check.name}${c.reset}`);
        } else {
            errors.push(check.name);
            console.log(`   ${c.red}✗ ${check.name}${c.reset}`);
        }
    });
}

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(60));
console.log(`\n${c.bold}📊 SUMMARY${c.reset}\n`);

console.log(`${c.green}✓ Passed: ${passed.length}${c.reset}`);
passed.forEach(p => console.log(`   • ${p}`));

if (warnings.length > 0) {
    console.log(`\n${c.yellow}⚠ Warnings: ${warnings.length}${c.reset}`);
    warnings.forEach(w => console.log(`   • ${w}`));
}

if (errors.length > 0) {
    console.log(`\n${c.red}✗ Errors: ${errors.length}${c.reset}`);
    errors.forEach(e => console.log(`   • ${e}`));
}

console.log('\n' + '='.repeat(60));

// ============================================================
// PAYMENT FLOW DIAGRAM
// ============================================================
console.log(`\n${c.cyan}${c.bold}📋 Payment Flow Reference${c.reset}\n`);

console.log(`
${c.bold}Card Payment Flow:${c.reset}
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "จองรถ" with Card selected                   │
│    └─> createLiveBooking() → status: awaiting_payment       │
│                                                             │
│ 2. Create PaymentIntent                                     │
│    └─> POST /api/payment/create-intent                      │
│    └─> Returns clientSecret for Stripe Element              │
│                                                             │
│ 3. User enters card details & submits                       │
│    └─> Stripe processes payment                             │
│                                                             │
│ 4. Payment succeeds → handlePaymentSuccess()                │
│    └─> POST /api/payment/confirm                            │
│    └─> Updates: status=pending, paymentStatus=paid          │
│    └─> Records: paymentCompletedAt                          │
│                                                             │
│ 5. Find and assign driver                                   │
│    └─> findAndAssignDriver()                                │
└─────────────────────────────────────────────────────────────┘

${c.bold}Cash Payment Flow:${c.reset}
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "จองรถ" with Cash selected                   │
│    └─> createLiveBooking() → status: pending                │
│    └─> paymentMethod: 'cash'                                │
│    └─> paymentStatus: 'pending' (ยังไม่ได้รับเงิน)           │
│                                                             │
│ 2. Driver assigned → accepts → picks up → starts trip       │
│    └─> status changes through flow                          │
│    └─> paymentStatus: still 'pending'                       │
│                                                             │
│ 3. Driver marks as "completed"                              │
│    └─> POST /api/driver/bookings { action: 'updateStatus' } │
│    └─> status: 'completed'                                  │
│    └─> paymentStatus: 'paid' ✅ (auto-update for cash)      │
│    └─> paymentCompletedAt: timestamp                        │
│                                                             │
│ 4. Driver collects cash from customer                       │
│    └─> No refund needed (cash handled offline)              │
└─────────────────────────────────────────────────────────────┘

${c.bold}Auto Refund Flow (when cancelling paid booking):${c.reset}
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "ยกเลิก" on a paid booking                   │
│                                                             │
│ 2. confirmCancelBooking() checks:                           │
│    └─> paymentMethod === 'card'                             │
│    └─> stripePaymentIntentId exists                         │
│    └─> paymentStatus === 'paid'                             │
│                                                             │
│ 3. If all true → call refund API                            │
│    └─> POST /api/payment/refund { bookingId }               │
│    └─> Stripe refunds the payment                           │
│    └─> Updates: paymentStatus=refunded, status=cancelled    │
│    └─> refundProcessed = true                               │
│                                                             │
│ 4. Update booking status to 'cancelled'                     │
│                                                             │
│ 5. If refund NOT processed → update paymentStatus           │
│    └─> paymentStatus: 'cancelled'                           │
│    └─> Handles: processing, pending, awaiting_payment       │
│                                                             │
│ 6. Reset driver status + clear states                       │
└─────────────────────────────────────────────────────────────┘

${c.bold}PaymentStatus State Diagram:${c.reset}
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   pending ──────┬──────> processing ──────> paid            │
│      │          │            │               │              │
│      │ (cancel) │ (cancel)   │ (cancel)      │ (cancel)     │
│      ▼          ▼            ▼               ▼              │
│   cancelled  cancelled   cancelled       refunded          │
│                                                             │
│ ⚠️  ทุกกรณีที่ cancel ต้องอัปเดต paymentStatus!             │
│     - paid + card → refund API → refunded                   │
│     - อื่นๆ → cancelled                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

${c.bold}Common Bugs to Avoid:${c.reset}
┌─────────────────────────────────────────────────────────────┐
│ ❌ FieldValue.serverTimestamp() in array                    │
│    → Use Timestamp.now() instead                            │
│                                                             │
│ ❌ Sending paymentIntentId to refund API                    │
│    → API expects bookingId, not paymentIntentId             │
│                                                             │
│ ❌ Not checking paymentStatus before refund                 │
│    → Only refund if paymentStatus === 'paid'                │
│                                                             │
│ ❌ Not updating paymentStatus on cancel                     │
│    → Cancelled bookings stuck with 'processing'/'pending'   │
│    → Always update to 'cancelled' if refund not processed   │
│                                                             │
│ ❌ Assigning driver when status is awaiting_payment         │
│    → Must confirm payment first (status → pending)          │
└─────────────────────────────────────────────────────────────┘

${c.bold}Stripe Console Warnings (ไม่ต้องกังวล):${c.reset}
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ "payment method types are not activated: promptpay"      │
│    → ไปเปิดที่ Stripe Dashboard > Payment methods           │
│    → หรือไม่ต้องสนใจถ้าไม่ใช้ PromptPay                      │
│                                                             │
│ ⚠️ "domain not verified: apple_pay"                         │
│    → Apple Pay ต้อง verify domain (ทำไม่ได้บน localhost)    │
│    → Deploy ก่อนแล้วค่อย verify ที่ Stripe Dashboard        │
│    → Card payment ยังใช้ได้ปกติ                             │
│                                                             │
│ ⚠️ "must serve page over HTTPS" (Apple Pay / Google Pay)   │
│    → localhost ใช้ HTTP ทำให้ไม่รองรับ                       │
│    → Deploy แล้วจะหายไป                                     │
└─────────────────────────────────────────────────────────────┘
`);

// Exit with error code if there are errors
if (errors.length > 0) {
    console.log(`\n${c.red}${c.bold}❌ Check failed with ${errors.length} error(s)${c.reset}\n`);
    process.exit(1);
} else {
    console.log(`\n${c.green}${c.bold}✅ All checks passed!${c.reset}\n`);
    process.exit(0);
}
