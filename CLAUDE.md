# TukTik Car Rental - Project Documentation

> **Last Updated:** 2025-12-29
> **Version:** 5.5 (Driver History Auth Fix)
> **Status:** Production
> **Lines:** ~2000+

---

## Quick Start

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Build & Deploy
npm run build        # Build for production
vercel --prod        # Deploy to Vercel

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
| `/vehicles` | `vehicles/page.tsx` | เลือกรถ + จอง | No |
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
□ STRIPE_WEBHOOK_SECRET
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
1. **Email/SMS Notifications** - แจ้งเตือนผ่าน email/sms
2. **Reports/Analytics** - รายงานรายได้, trends
3. **Voucher Admin UI** - หน้า admin จัดการ voucher

### Medium Priority
4. **Reviews/Ratings** - รีวิวหลังเสร็จงาน
5. **Recurring Bookings** - จองประจำ

### Nice to Have
6. **Real-time Tracking** - แสดงตำแหน่งคนขับ
7. **Chat** - แชทลูกค้า-คนขับ
8. **Invoice/Receipt** - ใบเสร็จ PDF
9. **Referral System** - แนะนำเพื่อน

---

## Changelog

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
```

### Quick Commands
```bash
npm run dev          # Development
npm run build        # Build (ต้องผ่านก่อน deploy)
vercel --prod        # Deploy to production
```

---

*Document maintained by development team. Last updated: 2025-12-29*
*Lines: ~2200 | Version: 5.5 (Driver History Auth Fix) 🔧*
