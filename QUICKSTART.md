# Quick Start Guide

Get your TukTik Car Rental website up and running in minutes!

## Installation

```bash
# Navigate to the project
cd car-rental

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

## Access the Website

Open your browser and visit: **http://localhost:3000**

## Test the Booking Flow

### Step 1: Home Page
1. Select pickup location (e.g., "Suvarnabhumi Airport")
2. Select drop-off location (e.g., "Pattaya")
3. Choose pickup date and time
4. Choose return date and time
5. Click "Search Vehicles" (Thai: "ค้นหารถยนต์")

### Step 2: Vehicle Selection
1. Browse available vehicles
2. Use filters (optional):
   - Vehicle type (Sedan, SUV, Van, Luxury)
   - Price range slider
   - Passenger capacity
   - Transmission type
3. Click "Select Vehicle" on your preferred car

### Step 3: Route Confirmation
1. Review/modify pickup and drop-off locations
2. Adjust dates and times if needed
3. Try "Popular Routes" for quick selection
4. Check the "Return to same location" option if applicable
5. Click "Continue" (Thai: "ดำเนินการต่อ")

### Step 4: Payment
1. Fill in personal information:
   - First Name
   - Last Name
   - Email
   - Phone Number
2. Select add-ons (optional):
   - Insurance (฿200/day)
   - Additional Driver (฿500/day)
3. Choose payment method:
   - Credit/Debit Card
   - PromptPay
4. Agree to terms and conditions
5. Click "Complete Booking" (Thai: "ยืนยันการจอง")

### Step 5: Confirmation
1. View your booking number
2. Check confirmation email (simulated)
3. Print voucher (optional)
4. Review next steps

## Language Switching

Toggle between Thai and English:
- Click **TH** or **EN** buttons in the header
- Your preference is saved automatically

## Features to Explore

### Responsive Design
- Resize your browser window
- Test on mobile devices
- Check tablet view

### Filtering System
On the Vehicles page, try:
- Adjusting price range
- Filtering by vehicle type
- Selecting passenger capacity
- Choosing transmission type

### Booking Summary
- Always visible during booking process
- Real-time price updates
- Shows all selected options

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## What's Included

Pages:
- Home (`/`)
- Vehicles (`/vehicles`)
- Routes (`/routes`)
- Payment (`/payment`)
- Confirmation (`/confirmation`)

## Default Test Data

### Locations (15 total)
- **Airports**: Suvarnabhumi (BKK), Don Mueang (DMK), Chiang Mai (CNX), Phuket (HKT), Samui (USM)
- **Cities**: Bangkok, Pattaya, Chiang Mai, Phuket Town, Patong Beach
- **Provinces**: Krabi, Hua Hin, Ayutthaya, Chiang Rai, Koh Samui

### Vehicles (12 total)
- **Sedans**: Honda City (฿900), Toyota Camry (฿1,200), Honda Accord (฿1,300)
- **SUVs**: Mazda CX-5 (฿1,800), Honda CR-V (฿1,900), Toyota Fortuner (฿2,000), Mitsubishi Pajero (฿2,200)
- **Vans**: Hyundai H1 (฿2,300), Toyota Commuter (฿2,500)
- **Luxury**: Mercedes E-Class (฿3,500), Audi A6 (฿3,600), BMW 5 Series (฿3,800)

## Customization

Want to add your own data?

### Add Vehicles
Edit `/lib/data/vehicles.ts`

### Add Locations
Edit `/lib/data/locations.ts`

### Modify Translations
Edit `/lib/i18n/translations.ts`

## Support

Need help? Check the main README.md for detailed documentation.

---

Happy Testing! 🚗
