# TukTik Car Rental - Project Documentation

## Project Overview
**ระบบจองรถรับส่งสนามบิน (Airport Transfer Booking System)**
- ลูกค้าจองรถรับส่งสนามบิน
- แอดมินจัดการงาน มอบหมายคนขับ
- รองรับการชำระเงินหลายช่องทาง

---

## Tech Stack
| Technology | Purpose |
|------------|---------|
| Next.js 16.1.1 | Framework (App Router) |
| Tailwind CSS | Styling |
| Firebase Auth | Authentication (Email, Phone, Google) |
| Firestore | Database |
| Firebase Storage | File uploads |
| Stripe | Card payment |
| PromptPay QR | Thai payment |
| Material Symbols | Icons |

---

## Project Structure

### Customer Pages
| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/vehicles` | เลือกรถ + จอง |
| `/payment` | ชำระเงิน |
| `/confirmation` | ยืนยันการจอง |
| `/dashboard` | หน้าหลักลูกค้า (ดู booking, status) |
| `/profile` | ตั้งค่าโปรไฟล์, สถานที่บันทึก, vouchers |
| `/login` | เข้าสู่ระบบ |
| `/register` | ลงทะเบียน (+ เบอร์โทร, บันทึก Firestore) |

### Admin Pages
| Path | Description |
|------|-------------|
| `/admin` | Dashboard (สถิติ, กราฟ, งานล่าสุด) |
| `/admin/bookings` | จัดการ booking (เปลี่ยนสถานะ, มอบหมายคนขับ) |
| `/admin/drivers` | จัดการคนขับ (CRUD, สถานะ available/busy/offline) |
| `/admin/customers` | รายชื่อลูกค้า (รวม Users + Bookings) |
| `/admin/vehicles` | จัดการรถ (CRUD) |
| `/admin/locations` | จัดการสถานที่ |
| `/admin/routes` | ตั้งราคาเส้นทาง |
| `/admin/settings` | ตั้งค่าระบบ |

### Core Services
| File | Purpose |
|------|---------|
| `/lib/firebase/firestore.ts` | Firestore operations ทั้งหมด |
| `/lib/firebase/config.ts` | Firebase initialization |
| `/lib/contexts/AuthContext.tsx` | Authentication state |
| `/lib/contexts/BookingContext.tsx` | Booking state management |
| `/lib/contexts/LanguageContext.tsx` | i18n (TH/EN) |

---

## Firestore Collections

### `bookings`
```typescript
{
  userId: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  pickupLocation: string,
  dropoffLocation: string,
  pickupDate: string,
  pickupTime: string,
  vehicleId: string,
  vehicleName: string,
  totalCost: number,
  status: 'awaiting_payment' | 'pending' | 'confirmed' | 'driver_assigned' | 'driver_en_route' | 'in_progress' | 'completed' | 'cancelled',
  paymentMethod: 'card' | 'promptpay' | 'cash',
  paymentStatus: 'pending' | 'paid' | 'failed',
  driver?: { name, phone, vehiclePlate, vehicleModel, driverId },
  statusHistory: [{ status, timestamp, note }],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `users`
```typescript
{
  email: string,
  displayName: string,
  phone: string,
  role: 'user' | 'admin',
  provider: 'email' | 'phone' | 'google',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `drivers`
```typescript
{
  name: string,
  phone: string,
  email?: string,
  vehiclePlate: string,
  vehicleModel: string,
  vehicleColor: string,
  licenseNumber?: string,
  status: 'available' | 'busy' | 'offline',
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
  name: string,
  type: string,
  seats: number,
  price: number,
  image: string,
  features: string[],
  isActive: boolean
}
```

### `locations`, `routes`, `settings`
- locations: สถานที่ให้บริการ
- routes: ราคาเส้นทาง (origin → destination → price)
- settings: ตั้งค่าธุรกิจ, notifications

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
      (Card/Stripe)       (Cash/QR)                                │
                                                                   ▼
┌───────────┐    ┌─────────────┐    ┌─────────────────┐
│ completed │◀───│ in_progress │◀───│ driver_en_route │
└───────────┘    └─────────────┘    └─────────────────┘
```

### Status Descriptions
| Status | Thai | Action |
|--------|------|--------|
| awaiting_payment | รอชำระเงิน | ลูกค้าต้องชำระ (Stripe) |
| pending | รอยืนยัน | Admin ยืนยัน |
| confirmed | ยืนยันแล้ว | Admin มอบหมายคนขับ |
| driver_assigned | มอบหมายคนขับแล้ว | คนขับออกเดินทาง |
| driver_en_route | คนขับกำลังไป | ถึงจุดรับ เริ่มเดินทาง |
| in_progress | กำลังเดินทาง | ถึงปลายทาง |
| completed | เสร็จสิ้น | - |
| cancelled | ยกเลิก | - |

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

### PromptPay QR / Cash
```
1. ลูกค้าเลือก PromptPay/Cash
2. สร้าง booking (status: pending)
3. Redirect ไป /confirmation
```

### Continue Payment (Dashboard)
```
ถ้า booking เป็น awaiting_payment:
1. แสดงปุ่ม "ชำระเงินเลย" ใน Dashboard
2. กดแล้วไป /payment พร้อม booking data
3. ไม่ block UI (เพราะยังไม่สมบูรณ์)
```

---

## Admin Features

### Bookings Management
- ดูรายการ booking ทั้งหมด
- Filter: สถานะ, วันที่ (วันนี้/พรุ่งนี้/สัปดาห์/เดือน)
- เปลี่ยนสถานะ (มี valid transition check)
- มอบหมายคนขับ (เลือกจาก dropdown หรือกรอกเอง)
- Export CSV
- แจ้งเตือนลูกค้าอัตโนมัติ

### Driver Management
- CRUD คนขับ
- สถานะ: Available / Busy / Offline
- ข้อมูลรถ: ทะเบียน, รุ่น, สี
- สถิติ: จำนวน trips, rating

### Customer Management
- รวมข้อมูลจาก `users` + `bookings`
- Badge: Registered / Verified / Guest
- ดูประวัติ booking ของแต่ละคน
- สถิติ: ยอดจอง, ยอดใช้จ่าย, trips สำเร็จ

### Settings
- ข้อมูลธุรกิจ (ชื่อ, เบอร์, email, ที่อยู่)
- เวลาทำการ
- Auto-confirm bookings
- Require payment upfront
- Notification settings

---

## Firestore Security Rules

```javascript
// Admin check function
function isAdmin() {
  return request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// Key rules
bookings: owner read/update OR admin
users: owner read/write OR admin
drivers: admin only
settings: admin only
vehicles: public read, admin write
locations: public read, admin write
routes: public read, admin write
```

---

## Important Logic

### Active Booking Check
```typescript
const ACTIVE_STATUSES = [
  'awaiting_payment', 'pending', 'confirmed',
  'driver_assigned', 'driver_en_route', 'in_progress'
];
```

### Local vs Server Bookings
- Firestore write fail → localStorage fallback (ID: `local-xxx`)
- Dashboard รวม local + server bookings
- Filter out local `awaiting_payment` เมื่อมี server data

### Driver Assignment
- เลือกจาก dropdown (คนขับที่ว่าง)
- หรือกรอกเอง (manual)
- อัพเดท driver status เป็น 'busy' อัตโนมัติ

### Celebration Effect
- เมื่อ booking status เปลี่ยนเป็น 'completed'
- แสดง confetti + modal

---

## Known Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "No document to update" | Booking ID เป็น `local-xxx` | เช็ค `startsWith('local-')` แล้วสร้างใหม่ |
| Dashboard แสดง status เก่า | Local + server merge | Filter out stale local bookings |
| "คุณมีงานจองอยู่แล้ว" | Block all active bookings | ยกเว้น `awaiting_payment` |
| Driver info ไม่แสดง | Field mismatch | ใช้ `booking.driver?.name` |

---

## Environment Variables
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

---

## Recent Updates (Dec 2024)

### Customer Side
- Dashboard redesign (Card+Concierge style)
- Profile page (settings, saved locations, vouchers)
- Payment flow fixes (awaiting_payment handling)
- Celebration effect on completion

### Admin Side
- Complete admin layout redesign
- Logout functionality
- Drivers management page
- Customers page (merged data)
- Settings page
- Bookings: driver dropdown, status protection, notifications

### System
- Register: saves user to Firestore with phone
- Firestore rules for drivers, settings
- Customer data merging from bookings

---

## What's Still Missing (Recommendations)

### High Priority
1. **Email/SMS Notifications** - ตอนนี้แจ้งเตือนแค่ in-app
2. **Push Notifications** - FCM setup (VAPID key มีแล้ว)
3. **Driver App** - ให้คนขับอัพเดท status เอง
4. **Reports/Analytics** - รายงานรายได้, booking trends

### Medium Priority
5. **Voucher System** - สร้าง/ใช้ promo code
6. **Reviews/Ratings** - ให้ลูกค้ารีวิวหลัง completed
7. **Recurring Bookings** - จองประจำ
8. **Multi-language** - i18n สมบูรณ์

### Nice to Have
9. **Real-time Tracking** - แสดงตำแหน่งคนขับบนแผนที่
10. **Chat** - แชทระหว่างลูกค้า-คนขับ
11. **Invoice/Receipt** - ใบเสร็จ PDF
12. **Referral System** - แนะนำเพื่อนได้ส่วนลด
