# TukTik Car Rental - Project Documentation

> **Last Updated:** 2026-01-04
> **Version:** 8.9 (Passenger Rules APIs)
> **Status:** Production
> **Lines:** ~4200+

---

## Quick Start

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Build & Deploy
npm run build        # Build for production
vercel --prod        # Deploy to Vercel

# Debug & Monitoring
node scripts/check-logs.js          # ตรวจสอบ bugs ทั้งหมด
node scripts/check-logs.js --code   # ตรวจสอบ code issues
node scripts/monitor-logs.js        # Monitor logs แบบ real-time
node scripts/monitor-logs.js --dev  # Monitor dev server

# Android App
cd android && ./gradlew assembleDebug  # Build APK
node scripts/send-push-test.js "<TOKEN>" "Title" "Body"  # Send push

# Other
npm run lint         # Run ESLint
```

**URLs:**
- Production: https://car-rental-phi-lime.vercel.app
- Firebase Console: https://console.firebase.google.com
- Vercel Dashboard: https://vercel.com

---

## Project Overview

**ระบบจองรถรับส่งสนามบิน (Airport Transfer Booking System)**

| Role | Features |
|------|----------|
| **ลูกค้า** | จองรถ, ชำระเงิน, ติดตามสถานะ, Voucher |
| **แอดมิน** | จัดการ booking, มอบหมายคนขับ, ดูสถิติ, จัดการ Voucher |
| **คนขับ** | รับ/ปฏิเสธงาน, อัปเดตสถานะ, ดูประวัติ |

---

## ⛔ DO NOT MODIFY (Critical Files)

> **WARNING:** ไฟล์เหล่านี้ผ่านการทดสอบแล้ว ห้ามแก้ไขโดยไม่ได้รับอนุญาต

| File | Reason |
|------|--------|
| `/lib/firebase/config.ts` | Firebase initialization - production config |
| `/lib/firebase/admin.ts` | Service account credentials |
| `/lib/firebase/adminAuth.ts` | Admin authentication logic |
| `/firestore.rules` | Security rules - ผ่าน audit แล้ว |
| `.env.local` | Environment secrets |

### Protected Logic (แก้ระวัง)
| File | Critical Functions |
|------|-------------------|
| `/app/api/driver/bookings/route.ts` | `verifyDriverOwnership()` - authentication |
| `/app/api/driver/status/route.ts` | `verifyDriverOwnership()` - authentication |
| `/lib/contexts/AuthContext.tsx` | Authentication state management |
| `/lib/firebase/firestore.ts` | Core database operations |

---

## Coding Rules

### ✅ MUST DO (ต้องทำเสมอ)

```markdown
1. อ่าน CLAUDE.md ก่อนเริ่มงานทุกครั้ง
2. ใช้ translations จาก useLanguage() แทน hardcode text (ดู Language System section)
3. API routes ต้องมี authentication (Bearer token)
4. ใช้ try/catch ทุก async function
5. ใช้ TypeScript strict mode
6. ใช้ Tailwind CSS เท่านั้น (ไม่ใช้ inline styles)
7. ใช้ Material Symbols สำหรับ icons
8. อัปเดต CLAUDE.md หลังแก้ไขสำคัญ
9. Test ก่อน deploy ทุกครั้ง (npm run build)
10. ใช้ Services จาก lib/firebase/services/ แทน direct Firestore calls
11. ⭐ เขียน Auto Test Script ทดสอบ flow ก่อนส่งงานทุกครั้ง (ดู Testing Scripts section)
```

### ❌ MUST NOT (ห้ามทำ)

```markdown
1. อย่าแก้ไขไฟล์ใน "DO NOT MODIFY" section
2. อย่าใช้ `any` type - ใช้ proper typing จาก lib/types/
3. อย่า hard-code sensitive values
4. อย่าลบ console.error ที่มีอยู่ (ใช้ debug)
5. อย่าเพิ่ม dependencies ใหม่โดยไม่ถาม
6. อย่า refactor โค้ดที่ไม่เกี่ยวข้องกับ task
7. อย่าใช้ FieldValue.serverTimestamp() ใน array
8. อย่าเปลี่ยน API response format ที่มีอยู่
```

### ⚠️ Prototype/Demo vs Production (สำคัญมาก!)

```markdown
Prototype pages เป็นแค่ DEMO ทดลองดีไซน์ ห้ามเอาไปปนกับ Production!

| ประเภท | Path | หมายเหตุ |
|--------|------|----------|
| **Production** | `/driver`, `/driver/login`, `/driver/setup`, `/driver/profile`, `/driver/history`, `/driver/pending` | ❌ ห้ามเปลี่ยนธีม/styling โดยไม่ได้รับอนุญาต |
| **Demo/Prototype** | `/driver/prototype-*` | ✅ ทดลองธีมใหม่ได้อิสระ (Cyberpunk, Synthwave, etc.) |

❌ ห้ามทำ:
- เอาธีม Cyberpunk/Synthwave/Neon ไปใส่หน้า Production
- Copy styling จาก prototype ไปใส่หน้า driver จริง
- สับสน prototype กับ production

✅ ทำได้:
- สร้าง prototype ใหม่ใน /driver/prototype-* เพื่อทดลองดีไซน์
- ลบ prototype ที่ไม่ต้องการ
- ถ้าจะเอาธีมจาก prototype ไปใช้จริง ต้องถามก่อนเสมอ!
```

### 🧪 Mobile App Theme (กำลังทดสอบ)

```markdown
⚠️ Theme นี้อยู่ระหว่างการทดสอบ - ยังไม่ใช่ Production!

| Path | Description | Status |
|------|-------------|--------|
| `/vehicles-test1` | หน้าเลือกรถ (Uber/Grab style) | 🧪 Testing |
| `/vehicles-test1-dashboard` | หน้า Dashboard ลูกค้า (real-time booking) | 🧪 Testing |
| `/vehicles-test1-profile` | หน้าโปรไฟล์ลูกค้า | 🧪 Testing |
| `/vehicles-test1-driver` | หน้า Driver Dashboard | 🧪 Testing |
| `/vehicles-test1-history` | หน้าประวัติการเดินทาง | 🧪 Testing |
| `/vehicles-test` | Demo A+B tier system | 🧪 Testing |
| `/vehicles-test2` | Dark glassmorphism theme | 🧪 Testing |

**Design System (vehicles-test1):**
- Background: `bg-gray-100`
- Cards: `bg-white rounded-2xl border border-gray-200`
- Max width: `max-w-[430px]` (mobile-first)
- Icons: SVG inline (ไม่ใช่ emoji)
- Selected state: `border-blue-500 bg-blue-50` หรือ `border-amber-400 bg-amber-50` (VIP)
- Layout: List view แบบ Uber/Grab

**Features ที่ทำแล้ว:**
- ✅ Vehicle selection (list view)
- ✅ Connected route (จุดรับ-ส่งมีเส้นเชื่อม)
- ✅ Customer Dashboard (real-time subscription, stats, active booking)
- ✅ Profile page
- ✅ Driver Dashboard
- ✅ Trip History (ประวัติการเดินทาง)
- ✅ Safe area support (iOS)
- ✅ Cross-platform compatible

**TODO (ถ้าจะใช้จริง):**
- [ ] เพิ่ม Map component
- [ ] Real-time price calculation
- [ ] Animation/Transitions
- [ ] Error & Empty states
```

### Code Style

```typescript
// ✅ Good - ใช้ async/await + Types
import { Booking, BookingStatus } from '@/lib/types';

const fetchBooking = async (id: string): Promise<Booking | null> => {
  try {
    const result = await BookingService.getById(id);
    return result;
  } catch (error: any) {
    console.error('Error:', error);
    return null;
  }
};

// ❌ Bad - ใช้ .then() + any
apiCall().then(result => {}).catch(err => {});

// ✅ Good - Thai UI text
<button>บันทึก</button>

// ❌ Bad - English UI text
<button>Save</button>

// ✅ Good - Proper error response
return NextResponse.json({ success: false, error: 'ไม่พบข้อมูล' }, { status: 404 });

// ❌ Bad - Inconsistent response
return NextResponse.json({ error: true, message: 'Not found' });
```

---

## 🔒 Security & Best Practices (Strict Enforcement)

> **สำคัญมาก:** กฎความปลอดภัยเหล่านี้ต้องปฏิบัติตามอย่างเคร่งครัดในการเขียนโค้ด Next.js (TypeScript)

### 1. Input Validation (การตรวจสอบข้อมูล)

| Rule | Description |
|------|-------------|
| **Use Zod** | ใช้ Zod ตรวจสอบ Search Params, Form Data, JSON Body ทุกตัว |
| **No `any`** | ห้ามใช้ `any` type เด็ดขาด ต้องระบุ Type ชัดเจน |
| **Sanitize** | Sanitize ข้อมูลจาก User ก่อนแสดงผล (ป้องกัน XSS) |
| **No dangerouslySetInnerHTML** | หลีกเลี่ยง ถ้าจำเป็นต้อง sanitize ก่อน |

```typescript
// ✅ Good - ใช้ Zod validation
import { z } from 'zod';

const BookingSchema = z.object({
    pickupLocation: z.string().min(1).max(200),
    dropoffLocation: z.string().min(1).max(200),
    pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    totalCost: z.number().min(0).max(100000),
});

// ❌ Bad - ไม่มี validation
const data = await request.json(); // อันตราย!
```

### 2. Client vs Server (Architecture Safety)

| Rule | Description |
|------|-------------|
| **Secret Logic on Server** | ห้ามคำนวณเงิน/ตรวจสอบสิทธิ์ใน Client Component |
| **API Keys** | Secret keys ห้ามมี `NEXT_PUBLIC_` prefix |
| **Server Actions** | ใช้ Server Actions หรือ API Routes สำหรับ sensitive operations |

```typescript
// ✅ Server-side only (ไม่มี NEXT_PUBLIC_)
STRIPE_SECRET_KEY=sk_live_xxx
FIREBASE_ADMIN_PRIVATE_KEY=xxx

// ✅ Client-safe (มี NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### 3. Authentication & Authorization

| Rule | Description |
|------|-------------|
| **Middleware** | ต้องมี Middleware ตรวจสอบ Session ทุก Protected Route |
| **Double Check** | API Routes ต้องตรวจสอบ session/role ซ้ำ (อย่าเชื่อ Middleware อย่างเดียว) |
| **Bearer Token** | ทุก API ต้องตรวจสอบ Bearer token |

```typescript
// ✅ Good - Double check ใน API Route
export async function POST(request: NextRequest) {
    // 1. Verify token
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check role/permission
    const user = await getUser(authResult.userId);
    if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Process request...
}
```

### 4. Database Security

| Rule | Description |
|------|-------------|
| **No Raw SQL** | ใช้ ORM (Prisma/Drizzle) หรือ Firestore SDK เท่านั้น |
| **Parameterized** | ถ้าต้องเขียน Raw Query ใช้ Parameterized Query |
| **Firestore Rules** | ตรวจสอบ Security Rules ก่อน deploy |

```typescript
// ✅ Good - ใช้ Firestore SDK
await adminDb.collection('bookings')
    .where('userId', '==', userId)
    .get();

// ❌ Bad - String concatenation (SQL Injection risk)
const query = `SELECT * FROM users WHERE id = '${userId}'`;
```

### 5. Attack Prevention

| Attack | Protection | Implementation |
|--------|------------|----------------|
| **Rate Limiting** | จำกัด requests/minute | ใช้ `lib/utils/rateLimit.ts` |
| **CSRF** | ตรวจสอบ Origin header | Next.js Server Actions มีในตัว |
| **XSS** | Sanitize + CSP headers | ใช้ `lib/utils/safeError.ts` |
| **Injection** | Input validation + ORM | ใช้ Zod + Firestore SDK |

```typescript
// ✅ Good - Rate limiting
import { checkPaymentRateLimit, getRateLimitResponse } from '@/lib/utils/rateLimit';

if (!checkPaymentRateLimit(userId)) {
    return NextResponse.json(getRateLimitResponse('payment'), { status: 429 });
}
```

### 6. Error Handling (No Leaks)

| Rule | Description |
|------|-------------|
| **No Stack Traces** | ห้าม return `error.stack` ให้ User |
| **No DB Errors** | ห้าม expose Database error details |
| **Generic Messages** | Return ข้อความทั่วไป เช่น "เกิดข้อผิดพลาด" |
| **Server Logging** | Log error ฝั่ง Server แต่ส่ง safe message กลับ Client |

```typescript
// ✅ Good - ใช้ safeError utility
import { safeErrorMessage, logError } from '@/lib/utils/safeError';

} catch (error: unknown) {
    logError('payment/create-intent', error, { bookingId }); // Log ฝั่ง Server
    return NextResponse.json(
        { success: false, error: safeErrorMessage(error, 'ไม่สามารถสร้างการชำระเงินได้') },
        { status: 500 }
    );
}

// ❌ Bad - Leak error details
return NextResponse.json({ error: error.message, stack: error.stack });
```

### 7. Security Headers (next.config.js)

```javascript
// ✅ ต้องมี headers เหล่านี้
async headers() {
    return [{
        source: '/:path*',
        headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
            // CSP (ตามความเหมาะสม)
        ],
    }];
}
```

### ⚠️ CSP Critical Domains (สำคัญมาก!)

เมื่อตั้งค่า Content-Security-Policy ต้องรวม domains เหล่านี้:

| Domain | Directive | ใช้สำหรับ |
|--------|-----------|----------|
| `https://apis.google.com` | script-src | **Firebase Auth / Google Sign-in** (สำคัญ!) |
| `https://*.googleapis.com` | script-src, connect-src | Google APIs |
| `https://*.firebaseapp.com` | script-src, frame-src | Firebase SDK |
| `https://js.stripe.com` | script-src, frame-src | Stripe Payment |
| `https://maps.googleapis.com` | script-src | Google Maps |

```
❌ ผิด: ไม่มี apis.google.com → Firebase Auth / Google Sign-in จะไม่ทำงาน!
✅ ถูก: script-src 'self' ... https://apis.google.com https://*.googleapis.com ...
```

**หมายเหตุ:** `*.googleapis.com` ไม่รวม `apis.google.com` เพราะเป็นคนละ domain!

### Security Utilities (ใช้ทุก API Route)

| Utility | File | Usage |
|---------|------|-------|
| `safeErrorMessage()` | `lib/utils/safeError.ts` | ป้องกัน error leak |
| `logError()` | `lib/utils/safeError.ts` | Log error ฝั่ง Server |
| `checkRateLimit()` | `lib/utils/rateLimit.ts` | Rate limiting |
| `getRateLimitResponse()` | `lib/utils/rateLimit.ts` | 429 response |

### Security Checklist (ก่อน Deploy)

```markdown
□ ทุก API Route มี authentication check
□ ทุก input มี Zod validation
□ ไม่มี `any` type ในโค้ด
□ ใช้ safeErrorMessage() แทน error.message
□ API ที่สำคัญมี Rate Limiting
□ ไม่มี NEXT_PUBLIC_ กับ secret keys
□ Security headers ตั้งค่าใน next.config.js
□ npm run build ผ่านไม่มี error
```

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | Framework (App Router) |
| React | 19.2.3 | UI Library |
| TypeScript | 5.x | Type Safety |
| Tailwind CSS | 4.x | Styling |
| Firebase | 12.7.0 | Auth + Firestore |
| Firebase Admin | 13.6.0 | Server-side operations |
| next-pwa | 5.6.0 | PWA Support |
| promptpay-qr | 0.5.0 | PromptPay QR Generation |
| qrcode.react | 4.2.0 | QR Code Component |
| sharp | 0.34.5 | Image optimization |
| Material Symbols | CDN | Icons |

---

## Project Structure (Actual)

```
car-rental/
├── app/
│   ├── page.tsx              # Landing page (/)
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   │
│   ├── vehicles/             # Vehicle selection (/vehicles)
│   ├── payment/              # Payment flow
│   │   ├── page.tsx          # Payment page
│   │   ├── success/          # Payment success
│   │   └── cancel/           # Payment cancelled
│   ├── confirmation/         # Booking confirmation
│   ├── dashboard/            # Customer dashboard
│   ├── profile/              # User profile
│   ├── login/                # Login page
│   ├── register/             # Registration
│   │
│   ├── about/                # About us
│   ├── contact/              # Contact page
│   ├── services/             # Services info
│   ├── routes/               # Routes info
│   ├── coming-soon/          # Coming soon page
│   │
│   ├── admin/                # Admin pages
│   │   ├── page.tsx          # Admin dashboard
│   │   ├── layout.tsx        # Admin layout
│   │   ├── bookings/         # Booking management
│   │   ├── drivers/          # Driver management
│   │   ├── customers/        # Customer list
│   │   ├── vehicles/         # Vehicle CRUD
│   │   │   ├── page.tsx      # Vehicle list
│   │   │   ├── new/          # Add new vehicle
│   │   │   └── [id]/         # Edit vehicle
│   │   ├── locations/        # Location management
│   │   ├── routes/           # Route pricing
│   │   ├── members/          # Admin members
│   │   └── settings/         # System settings
│   │
│   ├── driver/               # Driver pages
│   │   ├── page.tsx          # Driver dashboard
│   │   ├── layout.tsx        # Driver layout
│   │   ├── login/            # Driver login
│   │   ├── setup/            # Driver onboarding
│   │   ├── profile/          # Driver profile
│   │   ├── history/          # Trip history
│   │   └── pending/          # Pending approval
│   │
│   ├── demo-driver/          # Demo driver (real backend + Google Maps)
│   │   └── page.tsx          # Mobile-first driver UI
│   │
│   └── api/                  # API routes
│       ├── admin/
│       │   ├── bookings/     # Booking API
│       │   ├── drivers/      # Driver API
│       │   ├── users/        # User API
│       │   └── cleanup/      # Cleanup API
│       ├── driver/
│       │   ├── bookings/     # Driver booking API
│       │   ├── status/       # Driver status API
│       │   └── setup/        # Driver setup API
│       └── setup-admin/      # Initial admin setup
│
├── lib/
│   ├── types/
│   │   └── index.ts          # All TypeScript types & enums
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Authentication state
│   │   ├── BookingContext.tsx     # Booking flow state
│   │   ├── LanguageContext.tsx    # i18n (th/en)
│   │   ├── CurrencyContext.tsx    # Currency (THB/USD)
│   │   └── NotificationContext.tsx # Push notifications
│   │
│   ├── firebase/
│   │   ├── config.ts         # Firebase client config
│   │   ├── admin.ts          # Firebase Admin SDK
│   │   ├── adminAuth.ts      # Admin authentication
│   │   ├── firestore.ts      # Core database operations
│   │   ├── storage.ts        # File upload
│   │   ├── stripe.ts         # Stripe integration
│   │   ├── phoneAuth.ts      # Phone authentication
│   │   ├── messaging.ts      # FCM messaging
│   │   ├── notifications.ts  # Notification helpers
│   │   └── services/         # Service layer
│   │       ├── index.ts
│   │       ├── BookingService.ts
│   │       ├── DriverService.ts
│   │       ├── VehicleService.ts
│   │       ├── UserService.ts
│   │       ├── LocationService.ts
│   │       ├── NotificationService.ts
│   │       ├── VoucherService.ts
│   │       └── SettingsService.ts
│   │
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useDataFetching.ts    # Data fetching hooks
│   │   ├── useTableFilters.ts    # Table filter hooks
│   │   ├── useFormModal.ts       # Modal hooks
│   │   └── useAuthToken.ts       # Auth token hook
│   │
│   ├── constants/
│   │   ├── index.ts
│   │   └── countryCodes.ts   # Phone country codes
│   │
│   ├── utils/
│   │   └── payment.ts        # Payment utilities
│   │
│   ├── i18n/
│   │   └── translations.ts   # Translation strings
│   │
│   └── data/                 # Static data (fallback)
│       ├── vehicles.ts
│       ├── locations.ts
│       └── routes.ts
│
├── components/
│   ├── ui/
│   │   ├── index.ts
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── FormField.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── DataTable.tsx
│   │   └── VehicleCard.tsx
│   │
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ConditionalLayout.tsx
│   │
│   ├── navigation/
│   │   ├── index.ts
│   │   ├── BackButton.tsx
│   │   ├── Breadcrumb.tsx
│   │   └── BookingProgress.tsx
│   │
│   ├── booking/
│   │   ├── BookingForm.tsx
│   │   └── BookingSummary.tsx
│   │
│   ├── admin/
│   │   └── VehicleForm.tsx
│   │
│   ├── notifications/
│   │   ├── NotificationBell.tsx
│   │   └── NotificationPermissionPrompt.tsx
│   │
│   └── pwa/
│       └── InstallPrompt.tsx
│
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   ├── firebase-messaging-sw.js  # FCM service worker
│   ├── icons/                # App icons
│   └── images/               # Static images
│
├── scripts/                  # Utility scripts
│   ├── check-logs.js         # Bug checker (Vercel, Firebase, Code)
│   ├── monitor-logs.js       # Real-time log monitor
│   ├── check-database.js     # Database status checker
│   └── cleanup-*.js          # Cleanup scripts
│
├── CLAUDE.md                 # This documentation
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── firestore.rules
```

---

## Page Routes

### Customer Pages
| Path | File | Description | Auth |
|------|------|-------------|------|
| `/` | `page.tsx` | Landing page | No |
| `/book` | `book/page.tsx` | **หน้าจองหลัก** (แผนที่ + Live Mode) ⭐ | Yes |
| `/vehicles` | `vehicles/page.tsx` | เลือกรถแบบเก่า (🔒 ซ่อน) | No |
| `/payment` | `payment/page.tsx` | ชำระเงิน | No |
| `/payment/success` | `payment/success/page.tsx` | ชำระสำเร็จ | No |
| `/payment/cancel` | `payment/cancel/page.tsx` | ยกเลิกชำระ | No |
| `/confirmation` | `confirmation/page.tsx` | ยืนยันการจอง | No |
| `/dashboard` | `dashboard/page.tsx` | หน้าหลักลูกค้า | Yes |
| `/profile` | `profile/page.tsx` | ตั้งค่าโปรไฟล์ | Yes |
| `/login` | `login/page.tsx` | เข้าสู่ระบบ | No |
| `/register` | `register/page.tsx` | ลงทะเบียน | No |
| `/about` | `about/page.tsx` | เกี่ยวกับเรา | No |
| `/contact` | `contact/page.tsx` | ติดต่อเรา | No |
| `/services` | `services/page.tsx` | บริการของเรา | No |
| `/routes` | `routes/page.tsx` | เส้นทางให้บริการ | No |
| `/coming-soon` | `coming-soon/page.tsx` | Coming soon | No |

### Admin Pages
| Path | File | Description | Auth |
|------|------|-------------|------|
| `/admin` | `admin/page.tsx` | Dashboard สถิติ | Admin |
| `/admin/bookings` | `admin/bookings/page.tsx` | จัดการ booking | Admin |
| `/admin/drivers` | `admin/drivers/page.tsx` | จัดการคนขับ | Admin |
| `/admin/customers` | `admin/customers/page.tsx` | รายชื่อลูกค้า | Admin |
| `/admin/vehicles` | `admin/vehicles/page.tsx` | จัดการรถ | Admin |
| `/admin/vehicles/new` | `admin/vehicles/new/page.tsx` | เพิ่มรถใหม่ | Admin |
| `/admin/vehicles/[id]` | `admin/vehicles/[id]/page.tsx` | แก้ไขรถ | Admin |
| `/admin/locations` | `admin/locations/page.tsx` | จัดการสถานที่ | Admin |
| `/admin/routes` | `admin/routes/page.tsx` | ตั้งราคาเส้นทาง | Admin |
| `/admin/members` | `admin/members/page.tsx` | จัดการ admin | Admin |
| `/admin/settings` | `admin/settings/page.tsx` | ตั้งค่าระบบ | Admin |

### Driver Pages
| Path | File | Description | Auth |
|------|------|-------------|------|
| `/driver` | `driver/page.tsx` | Driver dashboard | Driver |
| `/driver/login` | `driver/login/page.tsx` | เข้าสู่ระบบคนขับ | No |
| `/driver/setup` | `driver/setup/page.tsx` | กรอกข้อมูลรถ | Approved |
| `/driver/profile` | `driver/profile/page.tsx` | โปรไฟล์คนขับ | Driver |
| `/driver/history` | `driver/history/page.tsx` | ประวัติงาน | Driver |
| `/driver/pending` | `driver/pending/page.tsx` | รอการอนุมัติ | Pending |

---

## API Reference

### Driver APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/driver/bookings` | GET | Bearer | ดู bookings ของคนขับ |
| `/api/driver/bookings` | POST | Bearer | อัปเดตสถานะ booking |
| `/api/driver/status` | GET | Bearer | ดูสถานะคนขับ |
| `/api/driver/status` | POST | Bearer | เปลี่ยนสถานะ (available/busy/offline) |
| `/api/driver/setup` | POST | Bearer | ลงทะเบียนเป็นคนขับ |

#### POST /api/driver/bookings

```typescript
// Request
{
  action: 'updateStatus' | 'rejectJob',
  bookingId: string,
  driverId: string,
  data?: { status: string, note?: string }
}

// Response
{ success: true, message: string }
{ success: false, error: string }
```

#### POST /api/driver/status

```typescript
// Request
{
  driverId: string,
  status: 'available' | 'busy' | 'offline'
}

// Response
{ success: true, driver: { id, status, previousStatus } }
```

### Admin APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/bookings` | GET | Admin | ดู bookings ทั้งหมด |
| `/api/admin/bookings` | POST | Admin | อัปเดต booking |
| `/api/admin/drivers` | GET | Admin | ดูคนขับทั้งหมด |
| `/api/admin/drivers` | POST | Admin | CRUD คนขับ |
| `/api/admin/users` | GET | Admin | ดู users ทั้งหมด |
| `/api/admin/users` | POST | Admin | อัปเดต user role |
| `/api/admin/cleanup` | POST | Admin | Cleanup old data |

### Setup API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/setup-admin` | POST | None | สร้าง admin คนแรก (ใช้ครั้งเดียว) |

### Passenger Rules APIs (Cancellation, No-Show, Dispute)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/booking/cancel` | POST | Bearer | ยกเลิกการจอง + คำนวณค่าธรรมเนียม |
| `/api/booking/noshow` | POST | Bearer | คนขับแจ้ง No-Show |
| `/api/booking/noshow/arrived` | POST | Bearer | คนขับแจ้งว่าถึงจุดรับแล้ว |
| `/api/booking/dispute` | POST | Bearer | ลูกค้ายื่นข้อร้องเรียน |
| `/api/booking/dispute` | GET | Bearer | ดูสถานะข้อร้องเรียน |

#### POST /api/booking/cancel

```typescript
// Request
{
  bookingId: string,
  reason: CancellationReason | string,  // 'changed_mind', 'driver_late', etc.
  note?: string
}

// Response (Success)
{
  success: true,
  message: 'ยกเลิกการจองเรียบร้อยแล้ว',
  data: {
    bookingId: string,
    status: 'cancelled',
    cancellationFee: number,       // 0 or lateCancellationFee
    cancellationFeeStatus: 'waived' | 'pending',
    feeReason: string
  }
}

// Fee Calculation Logic:
// - enableCancellationFee = false → ไม่เก็บค่าธรรมเนียม
// - Within freeCancellationWindow (3 min) → ไม่เก็บค่าธรรมเนียม
// - Driver late (enableDriverLateWaiver) → ไม่เก็บค่าธรรมเนียม
// - Otherwise → เก็บ lateCancellationFee (฿50)
```

#### POST /api/booking/noshow

```typescript
// Step 1: คนขับถึงจุดรับ → POST /api/booking/noshow/arrived
{
  bookingId: string
}
// Response: { waitTimeMs: 300000, waitTimeMinutes: 5 }

// Step 2: รอ 5 นาที แล้วแจ้ง No-Show → POST /api/booking/noshow
{
  bookingId: string,
  note?: string
}

// Response (Success)
{
  success: true,
  message: 'บันทึก No-Show เรียบร้อยแล้ว',
  data: {
    bookingId: string,
    status: 'cancelled',
    isNoShow: true,
    noShowFee: number,      // ฿50
    driverEarnings: number, // noShowFee * noShowFeeToDriverPercent%
    waitedMinutes: number
  }
}
```

#### POST /api/booking/dispute

```typescript
// Request
{
  bookingId: string,
  reason: string,      // 'wrong_charge', 'driver_misconduct', etc.
  description: string, // รายละเอียด (10-1000 ตัวอักษร)
  evidence?: string[]  // URLs รูปหลักฐาน (max 5)
}

// Valid Reasons:
// 'wrong_charge', 'service_not_provided', 'driver_misconduct',
// 'safety_concern', 'wrong_route', 'vehicle_issue', 'unfair_fee', 'other'

// Response (Success)
{
  success: true,
  message: 'ยื่นข้อร้องเรียนเรียบร้อยแล้ว',
  data: {
    disputeId: string,
    bookingId: string,
    status: 'pending',
    referenceNumber: string,  // เช่น 'A1B2C3D4'
    estimatedResponseTime: '24-48 ชั่วโมง'
  }
}

// Dispute Window: ยื่นได้ภายใน 48 ชม. หลัง booking เสร็จสิ้น/ยกเลิก
```

---

## Firebase Services

### การใช้งาน Services

```typescript
// ✅ แนะนำ - ใช้ Services
import { BookingService, DriverService } from '@/lib/firebase/services';

const bookings = await BookingService.getAll();
const driver = await DriverService.getById(driverId);

// ❌ ไม่แนะนำ - Direct Firestore
import { collection, getDocs } from 'firebase/firestore';
const snapshot = await getDocs(collection(db, 'bookings'));
```

### Available Services

| Service | File | Description |
|---------|------|-------------|
| `BookingService` | `BookingService.ts` | CRUD bookings, status updates |
| `DriverService` | `DriverService.ts` | CRUD drivers, status management |
| `VehicleService` | `VehicleService.ts` | CRUD vehicles |
| `UserService` | `UserService.ts` | User management, roles |
| `LocationService` | `LocationService.ts` | Location management |
| `NotificationService` | `NotificationService.ts` | Push notifications |
| `VoucherService` | `VoucherService.ts` | Voucher/promo codes |
| `SettingsService` | `SettingsService.ts` | System settings |

---

## Authentication Flow

### User Authentication

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Login     │────▶│ Firebase Auth │────▶│  Firestore  │
│ (Email/Phone│     │   Verify     │     │ Get User Doc│
│  /Google)   │     └──────────────┘     └──────┬──────┘
└─────────────┘                                  │
                                                 ▼
                                    ┌────────────────────┐
                                    │ Check user.role    │
                                    │ - 'user' → /dashboard
                                    │ - 'admin' → /admin │
                                    └────────────────────┘
```

### Driver Authentication

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│Driver Login │────▶│ Firebase Auth │────▶│ Check User  │
└─────────────┘     └──────────────┘     │isApprovedDriver│
                                         └──────┬──────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
           ┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
           │ Not Approved  │         │ Approved but    │         │    Approved     │
           │ → /driver/    │         │ no setup        │         │ → /driver       │
           │    pending    │         │ → /driver/setup │         │   (Dashboard)   │
           └───────────────┘         └─────────────────┘         └─────────────────┘
```

### API Authentication (Bearer Token)

```typescript
// Frontend - ส่ง token
import { useAuthToken } from '@/lib/hooks';

const { getAuthHeaders } = useAuthToken();
fetch('/api/driver/bookings', {
  headers: await getAuthHeaders()
});

// หรือ manual
const token = await auth.currentUser?.getIdToken();
fetch('/api/driver/bookings', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

// Backend - verify token
const authHeader = request.headers.get('authorization');
const token = authHeader.split('Bearer ')[1];
const decodedToken = await adminAuth.verifyIdToken(token);
const userId = decodedToken.uid;
```

### Role Hierarchy

| Role | Access |
|------|--------|
| `user` | Customer pages, own bookings |
| `admin` | All admin pages, all data |
| `driver` (isApprovedDriver) | Driver pages, assigned bookings |

---

## TypeScript Types

### Location: `/lib/types/index.ts`

### Enums

```typescript
export enum BookingStatus {
    AWAITING_PAYMENT = 'awaiting_payment',
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    DRIVER_ASSIGNED = 'driver_assigned',
    DRIVER_EN_ROUTE = 'driver_en_route',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum PaymentMethod {
    CARD = 'card',
    PROMPTPAY = 'promptpay',
    BANK_TRANSFER = 'bank_transfer',
    CASH = 'cash',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export enum DriverStatus {
    AVAILABLE = 'available',
    BUSY = 'busy',
    OFFLINE = 'offline',
}

export enum DriverSetupStatus {
    PENDING_REVIEW = 'pending_review',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
}

export enum VehicleType {
    SEDAN = 'sedan',
    SUV = 'suv',
    VAN = 'van',
    LUXURY = 'luxury',
}

export enum NotificationType {
    BOOKING = 'booking',
    PAYMENT = 'payment',
    SYSTEM = 'system',
    PROMOTION = 'promotion',
}
```

### Main Interfaces

```typescript
export interface Booking {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupDate: string;
    pickupTime: string;
    vehicleId: string;
    vehicleName: string;
    totalCost: number;
    status: BookingStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    driver?: BookingDriver;
    statusHistory?: StatusHistoryEntry[];
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface Driver {
    id: string;
    userId?: string;
    name: string;
    phone: string;
    email?: string;
    vehiclePlate: string;
    vehicleModel: string;
    vehicleColor: string;
    status: DriverStatus;
    setupStatus?: DriverSetupStatus;
    totalTrips: number;
    rating: number;
    isActive: boolean;
}

export interface Vehicle {
    id: string;
    name: string;
    type: VehicleType;
    seats: number;
    price: number;
    priceUSD?: number;
    image: string;
    features: string[];
    isActive: boolean;
}

export interface User {
    id: string;
    uid: string;
    email: string;
    displayName?: string;
    phone?: string;
    role: UserRole;
    isApprovedDriver?: boolean;
    driverId?: string;
}

export interface Voucher {
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    usageLimit?: number;
    usedCount: number;
    expiresAt?: Timestamp;
    isActive: boolean;
}
```

---

## Firestore Collections

### `bookings`
```typescript
{
  id: string,                    // Auto-generated
  userId: string,                // Customer's user ID
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  pickupLocation: string,
  dropoffLocation: string,
  pickupDate: string,            // "2024-12-28"
  pickupTime: string,            // "14:00"
  vehicleId: string,
  vehicleName: string,
  totalCost: number,
  status: BookingStatus,
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
  slipUrl?: string,              // Payment slip image
  driver?: {
    driverId: string,
    name: string,
    phone: string,
    vehiclePlate: string,
    vehicleModel: string
  },
  statusHistory: [{
    status: string,
    timestamp: Timestamp,        // ใช้ Timestamp.now() ไม่ใช่ FieldValue
    note?: string,
    updatedBy: 'admin' | 'driver' | 'system'
  }],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `users`
```typescript
{
  id: string,                    // Same as Firebase Auth UID
  email: string,
  displayName: string,
  phone: string,
  photoURL?: string,
  role: 'user' | 'admin',
  isApprovedDriver?: boolean,    // Can access driver features
  driverId?: string,             // Link to drivers collection
  provider: 'email' | 'phone' | 'google',
  language?: 'en' | 'th',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `drivers`
```typescript
{
  id: string,
  userId: string,                // Link to users collection
  name: string,
  phone: string,
  email?: string,
  vehiclePlate: string,
  vehicleModel: string,
  vehicleColor: string,
  licenseNumber?: string,
  idCardUrl?: string,            // ID card image
  driverLicenseUrl?: string,     // License image
  photo?: string,
  status: 'available' | 'busy' | 'offline',
  setupStatus: 'pending_review' | 'approved' | 'rejected',
  totalTrips: number,
  rating: number,
  ratingCount: number,
  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `vehicles`
```typescript
{
  id: string,
  name: string,
  type: 'sedan' | 'suv' | 'van' | 'luxury',
  seats: number,
  price: number,
  priceUSD?: number,
  image: string,
  features: string[],
  description?: string,
  passengers?: number,
  luggage?: number,
  transmission?: string,
  isActive: boolean
}
```

### `locations`
```typescript
{
  id: string,
  name: { en: string, th: string },  // Bilingual
  type: 'airport' | 'hotel' | 'city' | 'landmark' | 'other',
  address?: string,
  coordinates?: { lat: number, lng: number },
  isActive: boolean,
  isPopular?: boolean
}
```

### `routes`
```typescript
{
  id: string,
  originId: string,
  originName: string,
  destinationId: string,
  destinationName: string,
  price: number,
  estimatedTime?: number,  // minutes
  distance?: number,       // km
  isActive: boolean
}
```

### `vouchers`
```typescript
{
  id: string,
  code: string,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  minPurchase?: number,
  maxDiscount?: number,
  usageLimit?: number,
  usedCount: number,
  expiresAt?: Timestamp,
  isActive: boolean
}
```

### `notifications`
```typescript
{
  id: string,
  userId: string,
  type: 'booking' | 'payment' | 'system' | 'promotion',
  title: string,
  message: string,
  data?: Record<string, any>,
  isRead: boolean,
  createdAt: Timestamp
}
```

### `admin_notifications`
```typescript
{
  id: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>,
  isRead: boolean,
  createdAt: Timestamp
}
```

### `settings`
```typescript
{
  businessName: string,
  phone: string,
  email: string,
  address: string,
  lineId?: string,
  // ... other settings
}
```

---

## Booking Status Flow

```
                                    ┌─────────────┐
                                    │  cancelled  │
                                    └──────▲──────┘
                                           │ (ยกเลิกได้ทุกขั้น)
                                           │
┌──────────────────┐    ┌─────────┐    ┌───┴─────────┐    ┌─────────────────┐
│ awaiting_payment │───▶│ pending │───▶│  confirmed  │───▶│ driver_assigned │
└──────────────────┘    └─────────┘    └─────────────┘    └────────┬────────┘
      (Card/Stripe)       (Cash/QR)         │                      │
                                            │                      │
                                            │   ┌──────────────────┘
                                            │   │ (คนขับปฏิเสธ)
                                            │   │
                                            ▼   ▼
┌───────────┐    ┌─────────────┐    ┌─────────────────┐
│ completed │◀───│ in_progress │◀───│ driver_en_route │
└───────────┘    └─────────────┘    └─────────────────┘
```

### Status Descriptions

| Status | Thai | Who Updates | Next Action |
|--------|------|-------------|-------------|
| `awaiting_payment` | รอชำระเงิน | System | ลูกค้าชำระเงิน |
| `pending` | รอยืนยัน | System | Admin ยืนยัน |
| `confirmed` | ยืนยันแล้ว | Admin | Admin มอบหมายคนขับ |
| `driver_assigned` | มอบหมายคนขับแล้ว | Admin | คนขับรับ/ปฏิเสธงาน |
| `driver_en_route` | คนขับกำลังไป | Driver | คนขับถึงจุดรับ |
| `in_progress` | กำลังเดินทาง | Driver | ถึงปลายทาง |
| `completed` | เสร็จสิ้น | Driver | - |
| `cancelled` | ยกเลิก | Admin/User | - |

### Driver Job Rejection Flow

เมื่อคนขับปฏิเสธงาน:
```
1. Status: driver_assigned → confirmed
2. booking.driver = null
3. Driver status → available
4. Create admin_notification
5. Admin สามารถมอบหมายคนขับใหม่ได้
```

---

## Language System (i18n)

### Overview

ระบบรองรับ 2 ภาษา: **ไทย (th)** และ **อังกฤษ (en)**

| File | Description |
|------|-------------|
| `/lib/contexts/LanguageContext.tsx` | Language state management |
| `/lib/i18n/translations.ts` | Translation strings ทั้งหมด |

### การใช้งาน useLanguage Hook

```typescript
import { useLanguage } from '@/lib/contexts/LanguageContext';

function MyComponent() {
    const { language, setLanguage, t } = useLanguage();

    // แสดงข้อความตามภาษา
    return <h1>{t.admin.menu.dashboard}</h1>;

    // เปลี่ยนภาษา
    const toggleLanguage = () => {
        setLanguage(language === 'th' ? 'en' : 'th');
    };
}
```

### Language Persistence (สำคัญ!)

ภาษาจะถูกบันทึกใน 2 ที่:

1. **localStorage** - persistent แม้ปิดเบราว์เซอร์
2. **Firestore user.language** - sync ข้ามอุปกรณ์เมื่อ login

```typescript
// Flow การโหลดภาษา:
1. เปิดเว็บ → โหลดจาก localStorage
2. User login → sync จาก Firestore (ถ้ามี)
3. User เปลี่ยนภาษา → บันทึกทั้ง localStorage และ Firestore
```

### Translation Structure

```typescript
// lib/i18n/translations.ts
export const translations = {
    en: {
        nav: { home: 'Home', vehicles: 'Vehicles', ... },
        home: { hero: { title: '...', ... }, ... },
        admin: {
            menu: { dashboard: 'Dashboard', bookings: 'Bookings', ... },
            sidebar: { mainMenu: 'Main Menu', system: 'System', logout: 'Logout' },
            header: { welcomeBack: 'Welcome back,', ... },
            ...
        },
        ...
    },
    th: {
        nav: { home: 'หน้าแรก', vehicles: 'รถยนต์', ... },
        admin: {
            menu: { dashboard: 'แดชบอร์ด', bookings: 'จัดการการจอง', ... },
            ...
        },
        ...
    }
};
```

### การเพิ่ม Translation ใหม่

```typescript
// 1. เพิ่มใน translations.ts ทั้ง en และ th
en: {
    mySection: {
        myKey: 'English text'
    }
},
th: {
    mySection: {
        myKey: 'ข้อความภาษาไทย'
    }
}

// 2. ใช้ใน component
const { t } = useLanguage();
<span>{t.mySection.myKey}</span>
```

### Admin Language Switcher

ปุ่มเปลี่ยนภาษาอยู่ใน Admin header (มุมขวาบน):
- แสดง "TH" หรือ "EN" ตามภาษาปัจจุบัน
- กดเพื่อสลับภาษาทันที
- ภาษาจะ persistent ข้ามการ refresh/reopen

### ❌ AVOID: Hardcoding Text

```typescript
// ❌ Wrong - hardcode ภาษาไทย
<button>บันทึก</button>
<span>คนขับ</span>

// ✅ Correct - ใช้ translations
const { t } = useLanguage();
<button>{t.common.save}</button>
<span>{t.admin.menu.drivers}</span>
```

---

## React Hooks

### Available Hooks

```typescript
// Data fetching
import { useDataFetching, useFetch } from '@/lib/hooks';

// Table filters
import { useTableFilters, useDateFilter } from '@/lib/hooks';

// Modal management
import { useFormModal, useConfirmDialog } from '@/lib/hooks';

// Auth token
import { useAuthToken } from '@/lib/hooks';
```

### Usage Examples

```typescript
// useDataFetching
const { data, loading, error, refetch } = useDataFetching(
  () => BookingService.getAll(),
  []
);

// useAuthToken
const { getAuthHeaders, token } = useAuthToken();
const headers = await getAuthHeaders();

// useFormModal
const { isOpen, openModal, closeModal, formData } = useFormModal<Booking>();
```

---

## Components

### UI Components (`/components/ui/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | `variant`, `size`, `loading` | Styled button |
| `Modal` | `isOpen`, `onClose`, `title`, `size` | Modal dialog |
| `Toast` | `message`, `type` | Toast notifications |
| `FormField` | `label`, `error`, `required` | Form input wrapper |
| `StatusBadge` | `status`, `type` | Status indicator |
| `DataTable` | `data`, `columns`, `searchable` | Data table |
| `VehicleCard` | `vehicle`, `onSelect` | Vehicle display |

### Layout Components (`/components/layout/`)

| Component | Description |
|-----------|-------------|
| `Header` | Main navigation header |
| `Footer` | Page footer |
| `ConditionalLayout` | Show/hide header based on route |

### Navigation Components (`/components/navigation/`)

| Component | Description |
|-----------|-------------|
| `BackButton` | Go back button |
| `Breadcrumb` | Breadcrumb navigation |
| `BookingProgress` | Booking step indicator |

---

## Error Handling Patterns

### API Response Format

```typescript
// Success
return NextResponse.json({
  success: true,
  data: { ... },
  message: 'สำเร็จ'
});

// Error
return NextResponse.json(
  { success: false, error: 'ข้อความ error ภาษาไทย' },
  { status: 400 | 401 | 403 | 404 | 500 }
);
```

### Frontend Error Handling

```typescript
try {
  const response = await fetch('/api/...');
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'เกิดข้อผิดพลาด');
  }

  // Handle success
} catch (error: any) {
  console.error('Error:', error);
  alert(error.message || 'ไม่สามารถดำเนินการได้');
}
```

### Common Error Messages (Thai)

| Situation | Message |
|-----------|---------|
| Not authenticated | กรุณาเข้าสู่ระบบใหม่ |
| Not authorized | คุณไม่มีสิทธิ์เข้าถึง |
| Not found | ไม่พบข้อมูล |
| Validation error | กรุณากรอกข้อมูลให้ครบถ้วน |
| Server error | เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง |

---

## Payment Flow

### Card (Stripe)
```
1. ลูกค้าเลือก Card → สร้าง booking (status: awaiting_payment)
2. สร้าง Stripe Checkout Session
3. Redirect ไป Stripe
4. ชำระสำเร็จ → Webhook update status เป็น pending
5. Redirect กลับ /payment/success
```

### PromptPay QR
```
1. ลูกค้าเลือก PromptPay
2. สร้าง booking (status: pending)
3. แสดง QR Code (ใช้ promptpay-qr + qrcode.react)
4. ลูกค้าอัพโหลด slip
5. Admin ตรวจสอบและ confirm
```

### Cash
```
1. ลูกค้าเลือก Cash
2. สร้าง booking (status: pending)
3. Redirect ไป /confirmation
4. ชำระเงินกับคนขับ
```

---

## Known Issues & Solutions

| Issue | Cause | Solution | File |
|-------|-------|----------|------|
| `FieldValue.serverTimestamp() in array` | Firebase limitation | ใช้ `Timestamp.now()` แทน | API routes |
| "No document to update" | Local booking ID | เช็ค `startsWith('local-')` | firestore.ts |
| Permission denied on driver | Missing auth token | ส่ง Bearer token ทุก request | driver/page.tsx |
| Driver info ไม่แสดง | Field mismatch | ใช้ `booking.driver?.name` | Various |
| Mobile dropdown z-index | absolute positioning | ใช้ fixed + bottom sheet บน mobile | vehicles/page.tsx |

### Bug Fix Reference

```typescript
// ❌ Wrong - จะ error ใน array
statusHistory.push({
  timestamp: FieldValue.serverTimestamp()
});

// ✅ Correct
import { Timestamp } from 'firebase-admin/firestore';
statusHistory.push({
  timestamp: Timestamp.now()
});
```

---

## 🔍 Debug & Monitoring Scripts

### scripts/check-logs.js - ตรวจสอบ Bugs

ใช้ตรวจสอบ bugs ในระบบครั้งเดียว:

```bash
# ตรวจสอบทั้งหมด (Vercel logs, Firebase, Code issues, TypeScript)
node scripts/check-logs.js

# ตรวจสอบเฉพาะ Vercel production logs
node scripts/check-logs.js --vercel

# ตรวจสอบเฉพาะ Firebase configuration
node scripts/check-logs.js --firebase

# ตรวจสอบเฉพาะ code issues
node scripts/check-logs.js --code
```

**สิ่งที่ตรวจสอบ:**
| Check | Description |
|-------|-------------|
| Vercel Logs | ดึง 50 logs ล่าสุดและหา error patterns |
| Firebase | เช็ค env vars ครบหรือไม่ |
| Code Issues | หา `any` type, `console.log`, `TODO`, `@ts-ignore` |
| TypeScript | รัน `tsc --noEmit` เพื่อหา type errors |
| API Routes | เช็คว่าไฟล์ route.ts มีอยู่ |

### scripts/monitor-logs.js - ติดตาม Logs แบบ Real-time

ใช้ติดตาม logs ตลอดเวลาและแจ้งเตือนเมื่อพบ error:

```bash
# Monitor Vercel production logs (ต้อง vercel login ก่อน)
node scripts/monitor-logs.js

# Monitor dev server (localhost:3000)
node scripts/monitor-logs.js --dev
```

**Features:**
- 🔴 แจ้งเตือนทันที (พร้อมเสียง) เมื่อพบ error
- 🟡 ไฮไลท์ warnings
- 🟢 แสดง success messages
- กด `s` เพื่อดูสถิติ live (errors, warnings, runtime)
- กด `Ctrl+C` เพื่อหยุดและดู summary

---

## 🧪 Testing Guide

### ก่อน Deploy ต้องทดสอบ

```bash
# 1. Build test - ต้องผ่านก่อน deploy เสมอ!
npm run build

# 2. Run locally และทดสอบ
npm run dev
```

### Checklist ทดสอบแต่ละ Role

#### ลูกค้า (Customer)
```markdown
□ สมัครสมาชิก (Email/Phone/Google)
□ เข้าสู่ระบบ
□ เลือกรถและจอง
□ ชำระเงิน (ทดสอบทุกวิธี)
□ ดู dashboard และสถานะ booking
□ แก้ไข profile
□ ใช้ voucher code
□ รับ notification
```

#### แอดมิน (Admin)
```markdown
□ เข้าสู่ระบบ admin
□ ดู dashboard สถิติ
□ จัดการ booking (ยืนยัน, มอบหมายคนขับ, ยกเลิก)
□ จัดการคนขับ (เพิ่ม, แก้ไข, ลบ, อนุมัติ)
□ จัดการรถ (CRUD)
□ จัดการสถานที่และเส้นทาง
□ จัดการ members
□ ตั้งค่าระบบ
```

#### คนขับ (Driver)
```markdown
□ เข้าสู่ระบบ driver
□ กรอกข้อมูลรถ (setup)
□ เปิด/ปิด online status
□ รับงานใหม่
□ ปฏิเสธงาน
□ อัปเดตสถานะงาน (en_route → in_progress → completed)
□ ดูประวัติงาน
□ ดูรายได้
```

### API Testing

```bash
# ทดสอบ Driver API (ต้องมี Bearer token)
curl -X GET "http://localhost:3000/api/driver/bookings?driverId=xxx" \
  -H "Authorization: Bearer <token>"

# ทดสอบ Admin API
curl -X GET "http://localhost:3000/api/admin/bookings"
```

### Common Test Cases ที่ต้องผ่าน

| Test Case | Expected Result |
|-----------|-----------------|
| คนขับมีงานอยู่ → รับงานใหม่ | ❌ Error: คนขับกำลังมีงานอยู่ |
| คนขับมีงานอยู่ → ปิด offline | ❌ Error: ต้องเสร็จงานก่อน |
| คนขับรับงานตัวเอง | ❌ Error: ไม่สามารถรับงานตัวเอง |
| Skip status (assigned → completed) | ❌ Error: Invalid transition |
| ไม่ส่ง Bearer token | ❌ Error: Unauthorized |

---

## 📋 Deployment Checklist

### Pre-Deployment (ก่อน Deploy)

```markdown
□ 1. npm run build ผ่านไม่มี error
□ 2. ทดสอบ flow หลักทั้งหมดใน localhost
□ 3. เช็ค console ไม่มี error/warning สำคัญ
□ 4. เช็ค environment variables ครบ
□ 5. ไม่มี console.log ที่ไม่จำเป็น
□ 6. ไม่มี hard-coded sensitive values
□ 7. อัปเดต CLAUDE.md ถ้ามีการเปลี่ยนแปลงสำคัญ
```

### Deployment Commands

```bash
# 1. Build ก่อน
npm run build

# 2. Deploy to Vercel
vercel --prod

# 3. ตรวจสอบ deployment
# เปิด https://car-rental-phi-lime.vercel.app
```

### Post-Deployment (หลัง Deploy)

```markdown
□ 1. เปิดเว็บ production ทดสอบ
□ 2. ทดสอบ login ทุกวิธี
□ 3. ทดสอบ booking flow
□ 4. ทดสอบ driver dashboard
□ 5. ทดสอบ admin dashboard
□ 6. เช็ค Firebase Console ว่าข้อมูลถูกต้อง
□ 7. เช็ค Vercel logs ไม่มี error
```

### Environment Variables Checklist

> ⚠️ **สำคัญมาก:** เมื่อเพิ่ม Environment Variable ใหม่ ต้องเพิ่มใน **2 ที่**:
> 1. `.env.local` - สำหรับ localhost development
> 2. **Vercel Dashboard** - สำหรับ production (`vercel env add` หรือผ่าน UI)

```markdown
# Vercel Environment Variables ต้องมี:
□ NEXT_PUBLIC_FIREBASE_API_KEY
□ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
□ NEXT_PUBLIC_FIREBASE_PROJECT_ID
□ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
□ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
□ NEXT_PUBLIC_FIREBASE_APP_ID
□ NEXT_PUBLIC_FIREBASE_VAPID_KEY
□ FIREBASE_ADMIN_PROJECT_ID
□ FIREBASE_ADMIN_CLIENT_EMAIL
□ FIREBASE_ADMIN_PRIVATE_KEY
□ STRIPE_SECRET_KEY
□ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### ⚠️ Vercel Env Vars - ระวัง Invalid Characters! (สำคัญมาก)

**ปัญหาที่เคยเจอ:** Stripe API error "Invalid character in header content [Authorization]"

**สาเหตุ:** env var มี quotes (`"`) หรือ newline (`\n`) ติดมาด้วย เช่น:
```bash
# ❌ ผิด - มี \n ต่อท้าย
STRIPE_SECRET_KEY="sk_test_xxx\n"

# ✅ ถูก - ไม่มี characters พิเศษ
STRIPE_SECRET_KEY="sk_test_xxx"
```

**วิธีเพิ่ม env var ที่ถูกต้อง:**
```bash
# ใช้ printf (ไม่เพิ่ม newline)
printf 'sk_test_xxx' | vercel env add STRIPE_SECRET_KEY production

# ❌ อย่าใช้ echo (อาจเพิ่ม newline)
# ❌ อย่า copy จาก file ที่มี quotes
```

**วิธีตรวจสอบว่า env var ถูกต้อง:**
```bash
vercel env pull .env.vercel --environment production
cat .env.vercel | grep STRIPE
# ดูว่าไม่มี \n หรือ characters แปลกๆ ต่อท้าย
```

**ถ้าเจอปัญหา:**
```bash
# 1. ลบ env var เดิม
echo "y" | vercel env rm STRIPE_SECRET_KEY production

# 2. เพิ่มใหม่ด้วย printf
printf 'sk_test_xxx' | vercel env add STRIPE_SECRET_KEY production

# 3. Deploy ใหม่
vercel --prod
```

### Rollback Plan

```bash
# ถ้ามีปัญหา rollback ไป deployment ก่อนหน้า
vercel rollback

# หรือดู deployments ทั้งหมด
vercel ls
```

---

## 🔧 Troubleshooting Guide

### Error ที่พบบ่อยและวิธีแก้

#### 1. "Permission denied" ใน Firestore

```
Error: Missing or insufficient permissions
```

**สาเหตุ:** Security rules ไม่อนุญาต หรือ user ไม่มีสิทธิ์

**วิธีแก้:**
```typescript
// 1. เช็คว่า user login แล้ว
if (!auth.currentUser) {
    router.push('/login');
    return;
}

// 2. เช็ค role ใน Firestore
const userDoc = await getDoc(doc(db, 'users', user.uid));
if (userDoc.data()?.role !== 'admin') {
    // ไม่มีสิทธิ์
}

// 3. สำหรับ Driver - ใช้ API route แทน direct Firestore
// ❌ Wrong
await updateDoc(doc(db, 'bookings', id), { status: 'completed' });

// ✅ Correct - ใช้ API
await fetch('/api/driver/bookings', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ action: 'updateStatus', bookingId, driverId, data: { status } })
});
```

#### 2. "Unauthorized - No token provided"

```
Error: Unauthorized - No token provided
```

**สาเหตุ:** ไม่ได้ส่ง Bearer token

**วิธีแก้:**
```typescript
// ใช้ useAuthToken hook
import { useAuthToken } from '@/lib/hooks';
const { getAuthHeaders } = useAuthToken();

const response = await fetch('/api/driver/bookings', {
    headers: await getAuthHeaders()  // ✅ ต้องมี
});
```

#### 3. "FieldValue.serverTimestamp is not a function" หรือ Error ใน Array

**สาเหตุ:** ใช้ FieldValue.serverTimestamp() ใน array

**วิธีแก้:**
```typescript
// ❌ Wrong
import { FieldValue } from 'firebase-admin/firestore';
statusHistory.push({ timestamp: FieldValue.serverTimestamp() });

// ✅ Correct
import { Timestamp } from 'firebase-admin/firestore';
statusHistory.push({ timestamp: Timestamp.now() });
```

#### 4. "No document to update"

**สาเหตุ:** พยายาม update document ที่ไม่มีอยู่ หรือ ID เป็น local ID

**วิธีแก้:**
```typescript
// เช็คว่าไม่ใช่ local booking
if (bookingId.startsWith('local-')) {
    console.log('Cannot update local booking');
    return;
}

// เช็คว่า document มีอยู่
const docSnap = await getDoc(doc(db, 'bookings', bookingId));
if (!docSnap.exists()) {
    throw new Error('Document not found');
}
```

#### 5. "Cannot read properties of undefined"

**สาเหตุ:** Data ยังไม่โหลด หรือ field ไม่มี

**วิธีแก้:**
```typescript
// ใช้ optional chaining
const driverName = booking?.driver?.name || 'ไม่ระบุ';

// เช็ค loading state
if (loading) return <Loading />;
if (!data) return <NotFound />;
```

#### 6. Driver ไม่เห็นงานใหม่

**สาเหตุ:** Real-time listener ไม่ทำงาน

**วิธีแก้:**
```typescript
// ตรวจสอบว่าใช้ onSnapshot ถูกต้อง
useEffect(() => {
    const q = query(
        collection(db, 'bookings'),
        where('driver.driverId', '==', driverId),
        where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        // handle updates
    });

    return () => unsubscribe();  // ✅ ต้อง cleanup
}, [driverId]);
```

#### 7. Build Error: Type errors

**วิธีแก้:**
```typescript
// 1. เช็ค import ถูกต้อง
import { Booking } from '@/lib/types';  // ✅

// 2. ใช้ type ที่ถูกต้อง
const booking: Booking = { ... };

// 3. Handle null/undefined
const value = data?.field ?? 'default';
```

#### 8. Mobile Dropdown ไม่แสดง / ถูกบัง

**สาเหตุ:** z-index ต่ำกว่า element อื่น

**วิธีแก้:**
```typescript
// ใช้ fixed position + high z-index สำหรับ mobile
<div className="fixed inset-0 z-50 md:absolute md:inset-auto">
    {/* dropdown content */}
</div>
```

---

## 📝 Form Validation Patterns

### Form Accessibility (ต้องทำทุกครั้ง!) ♿

ทุก `<input>`, `<select>`, `<textarea>` ต้องมี:

```tsx
// ✅ CORRECT - มี id, name, label
<div>
    <label htmlFor="customer-name">ชื่อลูกค้า</label>
    <input
        id="customer-name"
        name="customerName"
        type="text"
        autoComplete="name"
        value={value}
        onChange={onChange}
    />
</div>

// ✅ CORRECT - Dynamic ID สำหรับ list items
{items.map((item) => (
    <div key={item.id}>
        <label htmlFor={`status-${item.id}`} className="sr-only">สถานะ</label>
        <select
            id={`status-${item.id}`}
            name={`status-${item.id}`}
            value={item.status}
            onChange={onChange}
        >
            <option value="pending">รอดำเนินการ</option>
        </select>
    </div>
))}

// ❌ WRONG - ไม่มี id, name, label
<input
    type="text"
    value={value}
    onChange={onChange}
/>
```

**Checklist สำหรับ Form Elements:**
- [ ] มี `id` attribute (unique ในหน้า)
- [ ] มี `name` attribute
- [ ] มี `<label htmlFor="...">` หรือ `<label className="sr-only">`
- [ ] มี `autoComplete` attribute ที่เหมาะสม
- [ ] ถ้าเป็น list items ใช้ dynamic ID: `id={`fieldName-${item.id}`}`

### Standard Validation Rules

```typescript
// ใช้ validation เดียวกันทั้ง project

// 1. Required field
if (!value || value.trim() === '') {
    setError('กรุณากรอกข้อมูล');
    return false;
}

// 2. Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    setError('รูปแบบอีเมลไม่ถูกต้อง');
    return false;
}

// 3. Phone validation (Thai)
const phoneRegex = /^(0[689]\d{8}|0[2-5]\d{7})$/;
if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
    setError('รูปแบบเบอร์โทรไม่ถูกต้อง');
    return false;
}

// 4. Vehicle plate (Thai)
const plateRegex = /^[ก-ฮ]{1,2}\s?\d{1,4}$/;
if (!plateRegex.test(vehiclePlate)) {
    setError('รูปแบบทะเบียนรถไม่ถูกต้อง');
    return false;
}

// 5. Min/Max length
if (value.length < 2 || value.length > 100) {
    setError('ความยาวต้องอยู่ระหว่าง 2-100 ตัวอักษร');
    return false;
}

// 6. Number range
if (price < 0 || price > 100000) {
    setError('ราคาต้องอยู่ระหว่าง 0-100,000');
    return false;
}
```

### Form Component Pattern

```typescript
// ใช้ pattern นี้สำหรับทุก form
const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
});
const [errors, setErrors] = useState<Record<string, string>>({});
const [loading, setLoading] = useState(false);

const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
        newErrors.name = 'กรุณากรอกชื่อ';
    }
    if (!formData.email.trim()) {
        newErrors.email = 'กรุณากรอกอีเมล';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
};

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
        // submit logic
    } catch (error: any) {
        setErrors({ submit: error.message });
    } finally {
        setLoading(false);
    }
};
```

### Error Display Pattern

```tsx
// แสดง error ใต้ input
<div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">
        ชื่อ <span className="text-red-500">*</span>
    </label>
    <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className={`w-full px-4 py-2 border rounded-lg ${
            errors.name ? 'border-red-500' : 'border-gray-300'
        }`}
    />
    {errors.name && (
        <p className="text-red-500 text-sm">{errors.name}</p>
    )}
</div>
```

---

## 📤 File Upload Patterns

### Upload to Firebase Storage

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';

// ฟังก์ชัน upload มาตรฐาน
async function uploadFile(
    file: File,
    path: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    if (!storage) throw new Error('Storage not initialized');

    // 1. Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error('ไฟล์มีขนาดใหญ่เกิน 5MB');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('รองรับเฉพาะไฟล์ JPG, PNG, WEBP');
    }

    // 2. Create unique filename
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const fullPath = `${path}/${filename}`;

    // 3. Upload
    const storageRef = ref(storage, fullPath);
    await uploadBytes(storageRef, file);

    // 4. Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}
```

### Usage in Component

```tsx
const [uploading, setUploading] = useState(false);
const [imageUrl, setImageUrl] = useState('');

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
        // Upload to specific folder
        const url = await uploadFile(file, 'drivers/documents');
        setImageUrl(url);
    } catch (error: any) {
        alert(error.message);
    } finally {
        setUploading(false);
    }
};

return (
    <div>
        <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
        />
        {uploading && <p>กำลังอัพโหลด...</p>}
        {imageUrl && <img src={imageUrl} alt="Uploaded" className="w-32 h-32 object-cover" />}
    </div>
);
```

### Image Preview Before Upload

```tsx
const [preview, setPreview] = useState<string | null>(null);

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
        setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
};
```

### Storage Folder Structure

```
firebase-storage/
├── drivers/
│   ├── documents/          # บัตรประชาชน, ใบขับขี่
│   │   ├── {timestamp}-{random}.jpg
│   │   └── ...
│   └── photos/             # รูปโปรไฟล์คนขับ
│       └── ...
├── vehicles/
│   └── images/             # รูปรถ
│       └── ...
├── bookings/
│   └── slips/              # สลิปการชำระเงิน
│       └── ...
└── users/
    └── avatars/            # รูปโปรไฟล์ลูกค้า
        └── ...
```

### Compression Before Upload (Optional)

```typescript
// ใช้ browser-image-compression
import imageCompression from 'browser-image-compression';

async function compressAndUpload(file: File, path: string): Promise<string> {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
    };

    const compressedFile = await imageCompression(file, options);
    return uploadFile(compressedFile, path);
}
```

---

## Firestore Security Rules Summary

```javascript
// Admin check
function isAdmin() {
  return getUserData().role == 'admin';
}

// Driver check
function isApprovedDriver() {
  return getUserData().isApprovedDriver == true;
}

// Rules Summary
bookings:
  - create: authenticated users
  - read: owner OR admin OR ASSIGNED driver (v5.2 security fix)
  - update: owner OR admin OR assigned driver
  - list: admin OR approved driver (documents must pass read rule)
  - delete: admin only

users: owner OR admin (protected: role, isApprovedDriver)
drivers: read=authenticated, write=admin OR self
settings: read=authenticated, write=admin
vehicles/locations/routes: read=public, write=admin
vouchers: read=authenticated, write=admin
notifications: owner only
```

### Booking Read Access (v5.2 Security Fix)

```javascript
// ก่อนแก้ไข (มีช่องโหว่):
allow read: if ... || isApprovedDriver()  // คนขับอ่านได้ทุก booking!

// หลังแก้ไข (ปลอดภัย):
allow read: if ... ||
  (isApprovedDriver() &&
   resource.data.driver != null &&
   resource.data.driver.driverId == getUserDriverId())  // คนขับอ่านได้เฉพาะงานที่ได้รับมอบหมาย
```

---

## Environment Variables

```bash
# Firebase (Public - NEXT_PUBLIC_*)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Firebase Admin (Server Only - NEVER expose)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe (Server Only)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## PWA Configuration

### Files
- `/public/manifest.json` - PWA manifest
- `/public/sw.js` - Service worker
- `/public/firebase-messaging-sw.js` - FCM service worker
- `/public/icons/` - App icons (various sizes)

### Features
- Installable on mobile/desktop
- Push notifications (FCM)
- Offline support (basic)

---

## Completed Features ✅

### Customer
- [x] Landing page
- [x] Vehicle selection & booking
- [x] Payment (Stripe, PromptPay, Cash)
- [x] Dashboard with booking status
- [x] Profile settings
- [x] Celebration effect on completion
- [x] PWA installable
- [x] Voucher system (VoucherService ready)

### Admin
- [x] Dashboard with statistics
- [x] Booking management (CRUD, status, assign driver)
- [x] Driver management (CRUD, status, approval)
- [x] Customer management
- [x] Vehicle management (CRUD)
- [x] Location & route management
- [x] Settings page
- [x] Thai language UI
- [x] Admin members management

### Driver
- [x] Driver dashboard
- [x] Online/Offline toggle
- [x] Real-time job notifications
- [x] Accept/Reject jobs
- [x] Status update flow
- [x] Trip history
- [x] API authentication (secured)
- [x] Driver setup/onboarding

### System
- [x] Firebase Auth (Email, Phone, Google)
- [x] Firestore security rules
- [x] API authentication with Bearer tokens
- [x] Role-based access control
- [x] Push notifications (FCM)
- [x] Service layer architecture
- [x] TypeScript types
- [x] Custom hooks

---

## Pending Features ⏳

### High Priority
1. **Real-time Maps Tracking** - ติดตามคนขับแบบ real-time (Google Maps) 🗺️
2. **Email/SMS Notifications** - แจ้งเตือนผ่าน email/sms
3. **Reports/Analytics** - รายงานรายได้, trends
4. **Voucher Admin UI** - หน้า admin จัดการ voucher

### Medium Priority
5. ~~**Reviews/Ratings** - รีวิวหลังเสร็จงาน~~ ✅ **DONE v7.4**
6. **Recurring Bookings** - จองประจำ

### Nice to Have
7. **Chat** - แชทลูกค้า-คนขับ
8. **Invoice/Receipt** - ใบเสร็จ PDF
9. **Referral System** - แนะนำเพื่อน

---

## 🗺️ Real-Time Maps (In Progress)

> **Status:** Test Page Ready | **Technology:** Google Maps Platform

### Test Page (Grab/Uber Style) 🚗

**URL:** `/test-maps` (http://localhost:3000/test-maps)

**ฟีเจอร์ที่ทำแล้ว:**
| Feature | Description | Implementation |
|---------|-------------|----------------|
| Smooth Animation | รถเคลื่อนที่ตามเส้นทางแบบ smooth | `interpolate` + `requestAnimationFrame` |
| Car Rotation | รถหมุนตามทิศทางการเลี้ยว | `calculateBearing()` function |
| Map Following | แผนที่เลื่อนตามรถอัตโนมัติ | `map.panTo()` (toggle) |
| ETA Display | แสดงเวลาถึงแบบ real-time | คำนวณจากระยะทาง/ความเร็ว |
| Progress Bar | แสดงความคืบหน้าการเดินทาง | % ของระยะทางที่ผ่านมา |
| **Places Autocomplete** | ค้นหาจุดรับ-ส่งจริง | `<Autocomplete>` component |
| **GPS Pickup** | ใช้ตำแหน่งปัจจุบันเป็นจุดรับ | `navigator.geolocation` |
| **Draggable Markers** | ลากหมุดจุดรับ+จุดส่งได้ทั้งคู่ | `draggable={status === 'searching'}` |
| **Real-time Address** | ที่อยู่อัปเดตขณะลาก (ไม่ต้องปล่อยหมุด) | `onDrag` + debounce 200ms |
| **Large Markers** | หมุดใหญ่ 44x55px กดง่าย | Custom SVG markers |
| **Custom Modern Markers** | หมุด gradient สวยๆ + shadow | SVG data URL |
| **Lock on Trip** | ล็อคหมุดเมื่อรถเริ่มวิ่ง | `draggable={status === 'searching'}` |
| **Map Controls** | ปุ่มซูมไปรถ/ตำแหน่งฉัน/ดูเส้นทาง | Custom buttons |

**วิธีทดสอบ:**
```markdown
1. พิมพ์ค้นหาจุดรับในช่อง หรือ กดปุ่ม 📍 GPS
2. ลากหมุด A เพื่อปรับตำแหน่ง (ที่อยู่อัปเดต real-time)
3. พิมพ์ค้นหาจุดส่ง หรือ เลือกจากปุ่มสถานที่ยอดนิยม
4. กดปุ่ม "จำลองหาคนขับ"
5. ใช้ปุ่ม 🚗 ซูมไปที่รถ, 📍 ตำแหน่งฉัน, 🗺️ ดูทั้งเส้นทาง
```

**Key Code (app/test-maps/page.tsx):**
```typescript
// Bearing calculation for car rotation
function calculateBearing(from: Coordinates, to: Coordinates): number {
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// CarMarker component with rotation
<OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
    <div style={{ transform: `rotate(${bearing}deg)` }}>
        {/* Car body */}
    </div>
</OverlayView>
```

### Google Maps APIs

| API | ใช้ทำอะไร | ราคา |
|-----|---------|------|
| Maps JavaScript | แสดงแผนที่ | $7/1,000 loads |
| Directions | เส้นทาง | $5/1,000 requests |
| Distance Matrix | ระยะทาง/ETA | $5/1,000 requests |
| Places | Autocomplete | $2.83/1,000 requests |

### Environment Variables

```bash
# Google Maps API Key (เพิ่มแล้ว)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCHhKlIqlU4nTq_8VbHyROPSz3BUG1P9Xc
```

**Project:** Tuktik Project (`y9kwjw47a2jytykyv2mlbyok4qw47i`)

### Dependencies (ติดตั้งแล้ว ✅)

```bash
npm install @react-google-maps/api  # ติดตั้งแล้ว
```

### Database Schema (ต้องเพิ่ม)

**drivers collection:**
```typescript
currentLocation?: { lat: number; lng: number; timestamp: Timestamp; }
```

**bookings collection:**
```typescript
pickupCoordinates?: { lat: number; lng: number; }
dropoffCoordinates?: { lat: number; lng: number; }
distance?: number;          // km
estimatedDuration?: number; // minutes
```

### Files Created/To Create

| ไฟล์ | หน้าที่ | Status |
|-----|--------|--------|
| `app/test-maps/page.tsx` | Test page (Grab/Uber style) | ✅ Done |
| `components/map/MapContainer.tsx` | แสดงแผนที่ (basic) | ✅ Done |
| `components/map/index.ts` | Export file | ✅ Done |
| `components/map/DriverMarker.tsx` | Marker คนขับ | ⏳ Pending |
| `lib/hooks/useGeolocation.ts` | GPS hook | ⏳ Pending |
| `lib/firebase/services/LocationTrackingService.ts` | Location updates | ⏳ Pending |
| `app/api/driver/location/route.ts` | Location API | ⏳ Pending |

### Implementation Checklist

- [x] สมัคร Google Maps API Key ✅
- [x] ติดตั้ง @react-google-maps/api ✅
- [x] สร้าง MapContainer component ✅
- [x] สร้าง Test Page (Grab/Uber style animation) ✅
- [x] Address autocomplete (Places API) ✅
- [x] GPS pickup location ✅
- [x] Draggable marker + Real-time address ✅
- [x] Map control buttons (zoom to car/location/route) ✅
- [ ] เพิ่ม currentLocation field ใน drivers
- [ ] สร้าง /api/driver/location endpoint
- [ ] เพิ่ม map ในหน้า driver dashboard
- [ ] เพิ่ม tracking map ในหน้า customer dashboard

---

## 👤 Passenger Rules (v8.9)

> **Status:** Phase 1 Complete | **API:** Coming in Phase 3

### Overview

กฎสำหรับผู้โดยสาร (Passenger Rules) ครอบคลุม 3 ส่วนหลัก:
1. **Cancellation Rules** - กฎการยกเลิก (ฟรี/มีค่าธรรมเนียม)
2. **No-Show Rules** - กฎเมื่อลูกค้าไม่มารับรถ
3. **Dispute System** - ระบบอุทธรณ์

### PassengerConfig (System Settings)

```typescript
// lib/types/index.ts - PassengerConfig interface
export interface PassengerConfig {
    // Cancellation Rules
    freeCancellationWindowMs: number;     // ยกเลิกฟรีภายในกี่ ms หลังได้คนขับ (default: 180000 = 3 นาที)
    lateCancellationFee: number;          // ค่าธรรมเนียมยกเลิกหลังหมดเวลา (default: 50 บาท)
    enableCancellationFee: boolean;       // เปิด/ปิดการเก็บค่ายกเลิก

    // No-Show Rules
    noShowWaitTimeMs: number;             // รอลูกค้ากี่ ms ก่อนแจ้ง no-show (default: 300000 = 5 นาที)
    noShowFee: number;                    // ค่าธรรมเนียม no-show (default: 50 บาท)
    enableNoShowFee: boolean;             // เปิด/ปิดการเก็บค่า no-show

    // Fee Distribution
    cancellationFeeToDriverPercent: number; // % ค่ายกเลิกที่ให้คนขับ (default: 100)
    noShowFeeToDriverPercent: number;       // % ค่า no-show ที่ให้คนขับ (default: 100)

    // Driver Late Waiver
    driverLateThresholdMs: number;        // คนขับมาช้าเกินกี่ ms ลูกค้ายกเลิกฟรี (default: 300000 = 5 นาที)
    enableDriverLateWaiver: boolean;      // เปิด/ปิดการยกเว้นค่าธรรมเนียมเมื่อคนขับมาช้า

    // Booking Limits
    maxActiveBookings: number;            // จอง active ได้สูงสุดกี่รายการ (default: 1)
    maxCancellationsPerDay: number;       // ยกเลิกได้สูงสุดกี่ครั้ง/วัน (default: 3)
    enableCancellationLimit: boolean;     // เปิด/ปิดการจำกัดจำนวนยกเลิก

    // Dispute Rules
    disputeWindowHours: number;           // ขอ dispute ได้ภายในกี่ชม. หลังเสร็จ trip (default: 48)
    enableDispute: boolean;               // เปิด/ปิดระบบ dispute
}
```

### Booking Fields (Cancellation/No-Show/Dispute)

```typescript
// lib/types/index.ts - Booking interface additions
{
    // Cancellation System
    cancelledAt?: Timestamp | Date;                     // When booking was cancelled
    cancelledBy?: 'customer' | 'driver' | 'admin' | 'system';
    cancellationReason?: CancellationReason | string;
    cancellationFee?: number;                           // Fee charged (THB)
    cancellationFeeStatus?: 'pending' | 'charged' | 'waived' | 'refunded';
    driverAssignedAt?: Timestamp | Date;                // When driver was assigned (for free cancel window)

    // No-Show System
    driverArrivedAt?: Timestamp | Date;                 // When driver arrived at pickup
    noShowReportedAt?: Timestamp | Date;                // When no-show was reported
    isNoShow?: boolean;
    noShowFee?: number;

    // Dispute System
    hasDispute?: boolean;
    disputeId?: string;
    disputeStatus?: 'pending' | 'investigating' | 'resolved' | 'rejected';
    disputeReason?: string;
    disputeResolvedAt?: Timestamp | Date;
}
```

### CancellationReason Enum

```typescript
export enum CancellationReason {
    // Customer initiated
    CHANGED_MIND = 'changed_mind',           // เปลี่ยนใจ
    FOUND_ALTERNATIVE = 'found_alternative', // หาทางเลือกอื่น
    DRIVER_TOO_FAR = 'driver_too_far',       // คนขับไกลเกินไป
    DRIVER_LATE = 'driver_late',             // คนขับมาช้า
    WRONG_LOCATION = 'wrong_location',       // ระบุที่ผิด
    EMERGENCY = 'emergency',                 // เหตุฉุกเฉิน

    // Driver initiated
    CUSTOMER_NO_SHOW = 'customer_no_show',   // ลูกค้าไม่มา
    CUSTOMER_UNREACHABLE = 'customer_unreachable', // ติดต่อลูกค้าไม่ได้
    UNSAFE_PICKUP = 'unsafe_pickup',         // จุดรับไม่ปลอดภัย

    // System/Admin
    DRIVER_UNAVAILABLE = 'driver_unavailable', // ไม่มีคนขับว่าง
    SYSTEM_ERROR = 'system_error',           // ระบบมีปัญหา
    ADMIN_CANCELLED = 'admin_cancelled',     // Admin ยกเลิก
    OTHER = 'other',
}
```

### Cancellation Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                     CANCELLATION FLOW                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Customer requests cancel                                         │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────────────────────────────────────┐                 │
│  │ Check: Is within freeCancellationWindow?   │                 │
│  │ (driverAssignedAt + freeCancellationWindowMs)│                │
│  └──────────────────┬──────────────────────────┘                 │
│                     │                                             │
│         ┌───────────┴───────────┐                                │
│         │                       │                                │
│         ▼                       ▼                                │
│  ┌─────────────┐         ┌─────────────────────────┐            │
│  │ FREE CANCEL │         │ Check: Is driver late?  │            │
│  │ No fee      │         │ (now > pickupTime +     │            │
│  └─────────────┘         │  driverLateThresholdMs) │            │
│                          └──────────┬──────────────┘            │
│                                     │                            │
│                          ┌──────────┴───────────┐               │
│                          │                      │               │
│                          ▼                      ▼               │
│                   ┌─────────────┐        ┌─────────────┐        │
│                   │ FREE CANCEL │        │ LATE FEE   │        │
│                   │ Driver late │        │ Apply fee  │        │
│                   └─────────────┘        └─────────────┘        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### No-Show Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                       NO-SHOW FLOW                                │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Driver arrives at pickup                                         │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────────────────────────────────────┐                 │
│  │ Mark: driverArrivedAt = now                 │                 │
│  │ Start waiting timer (noShowWaitTimeMs)      │                 │
│  └──────────────────┬──────────────────────────┘                 │
│                     │                                             │
│                     ▼                                             │
│  ┌─────────────────────────────────────────────┐                 │
│  │ Wait for customer (5 minutes default)       │                 │
│  │ • Try calling/messaging customer            │                 │
│  │ • Customer can still show up                │                 │
│  └──────────────────┬──────────────────────────┘                 │
│                     │                                             │
│         ┌───────────┴───────────┐                                │
│         │                       │                                │
│         ▼                       ▼                                │
│  ┌─────────────┐         ┌─────────────────────────┐            │
│  │ CUSTOMER    │         │ CUSTOMER NO-SHOW       │            │
│  │ SHOWS UP    │         │ • isNoShow = true      │            │
│  │ (Normal)    │         │ • noShowFee = fee      │            │
│  └─────────────┘         │ • status = cancelled   │            │
│                          │ • Driver earns fee %   │            │
│                          └─────────────────────────┘            │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### usePassengerConfig() Hook

```typescript
import { usePassengerConfig } from '@/lib/contexts/ConfigContext';

function MyComponent() {
    const { passengerConfig, loading } = usePassengerConfig();

    if (loading) return <Loading />;

    // Access config values
    const freeWindowMinutes = passengerConfig.freeCancellationWindowMs / 60000;
    const canCancelFree = isWithinFreeWindow(booking.driverAssignedAt, freeWindowMinutes);
}
```

### Default Values (Grab-inspired)

| Config | Default | Description |
|--------|---------|-------------|
| freeCancellationWindowMs | 180000 (3 min) | ยกเลิกฟรีหลังได้คนขับ |
| lateCancellationFee | ฿50 | ค่าธรรมเนียมยกเลิกหลังหมดเวลา |
| noShowWaitTimeMs | 300000 (5 min) | รอลูกค้าก่อนแจ้ง no-show |
| noShowFee | ฿50 | ค่าธรรมเนียม no-show |
| cancellationFeeToDriverPercent | 100% | % ที่คนขับได้รับ |
| driverLateThresholdMs | 300000 (5 min) | คนขับมาช้าเกินนี้ = ยกเลิกฟรี |
| maxActiveBookings | 1 | จอง active ได้สูงสุด |
| maxCancellationsPerDay | 3 | ยกเลิกได้สูงสุดต่อวัน |
| disputeWindowHours | 48 | ชม. ที่ขอ dispute ได้ |

### Implementation Phases

- [x] **Phase 1**: Types & Config (PassengerConfig, Booking fields, ConfigService)
- [x] **Phase 2**: Admin UI (System Settings → Passenger tab)
- [x] **Phase 3**: Backend Logic (Cancel/No-Show/Dispute APIs) - `/api/booking/cancel`, `/api/booking/noshow`, `/api/booking/dispute`
- [ ] **Phase 4**: Frontend Integration (Cancel button, No-show flow, Dispute modal)

---

## ⭐ Rating System (v7.4)

> **Status:** Complete | **API:** `/api/booking/rate`

### Overview

ระบบให้คะแนนแบบสองทาง (Two-way Rating) เหมือน Grab/Uber:
- ลูกค้าให้คะแนนคนขับ + ทิป
- คนขับให้คะแนนลูกค้า

### API Endpoint

```typescript
POST /api/booking/rate
Authorization: Bearer <token>

// Request Body
{
    bookingId: string,
    ratingType: 'customerToDriver' | 'driverToCustomer',
    stars: number,        // 1-5 (integer)
    reasons?: string[],   // Required if stars <= 3
    comment?: string,     // Max 500 chars, sanitized
    tip?: number          // 0-10000 (customerToDriver only)
}

// Response
{ success: true, message: 'บันทึกคะแนนเรียบร้อยแล้ว', data: {...} }
{ success: false, error: 'Error message' }
```

### Valid Reason Codes

| Code | ใช้โดย | Description |
|------|--------|-------------|
| `late` | Customer | คนขับมาสาย |
| `dirty_car` | Customer | รถไม่สะอาด |
| `bad_driving` | Customer | ขับรถไม่ดี |
| `rude` | Customer | ไม่สุภาพ |
| `wrong_route` | Customer | ไปผิดทาง |
| `no_show` | Driver | ลูกค้าไม่มา |
| `messy` | Driver | ทิ้งขยะ/ทำเลอะ |
| `other` | Both | อื่นๆ |

### Security Measures

| Security | Description |
|----------|-------------|
| **Authentication** | ต้องมี Bearer token |
| **Authorization** | Customer ให้คะแนนได้เฉพาะ booking ตัวเอง, Driver ให้คะแนนได้เฉพาะ booking ที่รับ |
| **Rate Limiting** | 10 requests/minute per user |
| **Tip Limit** | Max ฿10,000 |
| **XSS Protection** | ลบ HTML tags จาก comment |
| **Reason Validation** | ต้องอยู่ใน whitelist |
| **Duplicate Prevention** | ให้คะแนนได้ครั้งเดียวต่อ booking |
| **Status Check** | ให้คะแนนได้เฉพาะ booking ที่ completed |

### Bayesian Average Rating Formula

ใช้ Bayesian Average แทน Simple Average เพื่อความยุติธรรม:

```typescript
// Constants
const BAYESIAN_PRIOR_MEAN = 4.0;  // C: ค่าเริ่มต้นระบบ
const BAYESIAN_MIN_REVIEWS = 5;   // m: จำนวน review ขั้นต่ำที่เชื่อถือได้

// Formula
function calculateBayesianRating(currentRating, ratingCount, newStars) {
    const totalSum = (currentRating * ratingCount) + newStars;
    const totalCount = ratingCount + 1;
    const bayesianRating = ((C * m) + totalSum) / (m + totalCount);
    return Math.round(bayesianRating * 10) / 10;  // Round to 1 decimal
}

// ตัวอย่าง:
// - คนขับใหม่ได้ 5 ดาว → 4.2 (ไม่ใช่ 5.0)
// - คนขับมี 4.5 (10 reviews) + 5 ดาวใหม่ → 4.4
```

### Database Updates

เมื่อให้คะแนนสำเร็จ API จะอัปเดต:

```
Customer → Driver:
├── booking.ratings.customerToDriver = { stars, comment, tip, ratedAt }
├── driver.rating = calculateBayesianRating(...)  // Bayesian Average
├── driver.ratingCount++
├── driver.totalTips += tip
└── driver.totalEarnings += tip

Driver → Customer:
├── booking.ratings.driverToCustomer = { stars, reasons, comment, ratedAt }
├── user.rating = calculateBayesianRating(...)  // Bayesian Average
└── user.ratingCount++
```

### Test Script

```bash
# ทดสอบ Rating Flow
node scripts/test-rating-flow.js

# ทดสอบและลบ test data
node scripts/test-rating-flow.js --cleanup
```

### Frontend Implementation

| Page | Rating Type | Features |
|------|-------------|----------|
| `/test-maps1` | customerToDriver | ดาว + ทิป (฿0/20/50/100/custom) + comment |
| `/demo-driver` | driverToCustomer | ดาว + เหตุผล + comment |

---

## 🗺️ Live Mode - Complete Technical Documentation

> **Version:** 8.0 | **Status:** Production Ready | **Last Updated:** 2025-12-31

### 📋 Overview & Architecture

Live Mode คือระบบจองรถแบบ Real-time ที่เชื่อมต่อกับ Backend จริงทั้งหมด ประกอบด้วย 2 ส่วนหลัก:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LIVE MODE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐          ┌──────────────────┐                     │
│  │   Customer App   │          │    Driver App    │                     │
│  │  /test-maps1     │          │   /demo-driver   │                     │
│  └────────┬─────────┘          └────────┬─────────┘                     │
│           │                             │                                │
│           │ useDriverTracking()         │ useDriverLocationUpdates()    │
│           │ onSnapshot(bookings)        │ onSnapshot(bookings)          │
│           ▼                             ▼                                │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │                    FIREBASE FIRESTORE                         │       │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │       │
│  │  │bookings │  │ drivers │  │vehicles │  │admin_notifications│ │       │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘  │       │
│  └──────────────────────────────────────────────────────────────┘       │
│           ▲                             ▲                                │
│           │                             │                                │
│  ┌────────┴─────────┐          ┌────────┴─────────┐                     │
│  │  API Endpoints   │          │  API Endpoints   │                     │
│  │ /api/booking/*   │          │ /api/driver/*    │                     │
│  └──────────────────┘          └──────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 🔄 Complete Booking Flow (8 Steps)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LIVE BOOKING FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STEP 1: ลูกค้าสร้าง Booking                                             │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Frontend: createLiveBooking()                                 │       │
│  │ → BookingService.addBooking(data, price, userId)              │       │
│  │ → Status: PENDING                                             │       │
│  │ → Creates notification for admin                              │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                              ↓                                           │
│  STEP 2: (Optional) Admin ยืนยัน                                        │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Admin Dashboard: Update status                                │       │
│  │ → Status: PENDING → CONFIRMED                                 │       │
│  │ → Customer receives notification                              │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                              ↓                                           │
│  STEP 3: มอบหมายคนขับ                                                   │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Frontend: findAndAssignDriver() OR Admin Dashboard            │       │
│  │ → BookingService.assignDriver(bookingId, driverInfo)          │       │
│  │ → Status: CONFIRMED → DRIVER_ASSIGNED                         │       │
│  │ → Driver status: available → busy                             │       │
│  │ → Driver sees job notification modal (15s countdown)          │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                              ↓                                           │
│  STEP 4: คนขับกดรับงาน                                                  │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Driver App: Accept job                                        │       │
│  │ → POST /api/driver/bookings { action: 'updateStatus' }        │       │
│  │ → Status: DRIVER_ASSIGNED → DRIVER_EN_ROUTE                   │       │
│  │ → GPS tracking starts (useDriverLocationUpdates)              │       │
│  │ → Customer sees driver on map                                 │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                              ↓                                           │
│  STEP 5: คนขับถึงจุดรับ → เริ่มเดินทาง                                   │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Driver App: Start trip                                        │       │
│  │ → POST /api/driver/bookings { action: 'updateStatus' }        │       │
│  │ → Status: DRIVER_EN_ROUTE → IN_PROGRESS                       │       │
│  │ → Customer notification: "เริ่มเดินทางแล้ว"                    │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                              ↓                                           │
│  STEP 6: ถึงปลายทาง                                                     │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Driver App: Complete trip                                     │       │
│  │ → POST /api/driver/bookings { action: 'updateStatus' }        │       │
│  │ → Status: IN_PROGRESS → COMPLETED                             │       │
│  │ → Driver status: busy → available                             │       │
│  │ → Driver earnings updated: +totalCost                         │       │
│  │ → Driver totalTrips++                                         │       │
│  │ → Customer notification: "ถึงปลายทางแล้ว"                      │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                              ↓                                           │
│  STEP 7: ลูกค้าให้คะแนน + ทิป                                           │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Customer App: Rating Modal                                    │       │
│  │ → POST /api/booking/rate { stars, tip, comment }              │       │
│  │ → booking.ratings.customerToDriver updated                    │       │
│  │ → driver.rating recalculated (Bayesian Average)               │       │
│  │ → driver.totalTips += tip                                     │       │
│  │ → driver.totalEarnings += tip                                 │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                              ↓                                           │
│  STEP 8: (Optional) คนขับให้คะแนนลูกค้า                                 │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Driver App: Rating Modal                                      │       │
│  │ → POST /api/booking/rate { ratingType: 'driverToCustomer' }   │       │
│  │ → booking.ratings.driverToCustomer updated                    │       │
│  │ → user.rating recalculated (Bayesian Average)                 │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 📊 Status Flow & Conditions

```
┌───────────────────────────────────────────────────────────────────┐
│                    BOOKING STATUS TRANSITIONS                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐                                                  │
│  │   pending   │ ← Initial status (Cash/QR payment)              │
│  └──────┬──────┘                                                  │
│         │ Admin confirms                                          │
│         ▼                                                         │
│  ┌─────────────┐      ┌───────────────────────────────────────┐  │
│  │  confirmed  │──────│ CANCEL CONDITIONS:                     │  │
│  └──────┬──────┘      │ • ลูกค้า: ยกเลิกได้ถ้า status เป็น     │  │
│         │              │   pending, confirmed, driver_assigned  │  │
│         │ Assign driver│ • คนขับปฏิเสธ: กลับเป็น confirmed     │  │
│         ▼              │ • Admin: ยกเลิกได้ทุกสถานะ             │  │
│  ┌─────────────────┐  └───────────────────────────────────────┘  │
│  │ driver_assigned │                                              │
│  └──────┬──────────┘                                              │
│         │                                                         │
│         │ Driver accepts (updateStatus)                           │
│         │ ❌ Driver rejects → back to confirmed                  │
│         ▼                                                         │
│  ┌─────────────────┐  ┌───────────────────────────────────────┐  │
│  │ driver_en_route │  │ GPS TRACKING ACTIVE                    │  │
│  └──────┬──────────┘  │ • useDriverLocationUpdates sends       │  │
│         │              │   location every 5 seconds             │  │
│         │ Driver starts trip│ • Customer tracks via             │  │
│         ▼              │   useDriverTracking                     │  │
│  ┌─────────────────┐  └───────────────────────────────────────┘  │
│  │   in_progress   │                                              │
│  └──────┬──────────┘                                              │
│         │ Driver completes                                        │
│         ▼                                                         │
│  ┌─────────────────┐  ┌───────────────────────────────────────┐  │
│  │    completed    │  │ ON COMPLETION:                         │  │
│  └─────────────────┘  │ • driver.status → available            │  │
│                       │ • driver.totalTrips++                   │  │
│                       │ • driver.totalEarnings += booking.cost  │  │
│                       │ • Rating modals shown                   │  │
│                       └───────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### 🔒 Validation Rules (Backend)

```typescript
// ===== BookingService.assignDriver() =====

// RULE 1: คนขับต้องไม่มีงานอยู่
const activeBookingsQuery = query(
    collection(db, 'bookings'),
    where('driver.driverId', '==', driverId),
    where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
);
if (!activeBookingsSnap.empty) {
    throw new Error('คนขับกำลังมีงานอยู่ ไม่สามารถรับงานซ้อนได้');
}

// RULE 2: คนขับไม่สามารถรับงานตัวเอง
if (driverData?.userId === booking.userId) {
    throw new Error('คนขับไม่สามารถรับงานของตัวเองได้');
}

// ===== /api/driver/bookings POST (updateStatus) =====

// RULE 3: Status transitions ต้องถูกต้อง
const validTransitions: Record<string, string[]> = {
    'driver_assigned': ['driver_en_route'],  // รับงาน
    'driver_en_route': ['in_progress'],       // ถึงจุดรับ
    'in_progress': ['completed']              // ถึงปลายทาง
};
if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new Error(`Cannot change status from ${currentStatus} to ${newStatus}`);
}

// RULE 4: คนขับปฏิเสธได้เฉพาะ driver_assigned
if (action === 'rejectJob' && currentStatus !== 'driver_assigned') {
    throw new Error('สามารถปฏิเสธงานได้เฉพาะงานที่ยังไม่ได้เริ่ม');
}

// ===== /api/driver/status POST =====

// RULE 5: คนขับมีงานอยู่ไม่สามารถ offline
if (status === 'offline') {
    const activeBookingsSnap = await adminDb.collection('bookings')
        .where('driver.driverId', '==', driverId)
        .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
        .get();
    if (!activeBookingsSnap.empty) {
        throw new Error('คุณมีงานอยู่ ต้องเสร็จงานก่อนถึงจะปิดสถานะได้');
    }
}

// ===== Cancel Booking (Frontend) =====

// RULE 6: ลูกค้ายกเลิกได้เฉพาะสถานะที่กำหนด
const cancellableStatuses = ['pending', 'confirmed', 'driver_assigned'];
if (!cancellableStatuses.includes(activeBooking.status)) {
    // Cannot cancel - driver already on the way
}
```

### 🔌 Real-time Subscriptions

```typescript
// ===== 1. Booking Status Subscription (Customer) =====
// Location: app/test-maps1/page.tsx (lines 441-498)

useEffect(() => {
    if (mode !== 'live' || !bookingId || !db) return;

    const unsubscribe = onSnapshot(
        doc(db, 'bookings', bookingId),
        (docSnap) => {
            const bookingData = docSnap.data();

            // Map booking status to UI status
            const statusMap = {
                'pending': 'searching',
                'confirmed': 'searching',
                'driver_assigned': 'driver_assigned',
                'driver_en_route': 'driver_en_route',
                'in_progress': 'in_progress',
                'completed': 'completed',
            };
            setStatus(statusMap[bookingData.status]);

            // Update driver info when assigned
            if (bookingData.driver && !assignedDriver) {
                DriverService.getDriverById(bookingData.driver.driverId)
                    .then(setAssignedDriver);
            }
        }
    );

    return () => unsubscribe();
}, [mode, bookingId]);

// ===== 2. Driver Location Subscription (Customer) =====
// Location: lib/hooks/useDriverTracking.ts

const { location: liveDriverLocation } = useDriverTracking(
    mode === 'live' && assignedDriver?.id ? assignedDriver.id : null,
    { autoStart: true }
);

// Hook internals:
const unsubscribe = onSnapshot(
    doc(db, 'drivers', driverId),
    (docSnap) => {
        const currentLocation = docSnap.data().currentLocation;
        setState({
            location: {
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                heading: currentLocation.heading,
                speed: currentLocation.speed,
            }
        });
    }
);

// ===== 3. Available Drivers Subscription =====
// Location: app/test-maps1/page.tsx (lines 500-519)

useEffect(() => {
    if (mode !== 'live') return;

    const unsubscribe = DriverService.subscribeToDrivers((drivers) => {
        const available = drivers.filter(d => d.status === 'available');
        setAvailableDrivers(available);
    });

    return () => unsubscribe();
}, [mode]);

// ===== 4. Driver Bookings Subscription (Driver App) =====
// Location: app/demo-driver/page.tsx

useEffect(() => {
    if (!driverId || !db) return;

    const q = query(
        collection(db, 'bookings'),
        where('driver.driverId', '==', driverId),
        where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const bookings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setActiveBookings(bookings);

        // Show job modal if new driver_assigned
        if (bookings.some(b => b.status === 'driver_assigned')) {
            setShowJobModal(true);
        }
    });

    return () => unsubscribe();
}, [driverId]);
```

### 📱 Frontend Components (test-maps1)

```typescript
// ===== Key State Variables =====

// Mode & Status
const [mode, setMode] = useState<'demo' | 'live'>('demo');
const [status, setStatus] = useState<
    'selecting' | 'searching' | 'driver_assigned' |
    'driver_en_route' | 'in_progress' | 'completed'
>('selecting');

// Live Mode Data
const [vehicles, setVehicles] = useState<Vehicle[]>([]);
const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);
const [bookingId, setBookingId] = useState<string | null>(null);
const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
const [routePrice, setRoutePrice] = useState<number | null>(null);

// Loading States
const [isCreatingBooking, setIsCreatingBooking] = useState(false);
const [isLoadingActiveBooking, setIsLoadingActiveBooking] = useState(false);
const [isCancellingBooking, setIsCancellingBooking] = useState(false);

// ===== Key Functions =====

// 1. Check for existing active booking on Live Mode enter
const checkActiveBooking = async () => {
    const bookings = await BookingService.getUserBookings(user.uid);
    const activeStatuses = ['pending', 'confirmed', 'driver_assigned',
                           'driver_en_route', 'in_progress'];
    const active = bookings.find(b => activeStatuses.includes(b.status));
    if (active) {
        setActiveBooking(active);
        // Restore pickup/dropoff coordinates from booking
        if (active.pickupCoordinates) {
            setPickup({ ...active.pickupCoordinates, name: active.pickupLocation });
        }
    }
};

// 2. Create booking
const createLiveBooking = async (): Promise<string | null> => {
    const bookingData = {
        pickupLocation: pickup.name,
        dropoffLocation: dropoff.name,
        pickupCoordinates: { lat: pickup.lat, lng: pickup.lng },
        dropoffCoordinates: { lat: dropoff.lat, lng: dropoff.lng },
        vehicle: selectedVehicle,
        // ... other data
    };
    const newBookingId = await BookingService.addBooking(
        bookingData, tripInfo.price, user.uid
    );
    setBookingId(newBookingId);
    return newBookingId;
};

// 3. Find and assign driver
const findAndAssignDriver = async (bookingId: string): Promise<boolean> => {
    // Filter out self (can't accept own booking)
    const eligibleDrivers = availableDrivers.filter(
        d => d.userId !== user?.uid
    );
    if (eligibleDrivers.length === 0) return false;

    const driver = eligibleDrivers[Math.floor(Math.random() * eligibleDrivers.length)];
    await BookingService.assignDriver(bookingId, {
        driverId: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehiclePlate: driver.vehiclePlate,
        vehicleModel: driver.vehicleModel,
    });
    await DriverService.updateDriverStatus(driver.id, 'busy');
    setAssignedDriver(driver);
    return true;
};

// 4. Cancel booking
const confirmCancelBooking = async () => {
    await BookingService.updateBookingStatus(activeBooking.id, 'cancelled');
    if (activeBooking.driver?.driverId) {
        await DriverService.updateDriverStatus(activeBooking.driver.driverId, 'available');
    }
    resetTrip();
};
```

### 🌐 API Endpoints

```typescript
// ===== POST /api/driver/location =====
// Driver sends GPS location

Request:
{
    driverId: string,
    lat: number,
    lng: number,
    heading?: number,  // 0-360
    speed?: number     // km/h
}

Response:
{ success: true, data: { driverId, location } }

Action:
→ Update drivers/{driverId}/currentLocation in Firestore

// ===== GET /api/driver/location =====
// Customer fetches driver location (fallback if onSnapshot fails)

Request: ?driverId=xxx

Response:
{
    success: true,
    data: {
        currentLocation: { lat, lng, heading, speed, timestamp },
        status: 'busy',
        name: 'Driver Name',
        vehiclePlate: 'กข 1234'
    }
}

// ===== POST /api/driver/bookings =====
// Driver updates booking status

Request:
{
    action: 'updateStatus' | 'rejectJob',
    bookingId: string,
    driverId: string,
    data?: { status: string, note?: string }
}

Response:
{ success: true, message: 'Status updated' }

Actions per status:
• driver_en_route: Create notification "คนขับกำลังเดินทางมา"
• in_progress: Create notification "เริ่มเดินทางแล้ว"
• completed:
  - driver.status → available
  - driver.totalTrips++
  - driver.totalEarnings += booking.totalCost
  - Create notification "ถึงปลายทางแล้ว"

// ===== POST /api/booking/rate =====
// Customer/Driver rates the other party

Request:
{
    bookingId: string,
    ratingType: 'customerToDriver' | 'driverToCustomer',
    stars: number,          // 1-5
    reasons?: string[],     // Required if stars <= 3
    comment?: string,       // Max 500 chars
    tip?: number            // 0-10000 (customerToDriver only)
}

Response:
{ success: true, message: 'บันทึกคะแนนเรียบร้อย' }

Security:
• Rate limiting: 10 requests/minute per user
• Comment sanitization: HTML tags removed
• Reason codes whitelist validated
• Bayesian Average rating calculation
```

### 🪝 Hooks Reference

```typescript
// ===== useDriverTracking(driverId, options) =====
// For customer to track driver location in real-time

import { useDriverTracking } from '@/lib/hooks';

const {
    location,      // { lat, lng, heading, speed, timestamp }
    isLoading,     // boolean
    error,         // string | null
    lastUpdate,    // Date
    startTracking, // () => void
    stopTracking,  // () => void
} = useDriverTracking(driverId, { autoStart: true });

// Internally uses Firestore onSnapshot on drivers/{driverId}

// ===== useBookingDriverTracking(bookingId) =====
// Combines booking subscription + driver tracking

const {
    location,
    driverId,
    bookingStatus,
    shouldTrack,  // true when driver_assigned/en_route/in_progress
} = useBookingDriverTracking(bookingId);

// ===== useDriverLocationUpdates(driverId, isOnline, getAuthHeaders) =====
// For driver app to send GPS location to server

const {
    latitude,
    longitude,
    heading,
    speed,
    isUpdating,
    lastError,
    startWatching,
    stopWatching,
} = useDriverLocationUpdates(driverId, isOnline, getAuthHeaders);

// Internally:
// - Uses navigator.geolocation.watchPosition
// - Sends POST to /api/driver/location every 5 seconds
// - Only active when isOnline && driverId is set
```

### 📁 Files Reference

| File | Lines | Description |
|------|-------|-------------|
| `app/test-maps1/page.tsx` | ~1800 | Customer app - Live Mode UI |
| `app/demo-driver/page.tsx` | ~1200 | Driver app - GPS tracking + job handling |
| `lib/hooks/useDriverTracking.ts` | ~295 | Real-time driver location hook |
| `lib/hooks/useGeolocation.ts` | ~275 | GPS tracking + location updates hook |
| `lib/firebase/services/BookingService.ts` | ~400 | Booking CRUD + assign driver |
| `lib/firebase/services/DriverService.ts` | ~250 | Driver CRUD + status management |
| `app/api/driver/location/route.ts` | ~189 | Driver GPS update API |
| `app/api/driver/bookings/route.ts` | ~280 | Driver booking status API |
| `app/api/booking/rate/route.ts` | ~350 | Rating API with Bayesian formula |

### ✅ Completed Features

- [x] สร้าง Booking จริง (BookingService.addBooking)
- [x] Real-time Booking Subscription (onSnapshot)
- [x] มอบหมายคนขับจริง (BookingService.assignDriver)
- [x] Real-time Driver Location Tracking (useDriverTracking)
- [x] Driver GPS Updates (useDriverLocationUpdates)
- [x] Status transitions ทั้ง flow
- [x] Rating system (Bayesian Average)
- [x] Cancel booking (pending/confirmed/driver_assigned)
- [x] Coordinates restore on page reload
- [x] Prevent double booking (active booking check)

### 🎨 Design System (Grab Style)

| Element | Style |
|---------|-------|
| Primary Color | `#00b14f` (Grab Green) |
| Pickup Dot | `bg-[#00b14f]` green circle |
| Dropoff Dot | `bg-orange-500` orange square |
| CTA Button | `h-14 bg-[#00b14f] rounded-2xl font-bold` |
| Status Badge | `px-4 py-1.5 rounded-full text-sm font-semibold` |
| Bottom Sheet | `rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]` |
| Driver Card | `bg-white rounded-2xl p-4 shadow-md border border-gray-100` |

---

## 🧪 Testing Scripts (สำคัญมาก!)

> **Rule:** ทุกครั้งที่แก้ไข feature สำคัญ ต้องเขียน Auto Test Script และรันทดสอบก่อนส่งงาน

### Available Test Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `test-live-flow.js` | ⭐ **ทดสอบ Full Booking Flow แบบ Real-time** - ดูทั้ง 2 หน้าพร้อมกัน | `node scripts/test-live-flow.js` |
| `test-rematch-flow.js` | 🔄 **ทดสอบ Auto Re-match** - จำลองคนขับปฏิเสธ 2 ครั้ง | `node scripts/test-rematch-flow.js` |
| `test-booking-flow.js` | ทดสอบ Booking Flow + Options (stop-at-assign, cleanup) | `node scripts/test-booking-flow.js --stop-at-assign` |
| `test-rating-flow.js` | ทดสอบ Rating System (Bayesian Average) | `node scripts/test-rating-flow.js --cleanup` |
| `test-realtime-rating-auto.js` | ทดสอบ Real-time Rating Update | `node scripts/test-realtime-rating-auto.js` |
| `test-passenger-config.js` | 🎫 ทดสอบ PassengerConfig types + defaults | `node scripts/test-passenger-config.js` |
| `test-passenger-apis.js` | 🎫 ทดสอบ Cancel/NoShow/Dispute APIs (7 tests) | `node scripts/test-passenger-apis.js` |
| `test-security-headers.js` | 🔒 ทดสอบ Security Headers (86% score) | `TEST_URL=https://... node scripts/test-security-headers.js` |
| `test-safe-error.js` | 🔒 ทดสอบ Safe Error Handling (18 tests) | `node scripts/test-safe-error.js` |
| `test-rate-limit.js` | 🔒 ทดสอบ Rate Limiting (13 tests) | `node scripts/test-rate-limit.js` |
| `check-logs.js` | ตรวจสอบ bugs (Vercel, Firebase, Code) | `node scripts/check-logs.js` |
| `monitor-logs.js` | Monitor logs แบบ real-time | `node scripts/monitor-logs.js` |

### ⭐ test-live-flow.js (แนะนำ!)

**Script หลักสำหรับทดสอบ Full Booking Flow แบบ Real-time**

```bash
node scripts/test-live-flow.js
```

**ก่อนรัน เปิด 2 หน้านี้:**
1. http://localhost:3000/test-maps1 → เปิด **Live Mode**
2. http://localhost:3000/demo-driver → **Login** ด้วย imacroshosting@gmail.com

**Flow ที่ทดสอบ (8 ขั้นตอน):**
```
Step 1: 📝 สร้าง Booking (pending)
Step 2: ✅ Admin ยืนยัน (confirmed)
Step 3: 🚗 Admin มอบหมายคนขับ (driver_assigned) → Modal ขึ้นบน demo-driver
Step 4: 🚙 คนขับรับงาน (driver_en_route) → Modal ปิด
Step 5: 🛣️ เริ่มเดินทาง (in_progress)
Step 6: 🏁 เสร็จสิ้น (completed)
Step 7: ⭐ ลูกค้าให้คะแนน + ทิป
Step 8: 🔄 Rollback ข้อมูลทดสอบ
```

**Features:**
- สุ่มสถานที่จุดรับ-ส่งอัตโนมัติ
- มี delay 6 วินาทีระหว่างแต่ละ step เพื่อดู UI อัปเดต
- Rollback อัตโนมัติหลังทดสอบเสร็จ
- แสดงคำแนะนำว่าควรดูอะไรบนแต่ละหน้า

### test-booking-flow.js Options

```bash
# ทดสอบเร็ว + rollback อัตโนมัติ
node scripts/test-booking-flow.js

# หยุดที่ driver_assigned (ดู Modal)
node scripts/test-booking-flow.js --stop-at-assign

# ไม่ rollback (เก็บข้อมูลไว้ดู)
node scripts/test-booking-flow.js --no-rollback

# รอ 20 วินาทีให้กดรับงานบน UI
node scripts/test-booking-flow.js --wait-accept

# ลบ booking ที่ค้างอยู่
node scripts/test-booking-flow.js --cleanup <bookingId>
```

### เมื่อไหร่ต้องเขียน Test Script?

```markdown
✅ ต้องเขียน:
- เพิ่ม/แก้ไข API endpoint
- เพิ่ม/แก้ไข real-time subscription (onSnapshot)
- เพิ่ม/แก้ไข database operations
- เพิ่ม/แก้ไข authentication/authorization logic

❌ ไม่จำเป็น:
- แก้ไข UI styling
- แก้ไข text/translations
- เพิ่ม comments
```

### Test Script Template

```javascript
#!/usr/bin/env node
/**
 * Test [Feature Name] Script
 * Usage: node scripts/test-[feature].js
 */

const admin = require('firebase-admin');
const path = require('path');

// Colors
const c = {
    reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
    yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
};

// Init Firebase
function initFirebase() {
    if (admin.apps.length > 0) return admin.firestore();
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
    return admin.firestore();
}

async function main() {
    console.log(`\n${c.cyan}🧪 Test [Feature Name]${c.reset}\n`);
    const db = initFirebase();

    // 1. Get current state
    // 2. Make changes
    // 3. Verify changes
    // 4. Rollback (optional)

    console.log(`${c.green}✅ Test passed!${c.reset}\n`);
}

main().catch(err => {
    console.error(`${c.red}❌ Error:${c.reset}`, err.message);
    process.exit(1);
});
```

### Test Script Best Practices

```markdown
1. **Auto Mode** - ไม่ต้องรอ input จาก user (ใช้ echo pipe ไม่ได้)
2. **Rollback** - คืนค่าเดิมหลังทดสอบเสมอ
3. **Clear Output** - แสดงผลชัดเจน (ใช้ colors, emoji)
4. **Quick** - รันเสร็จใน 30 วินาที
5. **Standalone** - รันได้โดยไม่ต้อง setup อะไรเพิ่ม
```

---

## 📱 Android App (Capacitor)

> **Status:** Working ✅ | **Last Updated:** 2026-01-03

### Overview

Android app ใช้ **Capacitor** ในโหมด **WebView URL** โหลดเว็บจาก Production:
- URL: `https://car-rental-phi-lime.vercel.app`
- Package: `com.tuktik.app`
- Push Notifications: Firebase Cloud Messaging (FCM)

### Quick Commands

```bash
# Build Android APK
cd android && ./gradlew assembleDebug

# APK Location
android/app/build/outputs/apk/debug/app-debug.apk

# Send Test Push Notification
node scripts/send-push-test.js "<FCM_TOKEN>" "หัวข้อ" "ข้อความ"
```

### Key Files

| File | Description |
|------|-------------|
| `capacitor.config.ts` | Capacitor configuration (WebView URL mode) |
| `android/app/google-services.json` | Firebase config for Android |
| `android/gradle.properties` | Gradle settings (Thai calendar fix) |
| `service-account.json` | Firebase Admin credentials (ห้าม commit!) |
| `components/capacitor/CapacitorInit.tsx` | Push notification initialization |
| `lib/capacitor/pushNotifications.ts` | Push notification utilities |
| `scripts/send-push-test.js` | Script ส่ง push notification |

### Thai Buddhist Calendar Fix (สำคัญ!)

**ปัญหา:** Gradle ใช้ปฏิทินพุทธศักราช (พ.ศ. 2568) แทน ค.ศ. 2025 ทำให้ build ไม่ผ่าน

**Error:**
```
com.google.common.base.VerifyException at MsDosDateTimeUtils.packDate
```

**วิธีแก้:** เพิ่มใน `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx1536m -Duser.language=en -Duser.country=US
```

### Push Notification Flow

```
1. App เปิด → CapacitorInit.tsx ทำงาน
2. ขอ permission → User กด Allow
3. ลงทะเบียนกับ FCM → ได้ FCM Token
4. บันทึก Token ลง Firestore (users/{userId}/fcmToken)
5. Server ส่ง notification ผ่าน Firebase Admin SDK
6. App รับและแสดง notification
```

### Send Push Notification (Script)

```bash
# ติดตั้ง service-account.json ก่อน (ดาวน์โหลดจาก Firebase Console)
# Firebase Console → Project Settings → Service accounts → Generate new private key

# ส่ง notification
node scripts/send-push-test.js "FCM_TOKEN" "🚗 มีงานใหม่!" "สุวรรณภูมิ → พัทยา"
```

### Troubleshooting

| ปัญหา | วิธีแก้ |
|-------|--------|
| Build failed (Thai calendar) | เพิ่ม `-Duser.language=en -Duser.country=US` ใน gradle.properties |
| FCM Token ไม่ขึ้น | ตรวจสอบว่า deploy code ใหม่ไป Vercel แล้ว + Force stop app |
| Push ไม่เด้ง | ตรวจสอบ FCM Token ถูกต้อง + service-account.json ใหม่ |
| invalid_grant error | System time ไม่ตรง → sync เวลากับ NTP |

### Dependencies

```json
{
  "@capacitor/core": "^8.0.0",
  "@capacitor/push-notifications": "^8.0.0",
  "@capacitor/android": "^8.0.0",
  "@capacitor/cli": "^8.0.0"
}
```

---

## Changelog

### 2026-01-03 v8.8 - Android App + Push Notifications 📱🔔
- **Android App (Capacitor)**
  - Build APK สำเร็จ (WebView URL mode)
  - แก้ไขปัญหา Thai Buddhist Calendar (พ.ศ. 2568 → ค.ศ.)
  - เพิ่ม `-Duser.language=en -Duser.country=US` ใน gradle.properties
- **Push Notifications**
  - เพิ่ม `CapacitorInit.tsx` สำหรับ initialize push notifications
  - FCM Token ลงทะเบียนอัตโนมัติเมื่อเปิดแอป
  - บันทึก Token ลง Firestore
  - สร้าง `scripts/send-push-test.js` สำหรับส่ง notification
- **Files created:**
  - `components/capacitor/CapacitorInit.tsx`
  - `lib/capacitor/pushNotifications.ts`
  - `scripts/send-push-test.js`
  - `android/gradle.properties` (modified)

### 2026-01-03 v8.7 - Production Booking Page 🚀
- **สร้างหน้า `/book` สำหรับ Production**
  - Copy จาก `/test-maps1` แต่เป็น **Live Mode เท่านั้น** (ไม่มี Demo toggle)
  - หน้าจองหลักของแอป (แผนที่ + real-time tracking)
  - Title: "จองรถ" / "Book a Ride"
- **อัปเดต Login/Register Redirect**
  - หลัง login/register → ไป `/book` แทน `/dashboard`
  - ผู้ใช้เจอหน้าจองทันทีหลัง login
- **อัปเดต Navigation**
  - Header: "จองรถ" → `/book` (icon: local_taxi)
  - Footer: "จองรถ" → `/book`
  - Landing Page CTAs → `/book`
  - BookingForm submit → `/book`
- **ซ่อนหน้าเก่า**
  - `/vehicles` - ลบ link ออกจาก nav แต่เก็บไฟล์ไว้
  - `/test-maps1` - เก็บไว้สำหรับทดสอบ (มี Demo/Live toggle)
- **User Flow ใหม่:**
  ```
  Landing Page → กดจอง → Login → /book
  ```
- **Files created/modified:**
  - `app/book/page.tsx` - **NEW** (Live Mode only)
  - `app/login/page.tsx` - redirect → /book
  - `app/register/page.tsx` - redirect → /book
  - `components/layout/Header.tsx` - nav links
  - `components/layout/Footer.tsx` - nav links
  - `app/page.tsx` - CTA links
  - `components/booking/BookingForm.tsx` - submit redirect

### 2026-01-02 v8.6 - CSP Fix + Chat Modal 💬
- **CSP Fix: Firebase Auth / Google Sign-in**
  - **ปัญหา:** Login ไม่ทำงานบน production เพราะ CSP บล็อก `apis.google.com`
  - **สาเหตุ:** `*.googleapis.com` ไม่รวม `apis.google.com` (คนละ domain!)
  - **แก้ไข:** เพิ่ม `https://apis.google.com` ใน script-src directive
  - **ไฟล์:** `next.config.js`
- **Chat Modal (test-maps1)**
  - เพิ่มปุ่มแชทที่เปิด Contact Modal
  - ตัวเลือก: โทรหาคนขับ (tel:), LINE
  - UI แบบ Grab style (สีเขียว #00b14f)
  - รองรับ 2 ภาษา (TH/EN)
- **Documentation:**
  - เพิ่ม "CSP Critical Domains" section ใน CLAUDE.md
  - บันทึกว่า `apis.google.com` จำเป็นสำหรับ Firebase Auth

### 2026-01-02 v8.5 - Security Hardening 🔒
- **Security Headers** (86% score)
  - เพิ่ม headers ใน `next.config.js`:
    - `X-Content-Type-Options: nosniff` - ป้องกัน MIME type sniffing
    - `X-Frame-Options: SAMEORIGIN` - ป้องกัน Clickjacking
    - `X-XSS-Protection: 1; mode=block` - ป้องกัน XSS
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
  - Test script: `scripts/test-security-headers.js`
- **Safe Error Handling** (100% score - 18 tests)
  - สร้าง `lib/utils/safeError.ts` utility
  - ป้องกัน leak ของ: Firebase errors, API keys, Stack traces
  - อนุญาต: Business logic errors, Validation errors
  - อัปเดต API routes: `/api/payment/*`, `/api/driver/*`
  - Test script: `scripts/test-safe-error.js`
- **Rate Limiting** (100% score - 13 tests)
  - สร้าง `lib/utils/rateLimit.ts` utility
  - Configurations:
    - Standard: 10 req/min
    - Auth: 5 req/min (strict)
    - Payment: 10 req/min
    - Driver Location: 60 req/min (GPS updates)
    - Sensitive: 3 req/min
  - Applied to: `/api/payment/create-intent`, `/api/payment/refund`, `/api/driver/location`
  - Test script: `scripts/test-rate-limit.js`
- **Files created:**
  - `lib/utils/safeError.ts`
  - `lib/utils/rateLimit.ts`
  - `scripts/test-security-headers.js`
  - `scripts/test-safe-error.js`
  - `scripts/test-rate-limit.js`

### 2026-01-02 v8.4 - Payment Modal (Stripe Embedded) 💳
- **เพิ่มระบบชำระเงินภายในหน้า `/test-maps1` (Live Mode)**
  - เมื่อกดปุ่ม "จองรถตอนนี้" → แสดง Payment Modal
  - ตัวเลือกชำระเงิน: บัตรเครดิต/เดบิต (Stripe) และเงินสด
  - ใช้ Stripe Payment Element (embedded form, ไม่ redirect)
- **API Endpoints ใหม่:**
  - `POST /api/payment/create-intent` - สร้าง PaymentIntent
  - `POST /api/payment/refund` - คืนเงินเมื่อยกเลิก booking
- **Payment Flow:**
  1. ลูกค้าเลือก Card → สร้าง booking (status: awaiting_payment)
  2. สร้าง PaymentIntent → แสดง Stripe Payment Element
  3. ลูกค้ากรอกบัตร → ชำระเงิน → booking status เปลี่ยนเป็น pending
  4. ระบบหาคนขับอัตโนมัติ
  5. ถ้ายกเลิก → Refund อัตโนมัติผ่าน Stripe API
- **ถ้าเลือก Cash:** ข้าม payment flow → สร้าง booking (status: pending) ทันที
- **Type Updates:**
  - เพิ่ม `stripePaymentIntentId`, `stripeRefundId`, `paymentCompletedAt`, `refundedAt`, `refundReason` ใน Booking interface
- **Dependencies:**
  - `@stripe/react-stripe-js` (client-side)
  - `@stripe/stripe-js` (client-side)
  - `stripe` (server-side)
- **Environment Variables ต้องเพิ่ม:**
  - `STRIPE_SECRET_KEY` - Server-side secret key
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side publishable key
- **Files created/modified:**
  - `app/api/payment/create-intent/route.ts` - **NEW**
  - `app/api/payment/refund/route.ts` - **NEW**
  - `app/test-maps1/page.tsx` - Payment Modal UI + flow
  - `lib/types/index.ts` - Stripe fields

### 2026-01-02 v8.3 - No Driver Available Modal 🚗❌
- **เปลี่ยน alert() เป็น Bottom Sheet Modal แบบ Grab style**
  - เดิม: ใช้ `alert()` ของ browser ซึ่งดูไม่สวยและไม่เข้ากับ design
  - ใหม่: Custom Modal สไตล์ Grab ขึ้นมาจากด้านล่าง
- **Modal UI Features:**
  - Icon ⚠️ สีเหลืองวงกลม
  - Title: "ไม่มีคนขับว่างในขณะนี้"
  - คำอธิบายว่า booking ยังอยู่
  - Info Box สีเขียวแสดง "สิ่งที่จะเกิดขึ้นต่อไป" 3 ข้อ:
    1. ระบบจะหาคนขับให้อัตโนมัติ
    2. แอดมินจะช่วยหาคนขับให้
    3. คุณจะได้รับแจ้งเตือนทันที
  - ปุ่ม "เข้าใจแล้ว" สีเขียว
- **รองรับ 2 ภาษา:** ไทย/English
- **Files modified:**
  - `app/test-maps1/page.tsx` - เพิ่ม showNoDriverModal state และ Modal UI

### 2026-01-02 v8.2 - Audio Unlock Modal 🔓🔊
- **แก้ปัญหาเสียงแจ้งเตือนไม่ดังบนมือถือ**
  - Mobile browsers บล็อกเสียงจนกว่าผู้ใช้จะแตะหน้าจอ
  - เพิ่ม Modal "เปิดเสียงแจ้งเตือน" แสดงเมื่อเข้าหน้า
  - ผู้ใช้ต้องกดปุ่ม "เปิดเสียง" เพื่อ unlock audio
- **Technical Implementation:**
  - `showAudioUnlockModal` และ `audioUnlocked` states
  - `audioContextRef` เก็บ AudioContext ที่ unlock แล้ว
  - `unlockAudio()` function เล่นเสียง silent + confirmation beep
  - useEffect แสดง modal เมื่อ driver โหลดสำเร็จ
  - Modal UI สไตล์ Grab สีเขียว พร้อมคำอธิบาย
- **UX Flow:**
  1. เปิดหน้า `/demo-driver` และ login
  2. Modal "เปิดเสียงแจ้งเตือน" ขึ้นมา
  3. กดปุ่ม "เปิดเสียง" → ได้ยินเสียง beep ยืนยัน
  4. เมื่อมีงานใหม่ → เสียงดังแจ้งเตือนได้ตามปกติ
- **Files modified:**
  - `app/demo-driver/page.tsx` - เพิ่ม Audio Unlock Modal

### 2026-01-02 v8.1 - Driver Alert Sound 🔊🔔
- **เพิ่มเสียงแจ้งเตือนดังๆ เมื่อมีงานใหม่ในหน้า `/demo-driver`**
  - เสียงแบบ doorbell (ding-dong) ดังชัดเจน
  - Volume 0.7 (ดังกว่าเดิม 2 เท่า)
  - เสียง pattern: C6→G5, C6→G5, E6→B5 (3 chimes)
- **เล่นซ้ำอัตโนมัติทุก 3 วินาที** จนกว่าคนขับจะกดรับหรือปฏิเสธ
- **Vibration** (สำหรับมือถือ) ทุกครั้งที่เล่นเสียง
- **Technical Implementation:**
  - ใช้ Web Audio API สร้างเสียง
  - `soundRepeatIntervalRef` สำหรับ track interval
  - Cleanup interval เมื่อ modal ปิด
- **Files modified:**
  - `app/demo-driver/page.tsx` - เพิ่มเสียงแจ้งเตือนและ repeat

### 2026-01-02 v8.0 - Driver Response Timeout ⏱️🚗
- **ระบบ Timeout เมื่อคนขับไม่ตอบรับงาน**
  - เมื่อ status เปลี่ยนเป็น `driver_assigned` → เริ่มนับถอยหลัง 20 วินาที
  - ถ้าคนขับไม่ตอบรับภายใน 20 วินาที → ระบบ auto-reject และหาคนขับใหม่
  - ถ้าคนขับกดรับงาน (status → `driver_en_route`) → timeout จะถูก clear
- **เมื่อ Timeout เกิดขึ้น ระบบจะ:**
  1. อัปเดต booking status กลับเป็น `confirmed`
  2. เพิ่มคนขับเข้า `rejectedDrivers` array
  3. เปลี่ยน driver status กลับเป็น `available`
  4. บันทึกใน statusHistory ว่า "คนขับไม่ตอบรับในเวลาที่กำหนด"
  5. ระบบ Auto Re-match จะทำงานต่อหาคนขับใหม่
- **ปัญหาที่แก้ไข:**
  - ก่อนหน้านี้ ถ้าคนขับได้รับงานแต่ไม่เปิดแอป ลูกค้าจะรอเฉยๆ ไม่มีการตอบกลับ
  - ตอนนี้ ลูกค้าจะได้คนขับใหม่อัตโนมัติถ้าคนขับเดิมไม่ตอบรับ
- **Technical Implementation:**
  - เพิ่ม `driverResponseTimeoutRef` สำหรับ track timeout
  - เพิ่ม logic ใน booking subscription ตรวจจับ `driver_assigned` status
  - Cleanup timeout ใน `resetTrip()` และ `confirmCancelBooking()`
- **Files modified:**
  - `app/test-maps1/page.tsx` - เพิ่ม Driver Response Timeout logic

### 2026-01-02 v7.9 - Auto Re-match System 🔄🚗
- **ระบบ Auto Re-match เมื่อคนขับปฏิเสธงาน (Grab/Uber Style)**
  - เมื่อคนขับปฏิเสธ → ระบบหาคนขับใหม่อัตโนมัติ
  - ลูกค้าเห็นข้อความ "กำลังหาคนขับใหม่..." พร้อม animation
  - ข้ามคนขับที่ปฏิเสธแล้วไม่ให้จับคู่อีก
- **Configuration:**
  ```typescript
  const REMATCH_CONFIG = {
      MAX_ATTEMPTS: 3,                    // Maximum driver match attempts
      DRIVER_RESPONSE_TIMEOUT: 20000,     // 20 seconds for driver to respond
      TOTAL_SEARCH_TIMEOUT: 180000,       // 3 minutes total search time
      DELAY_BETWEEN_MATCHES: 3000,        // 3 seconds delay before next match
  };
  ```
- **Booking Fields เพิ่มเติม:**
  - `rejectedDrivers: string[]` - Driver IDs ที่ปฏิเสธแล้ว
  - `matchAttempts: number` - จำนวนครั้งที่พยายามจับคู่
  - `searchStartedAt: Timestamp` - เวลาเริ่มค้นหา
  - `lastMatchAttemptAt: Timestamp` - เวลาที่จับคู่ครั้งล่าสุด
- **StatusHistoryEntry Fields เพิ่มเติม:**
  - `updatedBy?: 'admin' | 'driver' | 'system'`
  - `rejectedBy?: string` - Driver ID ที่ปฏิเสธ
- **UI Features:**
  - Spinner สีส้มพร้อมแสดงจำนวน attempt
  - ข้อความแจ้งสถานะ re-match
  - แสดง "พยายามครั้งที่ X/3"
- **Test Script:**
  - `node scripts/test-rematch-flow.js` - ทดสอบ Auto Re-match flow
- **Files modified:**
  - `lib/types/index.ts` - เพิ่ม Booking และ StatusHistoryEntry fields
  - `app/test-maps1/page.tsx` - เพิ่ม Auto Re-match logic และ UI
  - `app/api/driver/bookings/route.ts` - เพิ่ม rejectedDrivers ใน rejectJob

### 2026-01-02 v7.8 - API-based Driver Assignment 🔧🚗
- **แก้ไขปัญหา "ไม่สามารถมอบหมายคนขับได้" ใน Live Mode**
  - **สาเหตุ:** Firestore Security Rules ไม่อนุญาตให้ user ทั่วไป update driver document ของคนอื่น
  - User ที่เป็นทั้งลูกค้าและคนขับ ไม่สามารถ assign driver อื่นได้ผ่าน client SDK
- **วิธีแก้:** สร้าง API endpoint `/api/booking/assign-driver` ที่ใช้ Firebase Admin SDK
  - Bypass Firestore rules โดยใช้ server-side credentials
  - Validates: booking ownership, driver availability, prevents self-assignment
  - Updates both booking status และ driver status atomically
- **API Endpoint ใหม่:**
  ```typescript
  POST /api/booking/assign-driver
  Authorization: Bearer <token>
  Body: { bookingId, driverId, driverName, driverPhone, vehiclePlate, vehicleModel, vehicleColor }
  Response: { success: true, data: { bookingId, driverId, status: 'driver_assigned' } }
  ```
- **Scripts เพิ่มเติม:**
  - `scripts/check-driver-status.js` - ตรวจสอบสถานะระบบ (คนขับ, bookings)
  - `scripts/check-user-driver.js` - ตรวจสอบความสัมพันธ์ user/driver
  - `scripts/fix-stuck-bookings.js` - ยกเลิก booking ที่ค้างและ sync driver status
- **Files created/modified:**
  - `app/api/booking/assign-driver/route.ts` - **NEW** API endpoint
  - `app/test-maps1/page.tsx` - เปลี่ยนจาก client SDK เป็นใช้ API

### 2025-12-31 v7.7 - Cancel Booking in Live Mode ❌📱
- **เพิ่มปุ่มยกเลิกการจองใน `/test-maps1` Live Mode**
  - ยกเลิกได้เฉพาะ status: `pending`, `confirmed`
  - ถ้าคนขับกำลังมาแล้ว (driver_assigned+) → แจ้งว่ายกเลิกไม่ได้
  - มี confirm dialog ก่อนยกเลิก
  - รองรับ 2 ภาษา (TH/EN)
- **Implementation:**
  - State: `isCancellingBooking` สำหรับ loading
  - Function: `cancelLiveBooking()` เรียก `BookingService.updateBookingStatus()`
  - UI: ปุ่มสีแดงใน Active Booking Card
- **Files modified:**
  - `app/test-maps1/page.tsx` - เพิ่ม cancel booking feature

### 2025-12-31 v7.6 - Real-time Driver Stats + Auto Test Scripts 🔄🧪
- **Real-time Driver Stats ใน `/demo-driver`**
  - เพิ่ม `onSnapshot` subscription สำหรับ driver document
  - Rating, ratingCount, totalTrips, totalEarnings อัปเดตแบบ real-time
  - ไม่ต้อง refresh หน้าเพื่อเห็นค่าใหม่
- **Auto Test Scripts**
  - สร้าง `scripts/test-realtime-rating-auto.js` ทดสอบ real-time rating
  - เพิ่ม Testing Scripts section ใน CLAUDE.md
  - เพิ่ม rule: ต้องเขียน Auto Test Script ก่อนส่งงานทุกครั้ง
- **Files modified:**
  - `app/demo-driver/page.tsx` - เพิ่ม onSnapshot subscription
  - `scripts/test-realtime-rating-auto.js` - NEW
  - `CLAUDE.md` - เพิ่ม Testing Scripts section

### 2025-12-31 v7.5 - Bayesian Average Rating ⭐📊
- **เปลี่ยนระบบคำนวณคะแนนจาก Simple Average เป็น Bayesian Average**
  - **สูตร:** `bayesianRating = ((C × m) + totalSum) / (m + totalCount)`
  - **C (Prior Mean):** 4.0 - ค่าเริ่มต้นระบบ
  - **m (Min Reviews):** 5 - จำนวน review ขั้นต่ำที่เชื่อถือได้
- **ประโยชน์:**
  - คนขับใหม่ที่ได้ 5 ดาวจาก 1 review ไม่แสดงเป็น 5.0 ทันที
  - ป้องกันการปั่นคะแนนด้วย review จำนวนน้อย
  - ยุติธรรมกับคนขับที่มี review จำนวนมาก
- **ตัวอย่างการคำนวณ:**
  - คนขับมี rating 4.5 (10 reviews) ได้รับ 5 ดาวใหม่ → 4.4 (ดึงเข้าหา 4.0)
  - User ใหม่ได้รับ 3 ดาว → 3.8 (ไม่ใช่ 3.0 ตรงๆ)
- **Bug Fix: demo-driver คะแนนแสดงไม่ตรง**
  - **ปัญหา:** คะแนน 4.9 ถูก hardcode ในโค้ด ไม่ได้ดึงจาก database
  - **แก้ไข:** เพิ่ม `rating`, `ratingCount`, `totalTrips`, `totalEarnings` ใน DriverData interface
  - **แก้ไข:** ดึงข้อมูลจาก Firestore และแสดง `driver?.rating?.toFixed(1) || '-'`
- **Files modified:**
  - `app/api/booking/rate/route.ts` - เพิ่ม `calculateBayesianRating()` function
  - `app/demo-driver/page.tsx` - แก้ไข hardcoded rating → ดึงจาก database
  - `scripts/test-rating-flow.js` - อัปเดตให้ใช้ Bayesian formula เดียวกัน

### 2025-12-31 v7.4 - Rating System + Security 🔒⭐
- **ระบบให้คะแนนเต็มรูปแบบ (Grab/Uber Style):**
  - ลูกค้าให้คะแนนคนขับ (1-5 ดาว) + ทิป + ความคิดเห็น
  - คนขับให้คะแนนลูกค้า (1-5 ดาว) + เหตุผล + ความคิดเห็น
  - บังคับเลือกเหตุผลถ้าคะแนน ≤3 ดาว
  - อัปเดต rating เฉลี่ยอัตโนมัติ
  - เพิ่มทิปเข้า `driver.totalTips` และ `totalEarnings`
- **API `/api/booking/rate`:**
  - POST endpoint สำหรับส่งคะแนน
  - รองรับ `customerToDriver` และ `driverToCustomer`
- **Security Hardening (4 ข้อ):**
  1. **Rate Limiting**: จำกัด 10 requests/minute per user
  2. **Tip Validation**: จำกัด max ฿10,000
  3. **Comment Sanitization**: ลบ HTML/XSS tags, จำกัด 500 ตัวอักษร
  4. **Reason Code Whitelist**: ตรวจสอบ reason codes ใน whitelist
- **Rating Modal UI:**
  - `test-maps1`: Rating Modal พร้อมทิป (฿0/฿20/฿50/฿100/custom)
  - `demo-driver`: Rating Modal พร้อมเหตุผลสำหรับคะแนนต่ำ
- **Test Script:**
  - `scripts/test-rating-flow.js` - ทดสอบ rating flow ครบ
  - รัน: `node scripts/test-rating-flow.js --cleanup`
- **Types เพิ่ม:**
  - `RatingReasonCode` enum
  - `CustomerRating`, `DriverRating`, `BookingRatings` interfaces
- **Files created/modified:**
  - `app/api/booking/rate/route.ts` - NEW: Rating API
  - `app/test-maps1/page.tsx` - Rating Modal (customer)
  - `app/demo-driver/page.tsx` - Rating Modal (driver)
  - `lib/types/index.ts` - Rating types
  - `scripts/test-rating-flow.js` - NEW: Test script

### 2025-12-31 v7.3 - Live Mode Bug Fixes 🐛
- **แก้ไข 3 บั๊กใน `/test-maps1` Live Mode:**
  1. **Coordinates ไม่ถูก restore** - เมื่อโหลด active booking กลับมา หมุดแผนที่แสดงผิดตำแหน่ง
     - แก้ไข: `checkActiveBooking()` โหลดพิกัดจาก `booking.pickupCoordinates` และ `booking.dropoffCoordinates`
  2. **Manual status override ขัดแย้งกับ Firestore** - `setTimeout` เปลี่ยนสถานะเป็น `driver_en_route` หลัง 2 วินาที
     - แก้ไข: ลบ manual override, ให้ Firestore subscription จัดการสถานะ
  3. **Coordinates ไม่ถูกบันทึกตอนสร้าง booking** - ทำให้โหลดกลับมาไม่ได้
     - แก้ไข: `createLiveBooking()` บันทึก `pickupCoordinates`, `dropoffCoordinates`, `pickupLocationId`, `dropoffLocationId`
- **Live Mode Flow ทำงานถูกต้องแล้ว:**
  - ผู้ใช้เลือกจุดรับ-ส่ง → พิกัดบันทึกใน state
  - สร้าง Booking พร้อมพิกัด → Firestore subscription คอยรับฟัง
  - Admin/คนขับ อัปเดตสถานะ → หน้าจออัปเดตอัตโนมัติ
  - Refresh หน้า → พิกัดโหลดกลับจาก booking
- **Files modified:**
  - `app/test-maps1/page.tsx` - แก้บั๊ก 3 จุด
  - `lib/types/index.ts` - เพิ่ม `pickupLocationId`, `dropoffLocationId`

### 2025-12-30 v7.2 - Demo Driver + Log Checker 🔍
- **สร้างหน้า `/demo-driver`** - Driver app UI ใหม่ + Google Maps + Real Backend
  - Mobile-first design (max-width 430px) แบบ Uber/Grab
  - เชื่อมต่อ Firebase Auth จริง (ต้อง login)
  - Subscribe to bookings จริง (real-time)
  - ใช้ API จริง (`/api/driver/status`, `/api/driver/bookings`)
  - GPS tracking เมื่อมีงาน
  - Job notification modal พร้อม countdown 15 วินาที
- **Scripts สำหรับ Debug & Monitoring:**
  - `scripts/check-logs.js` - ตรวจสอบ bugs ในระบบ (Vercel logs, Firebase, Code issues)
  - `scripts/monitor-logs.js` - Monitor logs แบบ real-time พร้อมเสียงแจ้งเตือน
- **Features ของ check-logs.js:**
  - ตรวจสอบ Vercel production logs
  - ตรวจสอบ Firebase configuration
  - หา code smells (console.log, any type, TODO, @ts-ignore)
  - TypeScript error check
  - API routes health check
  - สรุปผลแบบสวยงาม
- **Files created:**
  - `app/demo-driver/page.tsx` - Demo driver page
  - `scripts/check-logs.js` - Bug checker script
  - `scripts/monitor-logs.js` - Real-time log monitor

### 2025-12-30 v7.1 - Driver GPS Location Tracking 📍
- **Driver App ส่ง GPS Location ได้แล้ว!**
- **เมื่อคนขับมีงาน (driver_en_route หรือ in_progress):**
  - GPS จะเริ่มทำงานอัตโนมัติ
  - ส่งตำแหน่งไปที่ `/api/driver/location` ทุก 5 วินาที
  - อัปเดต `currentLocation` ใน Firestore
- **GPS Status Indicator บนหน้า Driver:**
  - สีเขียว: กำลังส่งตำแหน่ง + แสดง "LIVE"
  - สีเหลือง: กำลังเชื่อมต่อ GPS
  - สีแดง: ไม่สามารถติดตามได้ (ไม่ได้อนุญาต)
- **Hooks ที่ใช้:**
  - `useDriverLocationUpdates()` - ส่ง location ไป API
  - `useGeolocation()` - ดึง GPS จาก browser
- **Files modified:** `app/driver/page.tsx`

### 2025-12-30 v7.0 - Test Maps 1 Full Booking Flow 🚀
- **สร้างหน้า `/test-maps1`** - Mobile App Style + Real Database Integration
- **Two Modes:**
  - Demo Mode: Simulation เหมือน test-maps
  - Live Mode: เชื่อมต่อ database จริงทั้งหมด
- **Live Mode Features:**
  - ✅ Routes Collection: ดึงราคาจริงจาก `routes` collection
  - ✅ Vehicle Selection: ดึงรถจาก `vehicles` collection + Vehicle Picker Bottom Sheet
  - ✅ Create Booking: สร้าง booking จริงใน Firestore
  - ✅ Driver Assignment: ดึงคนขับที่ว่างและ assign ให้ booking
  - ✅ Real-time Tracking: ใช้ `useDriverTracking` hook
  - ✅ Active Booking Check: ตรวจสอบว่ามี booking ที่กำลังดำเนินการ → ป้องกันจองซ้ำ
- **Active Booking Flow:**
  - เมื่อเข้า Live Mode → เช็ค active booking ของ user
  - ถ้ามี → แสดงกล่องแจ้งเตือน + ซ่อนปุ่มจองใหม่
  - ถ้าไม่มี → แสดง UI ปกติให้จองได้
- **Files modified:** `app/test-maps1/page.tsx`
- **Documentation:** เพิ่ม section "Test Maps 1 - Full Booking Flow" ใน CLAUDE.md

### 2025-12-30 v6.9 - Custom SVG Markers (Modern Design) 🎨
- **Custom SVG Markers สวยๆ โมเดิร์น** - ไม่ใช้ Google Maps icons เดิมอีกต่อไป
- **Pickup Marker (จุดรับ):**
  - รูปหยดน้ำ (pin shape) 48x60px
  - Gradient สีเขียว `#34d399` → `#059669`
  - Drop shadow สวยงาม
  - วงกลมสีขาวตรงกลาง + จุดสีเขียว
- **Dropoff Marker (จุดส่ง):**
  - รูปหยดน้ำ (pin shape) 48x60px
  - Gradient สีแดง `#f87171` → `#dc2626`
  - Drop shadow สวยงาม
  - สี่เหลี่ยมสีแดงตรงกลาง (แตกต่างจากจุดรับ)
- **Car Marker (รถ):**
  - วงกลม gradient ม่วง `violet-500` → `purple-700`
  - Glow effect รอบๆ (blur + opacity)
  - ลูกศรทิศทางด้านบน
  - หมุนตามทิศทางรถ (rotation)
- **Implementation:**
  - ใช้ inline SVG → data URL
  - `createMarkerIcon()` helper function
  - Size 44px (scaledSize: 44x55)
- **Files modified:** `app/test-maps/page.tsx`

### 2025-12-30 v6.8 - Real-time Drag & Lock Markers 🔒
- **Real-time Address ขณะลาก** - เมื่อลากหมุด ที่อยู่แสดงบน overlay ทันที (ไม่ต้องปล่อยหมุดก่อน)
  - ใช้ `onDrag` event แทน `onDragEnd` เพียงอย่างเดียว
  - Debounce 200ms ป้องกัน API เรียกถี่เกินไป
  - Overlay สีเขียว (จุดรับ) / สีแดง (จุดส่ง) แสดงที่อยู่ real-time
- **ลากได้ทั้งจุดรับและจุดส่ง** - หมุด A และ B ลากปรับตำแหน่งได้ทั้งคู่
- **หมุดใหญ่ขึ้น กดง่าย** - เปลี่ยนเป็น Google Maps standard markers 50x50px
  - จุดรับ: `green-dot.png` (สีเขียว)
  - จุดส่ง: `red-dot.png` (สีแดง)
- **ล็อคหมุดเมื่อรถวิ่ง** - `draggable={status === 'searching'}`
  - ✅ ลากได้เมื่อสถานะ "กำลังหาคนขับ..."
  - 🔒 ล็อคเมื่อกดจำลองหาคนขับแล้ว / รถวิ่งแล้ว
  - กด "เริ่มใหม่" → ปลดล็อคหมุด
- **Files modified:** `app/test-maps/page.tsx`

### 2025-12-30 v6.7 - Maps Drag Pin & Places Autocomplete 📍
- **Google Places Autocomplete** - กรอกค้นหาจุดรับ-ส่งจริงได้
  - พิมพ์ชื่อสถานที่ → แสดง dropdown ให้เลือก
  - จำกัดผลลัพธ์เฉพาะประเทศไทย (`componentRestrictions: { country: 'th' }`)
- **GPS Button** - กดปุ่ม 📍 เพื่อใช้ตำแหน่งปัจจุบันเป็นจุดรับ
- **Draggable Pickup Marker** - ลากหมุดจุดรับปรับตำแหน่งได้
  - แตะค้างที่หมุด A แล้วลากไปตำแหน่งที่ต้องการ
  - ที่อยู่อัปเดต real-time หลังปล่อยหมุด (Reverse Geocoding)
  - ไม่ต้องกดปุ่มยืนยัน - ง่ายแบบ Grab/Uber
- **Minimal Pin Design** - ใช้หมุดปกติมี label A (จุดรับ) และ B (จุดส่ง)
- **Quick Locations** - ปุ่มเลือกสถานที่ยอดนิยมเร็วๆ
- **Map Control Buttons:**
  - 🗺️ ดูทั้งเส้นทาง
  - 🚗 ซูมไปที่รถ (เมื่อจำลองวิ่ง)
  - 📍 ซูมไปตำแหน่งของฉัน
- **Fix:** แผนที่เลื่อน/ซูมได้แล้ว (ปิด followCar เริ่มต้น)
- **Files modified:** `app/test-maps/page.tsx`

### 2025-12-30 v6.6 - Real-Time Maps Test Page 🚗
- สร้าง `/test-maps` page สำหรับทดสอบ real-time tracking แบบ Grab/Uber
- **Smooth Animation:** รถเคลื่อนที่ตามเส้นทางแบบ smooth ด้วย interpolation
- **Car Rotation:** รถหมุนตามทิศทางด้วย `calculateBearing()` function
- **Map Following:** แผนที่เลื่อนตามรถด้วย `panTo()` (toggle ได้)
- **ETA Display:** แสดงเวลาถึงแบบ real-time countdown
- **Progress Bar:** แสดงความคืบหน้าการเดินทาง
- **Speed Control:** ปรับความเร็วจำลอง 20-120 km/h
- ใช้ `requestAnimationFrame` สำหรับ 60fps animation
- ใช้ `OverlayView` สำหรับ custom car marker ที่หมุนได้
- รองรับ GPS location ของผู้ใช้

### 2025-12-30 v6.5 - Real-Time Maps Setup 🗺️
- เพิ่ม documentation สำหรับ Real-Time Maps feature (Google Maps Platform)
- กำหนด database schema, APIs, และ implementation checklist
- ย้าย "Real-time Tracking" จาก "Nice to Have" เป็น "High Priority"
- ติดตั้ง `@react-google-maps/api` library
- สร้าง Google Maps API Key (Project: Tuktik Project)
- Enable APIs: Maps JavaScript, Places, Directions, Geocoding
- สร้าง `components/map/MapContainer.tsx` component
- เพิ่ม API Key ใน `.env.local` และ Vercel

### 2025-12-30 v6.4 - Photo Sync Fix 📸🔧
- **Bug Fix: รูปโปรไฟล์ไม่แสดงในหน้าคนขับ**
  - **สาเหตุ:** `/driver/login` ไม่ได้ sync `photoURL` จาก Google → Firestore
  - **แก้ไข:** เพิ่ม `setDoc` หลัง Google login เพื่อ sync photoURL
- **Driver Profile Page Update**
  - เพิ่ม `photo` field ใน DriverData interface
  - ดึง photoURL จาก `driver.photo` หรือ `user.photoURL` (priority logic)
  - แสดงรูปจริงแทน icon ในหน้า `/driver/profile`
- **Photo Sync Script**
  - สร้าง `scripts/sync-user-photos.js` สำหรับ sync photoURL จาก Firebase Auth → Firestore
  - ใช้เมื่อมี user ที่ login ก่อนหน้าที่ photoURL ไม่ได้ถูก sync
- **Photo Priority Logic (ทุกหน้าใช้เหมือนกัน):**
  ```typescript
  const photoURL = driver.photo || user.photoURL || null;
  ```
- **Files modified:**
  - `app/driver/login/page.tsx` - เพิ่ม sync photoURL หลัง Google login
  - `app/driver/profile/page.tsx` - แสดงรูปโปรไฟล์จริง
  - `scripts/sync-user-photos.js` - script sync photos (new)

### 2025-12-30 v6.3 - Driver Earnings & Profile Photos 💰📸
- **Driver Earnings System**
  - เพิ่ม `totalEarnings` field ใน Driver interface
  - แสดงรายได้ในหน้า `/admin/drivers`:
    - Stats Card: เที่ยวทั้งหมด (สีม่วง) + รายได้รวม (สีเขียว)
    - Driver Card: แสดง 3 กล่อง (trips/earned/rating)
  - Auto-update earnings เมื่อ booking status เป็น `completed`
  - อัปเดตใน `/api/driver/bookings` route
- **Profile Photos**
  - Admin Layout: แสดงรูปโปรไฟล์จาก Google/Firestore (3 จุด: sidebar, header, dropdown)
  - Driver Cards: แสดงรูปถ้ามี `driver.photo`
  - ดึง `photoURL` จาก Firestore หรือ Firebase Auth
- **Cleanup Scripts**
  - `scripts/cleanup-bookings.js` - ลบ bookings ทั้งหมด
  - `scripts/cleanup-notifications.js` - ลบ notifications ทั้งหมด
  - `scripts/reset-drivers.js` - reset สถานะคนขับ + earnings
  - `scripts/check-photos.js` - เช็ครูปโปรไฟล์ใน database
- **Files modified:**
  - `lib/types/index.ts` - เพิ่ม `totalEarnings` ใน Driver interface
  - `app/admin/drivers/page.tsx` - Stats cards + Driver cards redesign
  - `app/admin/layout.tsx` - Profile photo display
  - `app/api/driver/bookings/route.ts` - Auto-update earnings on completion

### 2025-12-29 v6.2 - Admin i18n Complete 🌐
- **Complete i18n translations for ALL admin pages**
  - `/admin` - Admin dashboard page (stats, charts, recent bookings, quick actions)
  - `/admin/bookings` - Booking management page
  - `/admin/drivers` - Driver management page
  - `/admin/customers` - Customer management page
  - `/admin/members` - Member management page
  - `/admin/vehicles` - Vehicle management page
  - `/admin/routes` - Route pricing page
- **Translation features:**
  - Status labels switch based on language (Thai/English)
  - Payment method and status labels switch based on language
  - All stats, filters, empty states, and action buttons translated
  - Date formatting uses locale-aware formatting (th-TH / en-US)
  - Chart day names (Mon-Sun / จ-อา) switch based on language
- **Files modified:**
  - `lib/i18n/translations.ts` - Added ~450 lines of translations (including dashboard)
  - All admin page.tsx files - Updated to use `useLanguage()` hook
- **Pattern used:**
  ```typescript
  const { t, language } = useLanguage();
  // Then use {t.admin.bookings.title} or similar
  ```

### 2025-12-29 v6.1 - Push Notification & Payment Form Redesign 🔔
- **Push Notification ทำงานสมบูรณ์แล้ว!**
  - แก้ไข `firebase-messaging-sw.js` ใส่ Firebase config จริง
  - ทดสอบผ่านทุกประเภท: test, booking_confirmed, driver_en_route, completed
  - Service Worker registered และรับ FCM Token สำเร็จ
  - รองรับทั้ง Foreground และ Background notifications
- **Payment Form Redesign (Card-Based Sections)**
  - Card 1: ข้อมูลติดต่อ (ชื่อ, นามสกุล, เบอร์โทร, อีเมล) - พื้นหลัง blue gradient
  - Card 2: รายละเอียดการเดินทาง (เที่ยวบิน, ผู้โดยสาร, กระเป๋า) - พื้นหลัง amber gradient
  - เพิ่ม icons ทุก field, focus ring effect, dark mode support
  - Stepper buttons สำหรับผู้โดยสาร/กระเป๋า
- **ไฟล์ที่แก้:**
  - `public/firebase-messaging-sw.js` - Firebase config จริง
  - `app/payment/page.tsx` - Card-Based form design

### 2025-12-29 v6.0 - Customer Dashboard i18n 🌐
- เพิ่มระบบ **translations สมบูรณ์** สำหรับหน้า Customer Dashboard (`/dashboard`)
- **ข้อความที่แปลแล้ว:**
  - Greeting messages (สวัสดีตอนเช้า/บ่าย/เย็น)
  - Status labels ทุกสถานะ (รอชำระเงิน, รอยืนยัน, ยืนยันแล้ว, ฯลฯ)
  - Action buttons (ชำระเงินเลย, ดูรายละเอียด, โทรคนขับ, ติดต่อเรา)
  - Empty state (พร้อมเดินทางหรือยัง?)
  - Stats labels (เที่ยว, ใช้ไปแล้ว, คะแนน)
  - Booking history section
  - Quick links (LINE, ช่วยเหลือ)
  - Bottom navigation (หน้าหลัก, โปรไฟล์)
  - Celebration modal (ถึงจุดหมายแล้ว!)
- รองรับการแสดงวันที่ตามภาษา (th-TH / en-US)
- **ไฟล์ที่แก้:**
  - `lib/i18n/translations.ts` - เพิ่ม dashboard translations ทั้ง EN และ TH
  - `app/dashboard/page.tsx` - ใช้ `useLanguage` hook แทน hardcode text

### 2025-12-29 v5.9 - Driver Status Update Fix 🔧
- แก้ไข bug "Cannot change status from X to X" ในหน้าคนขับ
- **สาเหตุ:** Race condition - คนขับกดปุ่มก่อน real-time update มาถึง
- **วิธีแก้:**
  1. เพิ่มการเช็คก่อนเรียก API: ถ้า `currentStatus === newStatus` → skip
  2. เพิ่ม **Optimistic Update**: อัปเดต local state ทันทีหลัง API สำเร็จ
- ป้องกันการกดปุ่มซ้ำที่ทำให้เกิด error
- **ไฟล์ที่แก้:** `app/driver/page.tsx`

### 2025-12-29 v5.8 - Mobile-Friendly Date/Time Picker 📅
- แทนที่ native date/time inputs ด้วย **Custom Bottom Sheet Pickers**
- **Date Picker Features:**
  - Bottom Sheet เปิดจากด้านล่างบนมือถือ, ตรงกลางบน Desktop
  - ปฏิทินเต็มหน้า ปุ่มวันที่ขนาดใหญ่ **48x48px** กดง่าย
  - ปุ่มเลื่อนเดือน ◀ ▶ ขนาดใหญ่
  - Quick Actions: ปุ่ม "วันนี้" และ "พรุ่งนี้"
  - ไฮไลท์วันที่เลือกด้วย gradient สีส้ม
  - วันในอดีตถูก disable อัตโนมัติ
  - รองรับ Thai/English day names
- **Time Picker Features:**
  - แบ่งช่วงเวลาชัดเจน: เช้าตรู่, เช้า, สาย, บ่าย, เย็น, ค่ำ
  - Grid 4 คอลัมน์ ปุ่มใหญ่กดง่าย
  - ไอคอนประจำช่วงเวลา (☀️ 🌅 🌙)
  - แสดงเวลาที่เลือกขนาดใหญ่ด้านบน
- **UX Improvements:**
  - Backdrop blur effect
  - Animation slide-in from bottom
  - รองรับ Dark mode
  - Touch-friendly สำหรับมือถือ
- **ไฟล์ที่แก้:** `app/vehicles/page.tsx`

### 2025-12-29 v5.7 - Auth Page Protection 🔒
- ป้องกันผู้ใช้ที่ login แล้วเข้าหน้า `/login` และ `/register`
- เพิ่ม `useAuth` hook เช็คสถานะ login
- ถ้า login แล้ว redirect ไป `/dashboard` ทันที
- แสดง loading spinner ระหว่างตรวจสอบ auth state
- ใช้ `router.replace()` ป้องกันกด back กลับมา
- **ไฟล์ที่แก้:** `app/login/page.tsx`, `app/register/page.tsx`

### 2025-12-29 v5.6 - Notification Sound & Mark All Read Fix 🔔
- เพิ่มเสียงแจ้งเตือนเมื่อมี notification ใหม่
  - ใช้ **Web Audio API** สร้างเสียง chime สองโน้ต (A5 → D6)
  - เล่นเสียงเฉพาะเมื่อ unread count เพิ่มขึ้น (ไม่เล่นตอน load หน้าแรก)
  - รองรับ Chrome, Firefox, Safari
- แก้ไขปุ่ม "อ่านทั้งหมด" ไม่ทำงาน
  - เพิ่ม loading state (`markingAllRead`) ป้องกันกดซ้ำ
  - อัปเดต local state ทันที (`setUnreadCount(0)`) ให้ UI ตอบสนองเร็ว
  - เพิ่ม error handling พร้อมแจ้งเตือนถ้าเกิดข้อผิดพลาด
  - แสดง spinner animation ขณะกำลังประมวลผล
- **ไฟล์ที่แก้:** `components/notifications/NotificationBell.tsx`

### 2025-12-29 v5.5 - Driver History Auth Fix 🔧
- แก้ไขปัญหา redirect loop ในหน้า `/driver/history`
- **สาเหตุ:** ใช้ `localStorage.getItem('driver_session')` แทน Firebase Auth
  - ไม่ตรงกับ `layout.tsx` และหน้าอื่นๆ ที่ใช้ `onAuthStateChanged`
  - ทำให้เกิด redirect loop กลับไปหน้า login
- **วิธีแก้:** เปลี่ยนจาก localStorage เป็น Firebase Auth
  - ใช้ `onAuthStateChanged` เหมือนกับ `driver/page.tsx` และ `driver/profile/page.tsx`
  - ดึง driverId จาก Firestore (users → drivers collection)
- **ไฟล์ที่แก้:** `app/driver/history/page.tsx`
- **Pattern ที่ถูกต้อง:** ทุกหน้า driver ต้องใช้ Firebase Auth ผ่าน `onAuthStateChanged`

### 2025-12-29 v5.4 - Complete Form Accessibility Fix ♿
- แก้ไข Form Accessibility Errors ครบทุกหน้า Admin และ Landing Page
- **Admin Pages ที่แก้ไข:**
  - `admin/customers/page.tsx` - search input, sort select
  - `admin/settings/page.tsx` - business info, currency/timezone, working hours
  - `admin/drivers/page.tsx` - search input, modal form fields ทั้งหมด
  - `admin/locations/page.tsx` - search input, modal form fields
  - `admin/vehicles/page.tsx` - search input
  - `admin/members/page.tsx` - search input, role/driver filters
  - `admin/routes/page.tsx` - search input, modal form (origin/destination, prices)
- **Landing Page (BookingForm.tsx):**
  - pickup/dropoff location, date/time custom pickers
  - ใช้ `type="text"` + `readOnly` + `tabIndex={-1}` + `className="sr-only"` แทน `type="hidden"`
  - เหตุผล: `type="hidden"` ไม่ถือเป็น form field สำหรับ label association
- **Pattern ที่ใช้:**
  - เพิ่ม `htmlFor` ให้ทุก `<label>`
  - เพิ่ม `id`, `name` ให้ทุก form element
  - Custom pickers: ใช้ `<input type="text" readOnly tabIndex={-1} className="sr-only" />`
  - ใช้ `<fieldset>` + `<legend>` สำหรับ grouped fields
  - ใช้ `className="sr-only"` สำหรับ hidden labels

### 2025-12-28 v5.3 - Form Accessibility Fix (Admin Bookings) ♿
- แก้ไข Error 200+ รายการในหน้า `/admin/bookings`
- ปัญหา: `<select>` และ `<input>` ไม่มี `id` หรือ `name` attribute
- เพิ่ม `id`, `name`, `autoComplete` ให้ form elements ทั้งหมด
- เพิ่ม `<label>` พร้อม `htmlFor` หรือ `sr-only` สำหรับ accessibility
- Dynamic IDs สำหรับ booking cards: `id="status-{bookingId}"`, `id="payment-{bookingId}"`
- ไฟล์ที่แก้: `app/admin/bookings/page.tsx`, `app/page.tsx`, `components/booking/BookingForm.tsx`

### 2025-12-28 v5.2 - Security Hardening 🔒
- แก้ไขช่องโหว่ Firestore rules: คนขับอ่านได้เฉพาะ booking ที่ได้รับมอบหมาย
- ก่อนแก้: approved driver อ่านได้ทุก booking (ละเมิดความเป็นส่วนตัว)
- หลังแก้: driver อ่านได้เฉพาะ `driver.driverId == getUserDriverId()`
- อัปเดต Firestore Security Rules Summary ใน documentation
- ยืนยันว่าไม่กระทบการทำงาน: ลูกค้า, คนขับ, แอดมิน ทำงานปกติ

### 2025-12-28 v5.1 - Language System Update 🌐
- เพิ่ม Language System (i18n) section ใน documentation
- เพิ่ม translations ครบถ้วนสำหรับ admin (menu, sidebar, header)
- เพิ่มปุ่มเปลี่ยนภาษา (TH/EN) ใน Admin header
- อัปเดต Admin layout ให้ใช้ translations แทน hardcode
- Language persistence: localStorage + Firestore sync
- อัปเดต Coding Rules: ใช้ translations แทน hardcode text

### 2025-12-28 v5.0 - Perfect Score Edition 🎯
- เพิ่ม Testing Guide (ทดสอบแต่ละ role, API testing, test cases)
- เพิ่ม Deployment Checklist (pre/post deployment, env vars, rollback)
- เพิ่ม Troubleshooting Guide (8 common errors และวิธีแก้)
- เพิ่ม Form Validation Patterns (email, phone, plate, form component)
- เพิ่ม File Upload Patterns (Firebase Storage, preview, compression)
- Documentation ครบ 10/10

### 2025-12-28 v4.0 - Critical Implementation Details
- เพิ่ม "Critical Implementation Details" section สำหรับ AI
- เพิ่ม Driver Status Transitions flow
- เพิ่ม Driver Rejection Flow ละเอียด
- เพิ่ม Driver Assignment Validation rules
- เพิ่ม Authentication Pattern (verifyDriverOwnership)
- เพิ่ม Firestore Timestamp bug fix reference
- เพิ่ม Super Admin Protection rules
- เพิ่ม Notification Creation Pattern
- เพิ่ม Status Badge Colors consistency
- เพิ่ม Error Response Format standard

### 2024-12-28 v3.0 - Documentation Overhaul
- Complete rewrite of CLAUDE.md
- Accurate project structure mapping
- Added all services, hooks, components documentation
- Added TypeScript types reference
- Fixed inaccurate information

### 2024-12-28 v2.0 - Driver Dashboard & Security
- Added driver job rejection flow
- Fixed API authentication (Bearer tokens)
- Fixed `Timestamp.now()` in arrays
- Thai language translations for all admin pages
- Updated security documentation
- Mobile dropdown fix (bottom sheet)

### 2024-12 (Early) - Initial Release
- Customer booking flow
- Admin management pages
- Payment integration (Stripe)
- Firebase Auth & Firestore setup

---

## 🚨 Critical Implementation Details (AI ต้องอ่าน!)

> **สำคัญมาก:** Section นี้รวบรวมรายละเอียดที่ AI มักทำผิด ต้องอ่านและทำตามอย่างเคร่งครัด

### 1. Driver Status Transitions (ห้ามเปลี่ยน Logic)

```typescript
// คนขับเปลี่ยนสถานะ booking ได้เฉพาะตาม flow นี้เท่านั้น
const validTransitions: Record<string, string[]> = {
    'driver_assigned': ['driver_en_route'],  // รับงาน → กำลังไปรับ
    'driver_en_route': ['in_progress'],       // ถึงจุดรับ → เริ่มเดินทาง
    'in_progress': ['completed']              // ถึงปลายทาง → เสร็จสิ้น
};

// ห้ามข้ามขั้นตอน! เช่น driver_assigned → completed โดยตรงไม่ได้
```

### 2. Driver Rejection Flow (Critical)

```typescript
// เมื่อคนขับปฏิเสธงาน ต้องทำครบทุกขั้นตอน:
case 'rejectJob': {
    // 1. เช็คว่า status เป็น driver_assigned เท่านั้น
    if (currentData?.status !== 'driver_assigned') {
        return error;
    }

    // 2. Update booking
    await bookingRef.update({
        status: 'confirmed',     // กลับไป confirmed
        driver: null,            // ลบคนขับออก
        statusHistory,
        updatedAt: FieldValue.serverTimestamp()
    });

    // 3. Update driver status กลับเป็น available
    await driverRef.update({ status: 'available' });

    // 4. สร้าง admin_notification
    await adminDb.collection('admin_notifications').add({...});
}
```

### 3. Driver Assignment Validation (ห้ามข้าม)

```typescript
// เมื่อ assign driver ต้องเช็คทั้ง 2 เงื่อนไข:

// 1. เช็คว่าคนขับไม่มีงานอยู่
const activeBookingsSnap = await adminDb.collection('bookings')
    .where('driver.driverId', '==', driverInfo.driverId)
    .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
    .get();

if (!activeBookingsSnap.empty) {
    return error('คนขับกำลังมีงานอยู่ ไม่สามารถรับงานซ้อนได้');
}

// 2. เช็คว่าคนขับไม่ใช่เจ้าของ booking
if (driverData?.userId === currentData?.userId) {
    return error('คนขับไม่สามารถรับงานของตัวเองได้');
}
```

### 4. Driver Status Cannot Go Offline with Active Job

```typescript
// ใน /api/driver/status/route.ts
if (status === 'offline') {
    const activeBookingsSnap = await adminDb.collection('bookings')
        .where('driver.driverId', '==', driverId)
        .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
        .get();

    if (!activeBookingsSnap.empty) {
        return error('คุณมีงานอยู่ ต้องเสร็จงานก่อนถึงจะปิดสถานะได้');
    }
}
```

### 5. Driver Setup Flow (3 ขั้นตอน)

```
1. Admin อนุมัติ user เป็น driver → isApprovedDriver = true
2. Driver กรอกข้อมูลรถ + อัพโหลดเอกสาร → setupStatus = 'pending_review'
3. Admin ตรวจสอบเอกสาร → setupStatus = 'approved' หรือ 'rejected'
```

```typescript
// Driver setup requires:
{
    vehiclePlate: string,      // ทะเบียนรถ (required)
    vehicleModel: string,      // รุ่นรถ (required)
    vehicleColor: string,      // สีรถ (required)
    idCardUrl: string,         // รูปบัตรประชาชน (required)
    driverLicenseUrl: string,  // รูปใบขับขี่ (required)
    licenseNumber?: string,    // เลขใบขับขี่ (optional)
}
```

### 6. Authentication Pattern (ทุก API ต้องใช้)

```typescript
// ทุก Driver API route ต้องมี verifyDriverOwnership function
async function verifyDriverOwnership(request: NextRequest, driverId: string) {
    // 1. ดึง Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, error: 'Unauthorized - No token provided' };
    }

    // 2. Verify token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 3. เช็คว่าเป็น approved driver
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userData?.isApprovedDriver) {
        return { success: false, error: 'User is not an approved driver' };
    }

    // 4. เช็คว่า driverId ตรงกับ user
    if (userData?.driverId !== driverId) {
        // fallback: เช็คจาก drivers collection
        const driverDoc = await adminDb.collection('drivers').doc(driverId).get();
        if (driverDoc.data()?.userId !== userId) {
            return { success: false, error: 'You are not authorized' };
        }
    }

    return { success: true, userId };
}
```

### 7. Frontend Auth Token Pattern

```typescript
// ใช้ useAuthToken hook สำหรับเรียก API
import { useAuthToken } from '@/lib/hooks';

const { getAuthHeaders } = useAuthToken();

// ✅ Correct
const response = await fetch('/api/driver/bookings?driverId=' + driverId, {
    headers: await getAuthHeaders()
});

// ✅ Correct - POST
const response = await fetch('/api/driver/status', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ driverId, status: 'available' })
});

// ❌ Wrong - ลืม headers
const response = await fetch('/api/driver/bookings');
```

### 8. Firestore Timestamp ใน Array (Critical Bug)

```typescript
// ❌ WRONG - จะ error!
statusHistory.push({
    status: 'confirmed',
    timestamp: FieldValue.serverTimestamp(), // ERROR ใน array!
    note: 'test'
});

// ✅ CORRECT
import { Timestamp } from 'firebase-admin/firestore';
statusHistory.push({
    status: 'confirmed',
    timestamp: Timestamp.now(),  // ใช้ Timestamp.now() แทน
    note: 'test'
});
```

### 9. Super Admin Protection

```typescript
// Super Admin email ถูก hard-code ใน adminAuth.ts
export const SUPER_ADMIN_EMAIL = 'phiopan@gmail.com';

// Actions ที่ต้องใช้ Super Admin:
// - updateRole (เปลี่ยน role user)
// - removeWrongAdmins (cleanup)
// - First-time admin setup

// ห้ามลบ/เปลี่ยน super admin role
if (userToUpdate.email === SUPER_ADMIN_EMAIL && data.role !== 'admin') {
    return error('Cannot remove admin role from Super Admin');
}
```

### 10. Notification Creation Pattern

```typescript
// สร้าง notification ให้ลูกค้า
await adminDb.collection('notifications').add({
    userId: currentData.userId,    // required - ใครจะเห็น
    type: 'booking',               // booking | payment | system | promotion
    title: 'อัปเดตสถานะ',           // ภาษาไทยเท่านั้น
    message: 'คนขับกำลังเดินทางมารับคุณ',
    data: { bookingId, status },   // optional metadata
    isRead: false,                 // เริ่มต้น false
    createdAt: FieldValue.serverTimestamp()
});

// สร้าง notification ให้ admin
await adminDb.collection('admin_notifications').add({
    type: 'driver_rejected',
    title: 'คนขับปฏิเสธงาน',
    message: `คนขับปฏิเสธงาน ${bookingId}`,
    data: { bookingId, driverId },
    isRead: false,
    createdAt: FieldValue.serverTimestamp()
});
```

### 11. Driver Layout Navigation

```typescript
// Bottom navigation items - ห้ามเปลี่ยน structure
const navItems = [
    { id: 'home', icon: 'home', label: 'หน้าหลัก', href: '/driver' },
    { id: 'history', icon: 'history', label: 'ประวัติ', href: '/driver/history' },
    { id: 'profile', icon: 'person', label: 'โปรไฟล์', href: '/driver/profile' },
];

// Pages ที่ skip layout (ไม่แสดง header/nav):
// - /driver/login
// - /driver/setup
// - /driver/pending
```

### 12. Real-time Listeners Pattern

```typescript
// ใช้ onSnapshot สำหรับ real-time updates
useEffect(() => {
    const unsubscribe = onSnapshot(
        query(collection(db, 'bookings'), where('driver.driverId', '==', driverId)),
        (snapshot) => {
            const bookings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBookings(bookings);
        }
    );

    return () => unsubscribe(); // ต้อง cleanup!
}, [driverId]);
```

### 13. Status Badge Colors (Consistent)

```typescript
// ใช้สีเดียวกันทั้ง project
const statusColors = {
    'awaiting_payment': 'bg-yellow-100 text-yellow-800',
    'pending': 'bg-blue-100 text-blue-800',
    'confirmed': 'bg-green-100 text-green-800',
    'driver_assigned': 'bg-purple-100 text-purple-800',
    'driver_en_route': 'bg-indigo-100 text-indigo-800',
    'in_progress': 'bg-cyan-100 text-cyan-800',
    'completed': 'bg-emerald-100 text-emerald-800',
    'cancelled': 'bg-red-100 text-red-800',
};
```

### 14. Driver Status Colors

```typescript
const driverStatusColors = {
    'available': 'bg-green-500/20 text-green-200',  // ว่าง
    'busy': 'bg-yellow-500/20 text-yellow-200',     // กำลังทำงาน
    'offline': 'bg-gray-500/20 text-gray-300',      // ออฟไลน์
};
```

### 15. Error Response Format (ต้องใช้ตาม pattern นี้)

```typescript
// ทุก API ต้อง return format เดียวกัน:

// Success
return NextResponse.json({
    success: true,
    message: 'สำเร็จ',           // ภาษาไทย
    data: { ... }                // optional
});

// Error
return NextResponse.json(
    {
        success: false,
        error: 'ข้อความ error ภาษาไทย'  // ภาษาไทยเสมอ
    },
    { status: 400 | 401 | 403 | 404 | 500 }
);
```

---

## Notes for AI Assistant

### Before Starting Any Task
```
1. อ่าน CLAUDE.md นี้ก่อนเสมอ ⭐
2. อ่าน "Critical Implementation Details" section ให้ละเอียด ⭐⭐
3. ตรวจสอบ "DO NOT MODIFY" section
4. ใช้ Types จาก lib/types/
5. ใช้ Services จาก lib/firebase/services/
6. ถ้าไม่แน่ใจ ให้ถามก่อนทำ
```

### When Making Changes
```
1. อย่าแก้ไฟล์ที่ไม่เกี่ยวข้อง
2. ใช้ translations จาก useLanguage() (ห้าม hardcode text)
3. ทดสอบก่อน deploy (npm run build)
4. อัปเดต CLAUDE.md หลังแก้ไขสำคัญ
```

### Common Mistakes to Avoid
```
1. ❌ ใช้ `FieldValue.serverTimestamp()` ใน array
2. ❌ ลืมส่ง Bearer token ใน API calls
3. ❌ แก้ไข firestore.rules โดยไม่ทดสอบ
4. ❌ Hardcode text แทนใช้ translations (t.xxx.yyy)
5. ❌ ไม่อ่าน CLAUDE.md ก่อนเริ่มงาน
6. ❌ ลืมเพิ่ม translation ทั้ง en และ th
7. ❌ สร้าง <input>/<select> โดยไม่มี id, name, label (accessibility!)
8. ❌ ใช้ localStorage สำหรับ auth แทน Firebase Auth (ทำให้เกิด redirect loop!)
9. ❌ ลืม deploy ไป Vercel หลังแก้ไขโค้ด (user อาจทดสอบบน production ไม่ใช่ localhost!)
10. ❌ ลืมเพิ่ม Environment Variables ใหม่ใน Vercel (ต้องเพิ่มทั้ง .env.local และ Vercel!)
11. ❌ เพิ่ม Vercel env var ด้วย echo (ใช้ printf แทน!) - อาจมี \n ติดมาทำให้ Stripe error!
```

### Quick Commands
```bash
npm run dev          # Development
npm run build        # Build (ต้องผ่านก่อน deploy)
vercel --prod        # Deploy to production
```

---

*Document maintained by development team. Last updated: 2026-01-02*
*Lines: ~4100 | Version: 8.5 (Security Hardening) 🔒*
