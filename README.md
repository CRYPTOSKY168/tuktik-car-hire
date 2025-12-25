# TukTik Car Rental - Complete Booking Website

A modern, fully responsive car rental booking website built with Next.js, React, TypeScript, and Tailwind CSS. Designed specifically for Thai tourists with bilingual support (Thai/English).

## Features

### Multi-Language Support
- **Thai & English**: Complete bilingual interface with easy language switching
- Automatic language preference saving using localStorage

### Complete Booking Flow
1. **Home Page**: Hero section with instant booking form
2. **Vehicle Selection**: Browse and filter available vehicles
3. **Route Selection**: Choose pickup/drop-off locations and dates
4. **Payment**: Secure payment with multiple options (Credit Card, PromptPay)
5. **Confirmation**: Detailed booking confirmation with printable voucher

### User Features
- **Responsive Design**: Mobile-first approach, works on all devices
- **Real-time Price Calculation**: Dynamic pricing based on duration and add-ons
- **Vehicle Filters**: Filter by type, price, capacity, and transmission
- **Popular Routes**: Quick-select commonly traveled routes
- **Add-ons**: Optional insurance and additional driver
- **Booking Summary**: Persistent summary throughout the booking process

### Technical Features
- **Next.js 15**: App Router with server and client components
- **TypeScript**: Full type safety
- **Tailwind CSS**: Modern, utility-first styling
- **Context API**: Global state management for booking and language
- **Responsive Design**: Mobile, tablet, and desktop optimized
- **SEO Optimized**: Proper meta tags and semantic HTML

## Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Icons**: Heroicons (SVG)
- **Font**: Inter (Google Fonts)

## Project Structure

```
car-rental/
├── app/
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Home page
│   ├── vehicles/
│   │   └── page.tsx              # Vehicle selection page
│   ├── routes/
│   │   └── page.tsx              # Route selection page
│   ├── payment/
│   │   └── page.tsx              # Payment page
│   └── confirmation/
│       └── page.tsx              # Booking confirmation page
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # Navigation header
│   │   └── Footer.tsx            # Footer
│   ├── ui/
│   │   ├── Button.tsx            # Reusable button component
│   │   └── VehicleCard.tsx       # Vehicle display card
│   └── booking/
│       ├── BookingForm.tsx       # Initial booking form
│       └── BookingSummary.tsx    # Booking summary sidebar
├── lib/
│   ├── contexts/
│   │   ├── LanguageContext.tsx   # Language switching context
│   │   └── BookingContext.tsx    # Booking state management
│   ├── i18n/
│   │   └── translations.ts       # All translations (TH/EN)
│   └── data/
│       ├── vehicles.ts           # Vehicle data
│       └── locations.ts          # Location data
└── public/
    └── images/
        └── vehicles/             # Vehicle images
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Navigate to project directory**
   ```bash
   cd car-rental
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Pages Overview

### 1. Home Page (`/`)
- Hero section with compelling CTA
- Booking form with location, date, and time selection
- Features section highlighting benefits
- Contact section

### 2. Vehicles Page (`/vehicles`)
- Grid of available vehicles
- Advanced filtering (type, price, capacity, transmission)
- Vehicle cards with specs and pricing
- Direct vehicle selection

### 3. Routes Page (`/routes`)
- Pickup/drop-off location selection
- Date and time picker
- Same location return option
- Popular routes quick-select
- Booking summary sidebar

### 4. Payment Page (`/payment`)
- Personal information form
- Add-ons (insurance, additional driver)
- Multiple payment methods (Credit Card, PromptPay)
- Terms and conditions
- Live price updates

### 5. Confirmation Page (`/confirmation`)
- Booking confirmation with unique booking number
- Complete trip details
- Customer and vehicle information
- Price breakdown
- Next steps guide
- Printable voucher

## Customization

### Adding New Vehicles

Edit `/lib/data/vehicles.ts`:

```typescript
{
  id: 'unique-id',
  name: 'Vehicle Name',
  type: 'sedan' | 'suv' | 'van' | 'luxury',
  price: 1500,
  image: '/images/vehicles/image.jpg',
  passengers: 5,
  luggage: 3,
  transmission: 'automatic' | 'manual',
  features: ['Feature 1', 'Feature 2'],
}
```

### Adding New Locations

Edit `/lib/data/locations.ts`:

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

### Translations

Edit `/lib/i18n/translations.ts` to add or modify translations:

```typescript
export const translations = {
  en: {
    // English translations
  },
  th: {
    // Thai translations
  },
};
```

## Styling

The project uses Tailwind CSS for styling. Key color scheme:

- **Primary**: Blue (600-900)
- **Success**: Green
- **Warning**: Orange
- **Error**: Red
- **Neutral**: Gray scale

Modify `tailwind.config.ts` to customize the theme.

## State Management

### Booking Context
Manages all booking-related state:
- Vehicle selection
- Route details (pickup/drop-off, dates, times)
- Personal information
- Add-ons (insurance, driver)
- Price calculation

### Language Context
Manages language preference:
- Current language (th/en)
- Language switching
- Persistent storage

## Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Enhancements

Potential features for future development:
- Backend API integration
- Real payment gateway integration
- User authentication and profile
- Booking history
- Admin dashboard
- Live chat support
- Email notifications
- Multi-currency support
- GPS integration for location services
- Vehicle availability calendar
- Customer reviews and ratings

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Support

For questions or issues, contact: info@tuktik.com

---

Built with care for Thai tourists exploring Thailand
