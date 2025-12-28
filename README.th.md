# TukTik Car Rental - ระบบจองรถเช่าครบวงจร

> ภาษาไทย | **[Read in English](README.md)**

ระบบเว็บไซต์จองรถเช่าที่ทันสมัย รองรับทุกอุปกรณ์ พัฒนาด้วย Next.js, React, TypeScript และ Tailwind CSS ออกแบบมาเพื่อนักท่องเที่ยว รองรับ 2 ภาษา (ไทย/อังกฤษ)

## คุณสมบัติหลัก

### รองรับหลายภาษา
- **ไทย & อังกฤษ**: อินเทอร์เฟซ 2 ภาษา สลับได้ง่าย
- บันทึกภาษาที่เลือกอัตโนมัติ

### ขั้นตอนการจองครบถ้วน
1. **หน้าแรก**: แบบฟอร์มจองรถทันที
2. **เลือกรถ**: ดูและกรองรถที่มี
3. **เลือกเส้นทาง**: เลือกจุดรับ-ส่ง และวันที่
4. **ชำระเงิน**: หลายช่องทาง (บัตรเครดิต, พร้อมเพย์)
5. **ยืนยัน**: ใบยืนยันการจองพร้อมพิมพ์

### ฟีเจอร์สำหรับผู้ใช้
- **Responsive Design**: ใช้งานได้ทุกอุปกรณ์
- **คำนวณราคาแบบเรียลไทม์**: ราคาอัปเดตตามระยะเวลาและส่วนเสริม
- **กรองรถยนต์**: กรองตามประเภท ราคา จำนวนผู้โดยสาร เกียร์
- **เส้นทางยอดนิยม**: เลือกเส้นทางที่นิยมได้รวดเร็ว
- **ส่วนเสริม**: ประกัน และคนขับเพิ่มเติม
- **สรุปการจอง**: แสดงสรุปตลอดขั้นตอน

### ฟีเจอร์ทางเทคนิค
- **Next.js 15**: App Router พร้อม Server และ Client Components
- **TypeScript**: Type Safety เต็มรูปแบบ
- **Tailwind CSS**: สไตล์ทันสมัย
- **Context API**: จัดการ State สำหรับการจองและภาษา
- **SEO Optimized**: Meta tags และ Semantic HTML

## เทคโนโลยีที่ใช้

- **Framework**: Next.js 15 (React 19)
- **ภาษา**: TypeScript
- **สไตล์**: Tailwind CSS
- **State Management**: React Context API
- **ไอคอน**: Heroicons (SVG)
- **ฟอนต์**: Inter (Google Fonts)

## โครงสร้างโปรเจกต์

```
car-rental/
├── app/
│   ├── layout.tsx                 # Layout หลัก
│   ├── page.tsx                   # หน้าแรก
│   ├── vehicles/
│   │   └── page.tsx              # หน้าเลือกรถ
│   ├── routes/
│   │   └── page.tsx              # หน้าเลือกเส้นทาง
│   ├── payment/
│   │   └── page.tsx              # หน้าชำระเงิน
│   └── confirmation/
│       └── page.tsx              # หน้ายืนยันการจอง
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # ส่วนหัว
│   │   └── Footer.tsx            # ส่วนท้าย
│   ├── ui/
│   │   ├── Button.tsx            # ปุ่ม
│   │   └── VehicleCard.tsx       # การ์ดรถยนต์
│   └── booking/
│       ├── BookingForm.tsx       # แบบฟอร์มจอง
│       └── BookingSummary.tsx    # สรุปการจอง
├── lib/
│   ├── contexts/
│   │   ├── LanguageContext.tsx   # จัดการภาษา
│   │   └── BookingContext.tsx    # จัดการการจอง
│   ├── i18n/
│   │   └── translations.ts       # คำแปล (ไทย/อังกฤษ)
│   └── data/
│       ├── vehicles.ts           # ข้อมูลรถยนต์
│       └── locations.ts          # ข้อมูลสถานที่
└── public/
    └── images/
        └── vehicles/             # รูปรถยนต์
```

## เริ่มต้นใช้งาน

### สิ่งที่ต้องมี
- Node.js 18+
- npm หรือ yarn

### การติดตั้ง

1. **เข้าไปยังโฟลเดอร์โปรเจกต์**
   ```bash
   cd car-rental
   ```

2. **ติดตั้ง dependencies**
   ```bash
   npm install
   ```

3. **รัน development server**
   ```bash
   npm run dev
   ```

4. **เปิดในเบราว์เซอร์**
   ```
   http://localhost:3000
   ```

### Build สำหรับ Production

```bash
# Build แอปพลิเคชัน
npm run build

# รัน production server
npm start
```

## คำสั่งที่ใช้ได้

- `npm run dev` - รัน development server
- `npm run build` - Build สำหรับ production
- `npm start` - รัน production server
- `npm run lint` - ตรวจสอบโค้ดด้วย ESLint

## รายละเอียดแต่ละหน้า

### 1. หน้าแรก (`/`)
- ส่วน Hero พร้อมปุ่ม CTA
- แบบฟอร์มจองพร้อมเลือกสถานที่ วันที่ เวลา
- ส่วนแสดงจุดเด่น
- ส่วนติดต่อ

### 2. หน้าเลือกรถ (`/vehicles`)
- แสดงรถที่มีแบบ Grid
- กรองขั้นสูง (ประเภท ราคา จำนวนผู้โดยสาร เกียร์)
- การ์ดรถพร้อมสเปคและราคา
- เลือกรถได้ทันที

### 3. หน้าเส้นทาง (`/routes`)
- เลือกจุดรับ-ส่ง
- เลือกวันที่และเวลา
- ตัวเลือกคืนรถที่เดิม
- เส้นทางยอดนิยม
- สรุปการจองด้านข้าง

### 4. หน้าชำระเงิน (`/payment`)
- แบบฟอร์มข้อมูลส่วนตัว
- ส่วนเสริม (ประกัน, คนขับเพิ่ม)
- หลายช่องทางชำระเงิน (บัตรเครดิต, พร้อมเพย์)
- ข้อกำหนดและเงื่อนไข
- อัปเดตราคาแบบเรียลไทม์

### 5. หน้ายืนยัน (`/confirmation`)
- ยืนยันการจองพร้อมหมายเลขจอง
- รายละเอียดการเดินทาง
- ข้อมูลลูกค้าและรถยนต์
- สรุปราคา
- ขั้นตอนถัดไป
- พิมพ์ใบยืนยันได้

## การปรับแต่ง

### เพิ่มรถยนต์ใหม่

แก้ไขไฟล์ `/lib/data/vehicles.ts`:

```typescript
{
  id: 'unique-id',
  name: 'ชื่อรถ',
  type: 'sedan' | 'suv' | 'van' | 'luxury',
  price: 1500,
  image: '/images/vehicles/image.jpg',
  passengers: 5,
  luggage: 3,
  transmission: 'automatic' | 'manual',
  features: ['ฟีเจอร์ 1', 'ฟีเจอร์ 2'],
}
```

### เพิ่มสถานที่ใหม่

แก้ไขไฟล์ `/lib/data/locations.ts`:

```typescript
{
  id: 'location-id',
  name: {
    en: 'English Name',
    th: 'ชื่อไทย'
  },
  type: 'airport' | 'city' | 'province',
}
```

### แก้ไขคำแปล

แก้ไขไฟล์ `/lib/i18n/translations.ts`:

```typescript
export const translations = {
  en: {
    // คำแปลภาษาอังกฤษ
  },
  th: {
    // คำแปลภาษาไทย
  },
};
```

## สไตล์

โปรเจกต์ใช้ Tailwind CSS สำหรับสไตล์ โทนสีหลัก:

- **หลัก**: น้ำเงิน (600-900)
- **สำเร็จ**: เขียว
- **เตือน**: ส้ม
- **ผิดพลาด**: แดง
- **ปกติ**: เทา

แก้ไข `tailwind.config.ts` เพื่อปรับแต่งธีม

## การจัดการ State

### Booking Context
จัดการ state ที่เกี่ยวกับการจอง:
- การเลือกรถ
- รายละเอียดเส้นทาง (จุดรับ-ส่ง, วันที่, เวลา)
- ข้อมูลส่วนตัว
- ส่วนเสริม (ประกัน, คนขับ)
- คำนวณราคา

### Language Context
จัดการภาษา:
- ภาษาปัจจุบัน (th/en)
- สลับภาษา
- บันทึกการตั้งค่า

## Responsive Breakpoints

- **มือถือ**: < 768px
- **แท็บเล็ต**: 768px - 1024px
- **เดสก์ท็อป**: > 1024px

## เบราว์เซอร์ที่รองรับ

- Chrome (เวอร์ชันล่าสุด)
- Firefox (เวอร์ชันล่าสุด)
- Safari (เวอร์ชันล่าสุด)
- Edge (เวอร์ชันล่าสุด)

## ฟีเจอร์ในอนาคต

ฟีเจอร์ที่อาจพัฒนาเพิ่มเติม:
- เชื่อมต่อ Backend API
- Payment Gateway จริง
- ระบบสมาชิกและโปรไฟล์
- ประวัติการจอง
- แดชบอร์ดผู้ดูแล
- แชทสด
- แจ้งเตือนอีเมล
- รองรับหลายสกุลเงิน
- GPS สำหรับบริการสถานที่
- ปฏิทินรถว่าง
- รีวิวและให้คะแนน

## Deploy บน Vercel

วิธีง่ายที่สุดในการ deploy คือใช้ [Vercel Platform](https://vercel.com)

ดูเพิ่มเติมที่ [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)

## ติดต่อ

หากมีคำถามหรือปัญหา ติดต่อ: info@tuktik.com

---

พัฒนาด้วยใจ สำหรับนักท่องเที่ยวในประเทศไทย
