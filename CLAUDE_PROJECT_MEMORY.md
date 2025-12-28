# TukTik - Car Rental Booking System
## Project Memory for Claude Code

> **Last Updated:** 2025-12-27
> **Status:** Production Ready
> **Live URL:** https://car-rental-phi-lime.vercel.app

---

## 1. Project Overview

TukTik เป็นระบบจองรถรับส่งสนามบินในประเทศไทย (Airport Transfer Service) พัฒนาด้วย Next.js 14 + Firebase + Stripe

### Key Features
- Booking System (จองรถ)
- Real-time Status Tracking (ติดตามสถานะ)
- Stripe Payment Integration
- Admin Dashboard (จัดการ bookings/vehicles/routes)
- Customer Dashboard (ดูงานจอง/Timeline)
- Multi-language Support (TH/EN)

---

## 2. Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 (App Router) | Frontend Framework |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| Firebase Firestore | Database |
| Firebase Auth | Authentication (Email + Phone OTP) |
| Stripe (Firebase Extension) | Payment Processing |
| Vercel | Hosting & Deployment |

---

## 3. File Structure (Important Files)

```
car-rental/
├── app/
│   ├── page.tsx                    # Homepage with BookingForm
│   ├── vehicles/page.tsx           # Vehicle selection
│   ├── payment/page.tsx            # Payment page (Stripe + PromptPay)
│   ├── payment/success/page.tsx    # Stripe success callback
│   ├── payment/cancel/page.tsx     # Stripe cancel callback
│   ├── dashboard/page.tsx          # Customer Dashboard
│   ├── confirmation/page.tsx       # Booking confirmation
│   ├── admin/
│   │   ├── page.tsx               # Admin overview
│   │   ├── bookings/page.tsx      # Manage bookings + Status + Driver
│   │   ├── vehicles/page.tsx      # Manage vehicles
│   │   ├── locations/page.tsx     # Manage locations
│   │   └── routes/page.tsx        # Manage routes + pricing
│   └── ...
├── components/
│   ├── booking/
│   │   ├── BookingForm.tsx        # Main booking form (locations/date/time)
│   │   └── BookingSummary.tsx     # Summary card
│   └── ...
├── lib/
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Firebase Auth
│   │   ├── BookingContext.tsx     # Booking state + locations/routes
│   │   └── LanguageContext.tsx    # i18n (TH/EN)
│   ├── firebase/
│   │   ├── config.ts              # Firebase config
│   │   ├── firestore.ts           # All Firestore operations
│   │   └── stripe.ts              # Stripe checkout session
│   └── data/
│       └── locations.ts           # Fallback static locations
└── CLAUDE_PROJECT_MEMORY.md       # This file
```

---

## 4. Database Structure (Firestore)

### Collections

#### `bookings`
```typescript
{
  id: string;
  userId: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;         // "2025-12-28"
  pickupTime: string;         // "10:00"
  tripType: 'oneWay' | 'roundTrip';
  vehicle: { id, name, price, image, ... };
  totalCost: number;

  // Status System
  status: 'pending' | 'confirmed' | 'driver_assigned' | 'driver_en_route' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'promptpay' | 'bank_transfer' | 'cash';

  // Driver Info (assigned by admin)
  driver?: {
    name: string;
    phone: string;
    vehiclePlate: string;
    vehicleModel?: string;
  };

  // Status History
  statusHistory: Array<{
    status: string;
    timestamp: Timestamp;
    note?: string;
  }>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  paidAt?: Timestamp;
}
```

#### `vehicles`
```typescript
{
  id: string;
  name: string;
  type: 'sedan' | 'suv' | 'van' | 'luxury';
  price: number;           // Base price
  image: string;
  passengers: number;
  luggage: number;
  features: string[];
  isActive: boolean;
}
```

#### `locations`
```typescript
{
  id: string;
  name: { en: string; th: string };
  type: 'airport' | 'city' | 'province';
  coordinates?: { lat: number; lng: number };
  isActive: boolean;
}
```

#### `routes`
```typescript
{
  id: string;
  originId: string;        // location ID
  destinationId: string;   // location ID
  origin: string;          // display name
  destination: string;     // display name
  basePrice: number;
  vehiclePrices?: { [vehicleId]: number };  // Custom per-vehicle pricing
}
```

#### `customers/{userId}/checkout_sessions` (Stripe Extension)
```typescript
{
  mode: 'payment';
  success_url: string;
  cancel_url: string;
  line_items: [...];
  metadata: { bookingId, ... };
  // Added by Stripe Extension:
  url?: string;            // Stripe checkout URL
  sessionId?: string;
  error?: { message: string };
}
```

---

## 5. Status System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        STATUS FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [1] pending ──► [2] confirmed ──► [3] driver_assigned         │
│        │              │                    │                     │
│        │              │                    ▼                     │
│        │              │         [4] driver_en_route              │
│        │              │                    │                     │
│        │              │                    ▼                     │
│        │              │           [5] in_progress                │
│        │              │                    │                     │
│        │              │                    ▼                     │
│        │              │            [6] completed                 │
│        │              │                                          │
│        ▼              ▼                                          │
│   [cancelled]    [cancelled]                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Status Labels (Thai)
| Status | Thai | Admin Action |
|--------|------|--------------|
| pending | รอยืนยัน | กดปุ่ม "ยืนยัน" |
| confirmed | ยืนยันแล้ว | กดปุ่ม "มอบหมายคนขับ" |
| driver_assigned | มอบหมายคนขับแล้ว | กดปุ่ม "คนขับออกเดินทาง" |
| driver_en_route | คนขับกำลังมา | กดปุ่ม "เริ่มเดินทาง" |
| in_progress | กำลังเดินทาง | กดปุ่ม "เสร็จสิ้น" |
| completed | เสร็จสิ้น | - |
| cancelled | ยกเลิก | - |

---

## 6. Key Patterns & Conventions

### Language Support
```typescript
// Always use language conditional for hardcoded text
{language === 'th' ? 'ข้อความภาษาไทย' : 'English text'}

// Or use translation object
{t.home.booking.pickupLocation}
```

### Firestore Operations
```typescript
// All Firestore operations are in lib/firebase/firestore.ts
import { FirestoreService } from '@/lib/firebase/firestore';

// Examples:
await FirestoreService.addBooking(data);
await FirestoreService.updateBookingStatus(id, status);
await FirestoreService.getBookings(userId);
await FirestoreService.hasActiveBooking(userId);  // Check if user has active booking
```

### Booking Context
```typescript
// Get locations, routes, and booking data
const { bookingData, updateBooking, locations, routes } = useBooking();
```

---

## 7. Important Fixes & Solutions

### Issue 1: Locations Not Showing in Modal
**Problem:** Location modal shows empty if no routes in Firestore
**Solution:** Modified `getFilteredLocations()` to show all locations if routes are empty or filtering returns empty
**File:** `components/booking/BookingForm.tsx`

### Issue 2: Customer Can Book Multiple Times
**Problem:** Customer could create multiple active bookings, causing UPCOMING TRIP conflicts
**Solution:** Added `hasActiveBooking()` check in payment page - blocks new booking if active booking exists
**File:** `lib/firebase/firestore.ts`, `app/payment/page.tsx`

### Issue 3: Status Not Updating Properly
**Problem:** Bookings created with wrong default status
**Solution:** Changed default status to `pending` (was incorrectly `confirmed`)
**File:** `lib/firebase/firestore.ts` - `addBooking()`

### Issue 4: Mobile Admin Skipping Steps
**Problem:** Mobile view had "Complete" button that skipped intermediate status steps
**Solution:** Added step-by-step action buttons for each status
**File:** `app/admin/bookings/page.tsx`

### Issue 5: UPCOMING TRIP Position on Mobile
**Problem:** UPCOMING TRIP card was at bottom, hard to see
**Solution:** Moved to top of page on mobile (after profile card)
**File:** `app/dashboard/page.tsx`

---

## 8. Stripe Integration

### Flow
1. User clicks "Pay with Card" on payment page
2. `StripeService.createCheckoutSession()` creates doc in `customers/{uid}/checkout_sessions`
3. Firebase Extension creates Stripe session and adds `url` to doc
4. User redirected to Stripe Checkout
5. On success → `/payment/success?session_id=xxx&booking_id=xxx`
6. Success page calls `StripeService.updateBookingPaymentSuccess()`

### Required Firestore Rules
```javascript
match /customers/{uid}/checkout_sessions/{id} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /customers/{uid}/payments/{id} {
  allow read: if request.auth != null && request.auth.uid == uid;
}
```

---

## 9. Admin Features

### Admin Email (Hardcoded)
```typescript
// Check in multiple files:
user.email === 'phiopan@gmail.com'
```

### Admin Bookings Page Features
- Filter by status tabs (all, pending, confirmed, etc.)
- Status dropdown to change status
- Payment status dropdown
- Driver assignment modal
- Desktop: Table view with all actions
- Mobile: Card view with step-by-step action buttons

---

## 10. Deployment

```bash
# Build
npm run build

# Deploy to Vercel
vercel --prod

# Live URL
https://car-rental-phi-lime.vercel.app
```

---

## 11. Quick Reference for Sub-Agents

### Before Making Changes:
1. **Read this file first** to understand project structure
2. **Check existing patterns** - don't create new ones unnecessarily
3. **Language support** - always use Thai/English conditional
4. **Status flow** - follow the exact order (pending → confirmed → driver_assigned → ...)
5. **Test on mobile** - many users use mobile

### Common Tasks:
- **Add new field to booking:** Update interface in `BookingContext.tsx`, add to `firestore.ts`
- **Add new status:** Update `BOOKING_STATUSES` in admin, `STATUS_CONFIG` in dashboard
- **Add new location:** Via Admin `/admin/locations` or directly in Firestore
- **Add new route:** Via Admin `/admin/routes`

### Files to Check First:
- `lib/firebase/firestore.ts` - All database operations
- `lib/contexts/BookingContext.tsx` - Booking state & data
- `app/admin/bookings/page.tsx` - Admin booking management
- `app/dashboard/page.tsx` - Customer dashboard

---

## 12. Known Limitations

1. **Single Active Booking:** Customer can only have 1 active booking at a time
2. **Fixed Time Slots:** Time picker shows 06:00-23:00 only
3. **30 Day Limit:** Date picker shows next 30 days only
4. **No Refund Flow:** Refund must be done manually via Stripe dashboard

---

*This document should be updated whenever significant changes are made to the project.*
