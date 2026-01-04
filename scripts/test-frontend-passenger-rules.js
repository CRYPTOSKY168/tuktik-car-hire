#!/usr/bin/env node
/**
 * =====================================================
 * TukTik Car Rental - Frontend Passenger Rules Test
 * =====================================================
 *
 * Script นี้ช่วยทดสอบ Frontend Features ของ Passenger Rules:
 * - Cancel Booking (/test-maps1)
 * - No-Show UI (/demo-driver)
 * - Dispute Modal (/test-maps1)
 *
 * Usage: node scripts/test-frontend-passenger-rules.js
 *
 * ก่อนรัน: npm run dev (ให้ server ทำงานอยู่)
 */

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
};

function print(text, color = '') {
    console.log(`${color}${text}${c.reset}`);
}

function printHeader(text) {
    console.log('');
    console.log(`${c.cyan}${'═'.repeat(60)}${c.reset}`);
    console.log(`${c.cyan}${c.bold}  ${text}${c.reset}`);
    console.log(`${c.cyan}${'═'.repeat(60)}${c.reset}`);
}

function printStep(num, text) {
    console.log(`${c.yellow}  [Step ${num}]${c.reset} ${text}`);
}

function printCheck(text) {
    console.log(`${c.green}  ✓${c.reset} ${text}`);
}

function printURL(url) {
    console.log(`${c.blue}  📍 ${url}${c.reset}`);
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(`\n${c.magenta}  ❓ ${question}${c.reset} `, (answer) => {
            resolve(answer.toLowerCase());
        });
    });
}

async function waitForEnter() {
    return new Promise((resolve) => {
        rl.question(`\n${c.dim}  กด Enter เพื่อไปขั้นตอนถัดไป...${c.reset}`, () => {
            resolve();
        });
    });
}

async function testCancelBooking() {
    printHeader('🚫 ทดสอบ Cancel Booking Flow');

    print('\n  เปิดหน้านี้:', c.dim);
    printURL('http://localhost:3000/test-maps1');

    printStep(1, 'เปิด Live Mode (Toggle switch ด้านขวาบน)');
    printStep(2, 'Login ด้วย account ลูกค้า');
    printStep(3, 'เลือกจุดรับ-ส่ง');
    printStep(4, 'เลือกรถ');
    printStep(5, 'กดปุ่ม "จองรถตอนนี้"');
    printStep(6, 'เลือกชำระเงินสด และกด "ยืนยัน"');
    printStep(7, 'รอระบบหาคนขับ...');

    console.log('');
    printStep(8, 'หลังได้คนขับ ให้กดปุ่ม "ยกเลิก" ที่มุมขวา');

    printCheck('Modal ยืนยันยกเลิกควรขึ้นมา');
    printCheck('กด "ยกเลิก" เพื่อยืนยัน');
    printCheck('Modal ผลลัพธ์ควรแสดง:');
    print('      - ยกเลิกฟรี (ถ้ายกเลิกภายใน 3 นาที)');
    print('      - มีค่าธรรมเนียม ฿50 (ถ้ายกเลิกหลัง 3 นาที)');

    await waitForEnter();

    const result = await askQuestion('ทำงานถูกต้องหรือไม่? (y/n)');
    return result === 'y';
}

async function testNoShowUI() {
    printHeader('🚗 ทดสอบ No-Show UI (Driver App)');

    print('\n  ต้องเตรียม:', c.dim);
    print('  1. มี Booking ที่ status = driver_en_route', c.dim);
    print('  2. Login เป็นคนขับที่ได้รับมอบหมาย', c.dim);

    print('\n  เปิดหน้านี้:', c.dim);
    printURL('http://localhost:3000/demo-driver');

    printStep(1, 'Login ด้วย account คนขับ (imacroshosting@gmail.com)');
    printStep(2, 'รอรับงานใหม่ (หรือสร้าง booking ใหม่จาก test-maps1)');
    printStep(3, 'กดรับงาน → status เปลี่ยนเป็น driver_en_route');

    console.log('');
    printStep(4, 'กดปุ่ม "แจ้งว่าถึงจุดรับแล้ว" (ปุ่มสีเหลือง)');
    printCheck('Timer countdown ควรแสดง (รอ 5 นาที)');
    printCheck('ปุ่ม "ลูกค้าไม่มา" ควร disabled');

    console.log('');
    printStep(5, 'รอจนหมดเวลา หรือเปลี่ยน noShowWaitTime ใน Admin Settings');
    printStep(6, 'เมื่อหมดเวลา กดปุ่ม "ลูกค้าไม่มา (No-Show)"');
    printCheck('Modal ยืนยัน No-Show ควรขึ้น');

    console.log('');
    printStep(7, 'กด "ยืนยัน" เพื่อรายงาน No-Show');
    printCheck('Modal ผลลัพธ์ควรแสดง:');
    print('      - ค่าธรรมเนียม No-Show: ฿50');
    print('      - รายได้ของคุณ: ฿50 (100%)');

    await waitForEnter();

    const result = await askQuestion('ทำงานถูกต้องหรือไม่? (y/n)');
    return result === 'y';
}

async function testDisputeModal() {
    printHeader('📝 ทดสอบ Dispute Modal (Customer App)');

    print('\n  ต้องเตรียม:', c.dim);
    print('  1. มี Booking ที่ status = completed', c.dim);
    print('  2. Login เป็นเจ้าของ booking', c.dim);

    print('\n  เปิดหน้านี้:', c.dim);
    printURL('http://localhost:3000/test-maps1');

    printStep(1, 'ทำการจอง → รับงาน → เดินทาง → เสร็จสิ้น');
    printStep(2, 'หลังเสร็จสิ้น จะเห็นหน้า "ถึงปลายทางแล้ว!"');

    console.log('');
    printStep(3, 'กดปุ่ม "แจ้งปัญหา" (ด้านล่างปุ่มให้คะแนน)');
    printCheck('Modal แจ้งปัญหาควรขึ้น');

    console.log('');
    printStep(4, 'เลือกเหตุผล (เช่น "คนขับประพฤติไม่เหมาะสม")');
    printStep(5, 'กรอกรายละเอียดอย่างน้อย 10 ตัวอักษร');
    printStep(6, 'กดปุ่ม "ยื่นข้อร้องเรียน"');

    printCheck('Modal ผลลัพธ์ควรแสดง:');
    print('      - "ยื่นข้อร้องเรียนสำเร็จ"');
    print('      - หมายเลขอ้างอิง (เช่น A1B2C3D4)');
    print('      - ตอบกลับภายใน 24-48 ชั่วโมง');

    await waitForEnter();

    const result = await askQuestion('ทำงานถูกต้องหรือไม่? (y/n)');
    return result === 'y';
}

async function main() {
    console.clear();

    print(`
  ╔══════════════════════════════════════════════════════════╗
  ║     ${c.bold}TukTik - Frontend Passenger Rules Test${c.reset}            ║
  ║                                                          ║
  ║  ${c.dim}ทดสอบ UI ของระบบ Cancel, No-Show และ Dispute${c.reset}        ║
  ╚══════════════════════════════════════════════════════════╝
`, c.cyan);

    print('  ก่อนเริ่มทดสอบ:', c.yellow);
    print('  1. ตรวจสอบว่า dev server ทำงานอยู่ (npm run dev)');
    print('  2. เปิด browser 2 tabs:');
    printURL('     http://localhost:3000/test-maps1 (Customer)');
    printURL('     http://localhost:3000/demo-driver (Driver)');

    await waitForEnter();

    const results = {
        cancel: false,
        noShow: false,
        dispute: false,
    };

    // Test 1: Cancel Booking
    results.cancel = await testCancelBooking();

    // Test 2: No-Show UI
    results.noShow = await testNoShowUI();

    // Test 3: Dispute Modal
    results.dispute = await testDisputeModal();

    // Summary
    printHeader('📊 สรุปผลการทดสอบ');

    const tests = [
        { name: 'Cancel Booking', passed: results.cancel },
        { name: 'No-Show UI', passed: results.noShow },
        { name: 'Dispute Modal', passed: results.dispute },
    ];

    let passCount = 0;
    tests.forEach(test => {
        if (test.passed) {
            print(`  ✓ ${test.name} - PASSED`, c.green);
            passCount++;
        } else {
            print(`  ✗ ${test.name} - FAILED`, c.red);
        }
    });

    console.log('');

    if (passCount === tests.length) {
        print(`  🎉 ผ่านทุกการทดสอบ! (${passCount}/${tests.length})`, c.green + c.bold);
    } else {
        print(`  ⚠️  ผ่าน ${passCount}/${tests.length} การทดสอบ`, c.yellow);
    }

    console.log('');
    rl.close();
}

main().catch(err => {
    console.error(`${c.red}Error: ${err.message}${c.reset}`);
    rl.close();
    process.exit(1);
});
