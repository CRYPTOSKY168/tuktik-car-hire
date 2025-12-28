# TukTik Car Hire - Design Brief for Google Gemini

## Project Overview
**Service**: Long-distance car hire service with professional drivers in Thailand
**Target Market**: Tourists (Thai and international) traveling long distances (200-400km)
**Primary Routes**: Bangkok ↔ Hua Hin, Suvarnabhumi Airport ↔ Koh Chang, Bangkok ↔ Chiang Mai
**Core Business**: NOT traditional car rental - this is a premium car hire service with professional drivers (similar to ride-hailing but for long distances)

---

## Brand Identity Requirements

### Brand Name
**TukTik** (ตุ๊กติ๊ก)

### Brand Personality
- **Professional & Trustworthy**: Travelers are entrusting us with long-distance journeys
- **Comfortable & Reliable**: Focus on safe, comfortable travel experience
- **Thai Culture-Infused**: Incorporate subtle Thai design elements without being cliché
- **Modern & Tech-Forward**: Clean, contemporary design that appeals to digital-savvy tourists
- **Welcoming & Friendly**: Approachable brand that makes booking easy

### Target Audience
1. **International Tourists** (40%): Aged 25-55, seeking comfortable inter-city travel
2. **Thai Families** (35%): Weekend trips, family vacations to provinces
3. **Business Travelers** (15%): Airport transfers, business trips to other cities
4. **Groups & Friends** (10%): Group tours, events, celebrations

---

## Visual Design Requirements

### Color Palette
**PRIMARY COLORS**: Please design a sophisticated color palette that:
- Evokes trust, safety, and professionalism
- Works well for transportation/travel industry
- Has good contrast for accessibility
- Includes both light and dark theme versions
- Feels modern but not too corporate

**SUGGESTIONS** (but feel free to propose better):
- Primary: Professional blue or teal (trustworthy, travel-related)
- Secondary: Warm accent (Thai gold/orange or sunset tones)
- Neutral: Modern grays for text and backgrounds
- Success: Green (for confirmations)
- Alert: Amber/orange (for important info)

**AVOID**:
- Overly bright/neon colors
- Colors that feel cheap or unprofessional
- Pure black backgrounds (prefer dark navy/charcoal)

### Typography
**PRIMARY FONT**: Modern, clean sans-serif font family that:
- Works well in both Thai and English
- Has excellent readability on mobile devices
- Supports multiple weights (Regular, Medium, SemiBold, Bold)
- Feels professional yet approachable

**FONT PAIRING**:
- Headings: Bold, attention-grabbing but not overpowering
- Body: Highly readable, comfortable for longer text
- UI Elements: Clear, crisp for buttons and labels

**THAI FONT CONSIDERATIONS**:
- Must support Thai characters beautifully
- Consider popular web fonts: Noto Sans Thai, Prompt, Sarabun, or Kanit
- Ensure Thai text doesn't look cramped or awkward

---

## Component Design Specifications

### 1. Hero Section (Homepage)
**REQUIREMENTS**:
- Large, inspiring hero section with background image/video
- Clear headline: "Long-Distance Travel Made Easy"
- Prominent booking widget/search form
- Trust indicators (customer count, routes served, years in business)
- Language switcher (Thai/English) highly visible

**DESIGN ELEMENTS NEEDED**:
- Background treatment (image overlay, gradient, or video)
- Booking form styling (modern, user-friendly)
- Call-to-action button design
- Trust badges/statistics presentation

### 2. Vehicle Cards
**CURRENT ISSUES**: Generic SVG placeholder icons
**REQUIREMENTS**:
- Beautiful vehicle card design with:
  - Image placeholder area (will have actual vehicle photos later)
  - Vehicle type badge (Sedan, Van, SUV, Luxury)
  - Clear pricing display (price per trip)
  - "Driver Included" indicator (prominent)
  - Vehicle specs icons (passengers, luggage, transmission)
  - Feature tags/badges
  - Hover effects (subtle, professional)

**DESIGN DETAILS**:
- Card shadow and border treatments
- Icon design for vehicle specs
- Badge designs for vehicle types
- Hover/active states

### 3. Navigation Header
**REQUIREMENTS**:
- Sticky/fixed header on scroll
- Logo area (TukTik branding)
- Main navigation: Home, Vehicles, Routes, About, Contact
- Language switcher (EN/TH)
- "Book Now" CTA button
- Mobile hamburger menu design
- Responsive behavior

**DESIGN DETAILS**:
- Header background (transparent on hero, solid on scroll)
- Logo design concept
- Navigation hover states
- Mobile menu animation/transition

### 4. Booking Flow Components

#### A. Route Selection Form
- Location dropdowns (From → To)
- Date picker (Thai Buddhist calendar support)
- Time picker
- Trip type selector (One-Way vs Round-Trip)
- Visual route indicators (icons, arrows)

#### B. Booking Summary Sidebar
- Sticky sidebar design
- Collapsible sections:
  - Vehicle details
  - Trip details
  - Price breakdown
  - Add-ons
- Price calculation display
- "Driver Included" notice box

#### C. Payment Form
- Personal information fields
- Add-ons checkboxes (Insurance, Extra Luggage)
- Payment method selector:
  - Credit/Debit Card
  - PromptPay (Thai mobile banking)
- Form validation states (error, success)
- Loading/processing states

#### D. Confirmation Page
- Success celebration design
- Booking number display (large, prominent)
- Trip summary card
- "What's Next" steps (numbered list)
- Email confirmation notice
- Print voucher button
- Back to home button

### 5. Footer
**REQUIREMENTS**:
- Multi-column layout
- Company info, Quick Links, Contact, Social Media
- Trust indicators (licenses, certifications)
- Newsletter signup (optional)
- Copyright and legal links

---

## UI Patterns & Design System

### Buttons
**NEEDED**:
1. **Primary Button**: Main CTAs (Book Now, Continue, Confirm)
2. **Secondary Button**: Alternative actions (Back, Cancel)
3. **Outline Button**: Tertiary actions (Print, Share)
4. **Sizes**: Small, Medium, Large
5. **States**: Default, Hover, Active, Disabled, Loading

### Form Elements
**NEEDED**:
1. **Text Inputs**: Standard, with icons, with validation
2. **Select Dropdowns**: Custom styled (not browser default)
3. **Date Picker**: Custom calendar design
4. **Time Picker**: Custom time selection
5. **Radio Buttons**: Custom styled (e.g., trip type selector)
6. **Checkboxes**: Custom styled (e.g., add-ons)
7. **States**: Focus, Error, Success, Disabled

### Cards
**NEEDED**:
1. **Vehicle Card**: Image, info, pricing, CTA
2. **Route Card**: Popular routes quick-select
3. **Info Card**: Service features, benefits
4. **Summary Card**: Booking summary sidebar
5. **Notice Card**: Important information boxes

### Icons
**NEEDED** (suggest icon style: line, filled, or duotone):
1. **Navigation**: Home, Vehicles, Routes, User, Menu
2. **Vehicle Specs**: Passengers, Luggage, Transmission, GPS
3. **Trip Flow**: Pickup, Dropoff, Calendar, Clock
4. **Payment**: Credit Card, PromptPay, Security
5. **UI**: Arrow, Checkmark, Close, Info, Warning
6. **Features**: AC, GPS, Driver, Insurance, Fuel

### Spacing & Layout
**GRID SYSTEM**:
- Desktop: 12-column grid, max-width container (1280px or 1440px)
- Tablet: 8-column grid
- Mobile: 4-column grid
- Gutters: Consistent spacing scale

**SPACING SCALE**: Suggest a consistent spacing system (e.g., 4px base)

---

## Page-Specific Design Needs

### 1. Homepage (`/`)
- Hero section with booking form
- Featured vehicles (3-4 cards)
- Popular routes section
- "Why Choose Us" benefits grid
- Customer testimonials (design needed)
- Footer

### 2. Vehicles Page (`/vehicles`)
- Filter sidebar (vehicle type, passengers, price range)
- Vehicle grid/list view
- Sort options
- Empty state (no results)

### 3. Routes Page (`/routes`)
- Route selection form
- Popular routes quick-select cards
- Route distance/duration info
- Booking summary sidebar

### 4. Payment Page (`/payment`)
- Personal information form
- Add-ons selection cards
- Payment method selection (radio cards)
- Booking summary sidebar
- Trust badges/security indicators

### 5. Confirmation Page (`/confirmation`)
- Success celebration design
- Booking details card
- What's next steps
- Action buttons (Print, Home)

---

## Responsive Design Requirements

### Breakpoints
- **Mobile**: 320px - 767px (primary focus)
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px and above

### Mobile-First Considerations
- Touch-friendly button sizes (min 44px × 44px)
- Simplified navigation (hamburger menu)
- Collapsible sections
- Bottom navigation for key actions (optional)
- Sticky booking summary (mobile)

---

## Accessibility Requirements
- WCAG 2.1 AA compliance
- Color contrast ratios: 4.5:1 for text, 3:1 for large text
- Focus indicators for keyboard navigation
- Screen reader friendly
- Reduced motion support

---

## Animation & Microinteractions
**NEEDED**:
- Button hover effects
- Card hover effects
- Page transitions (subtle)
- Form validation feedback
- Loading states (spinners, skeletons)
- Success/error animations
- Scroll animations (optional, tasteful)

**STYLE**: Smooth, professional, not distracting

---

## Thai Cultural Elements (Subtle Integration)
**SUGGESTIONS**:
- Color inspiration from Thai sunsets, beaches, temples
- Patterns: Subtle Thai geometric patterns in backgrounds (very subtle)
- Icons: Consider Thai-inspired icon variations
- Typography: Beautiful Thai script presentation
- Imagery: Beach, mountains, temples, modern Bangkok

**BALANCE**: Modern and international, with subtle Thai touches (not overwhelming)

---

## Technical Constraints
- **Framework**: Next.js 16.1.1 with React 19, TypeScript
- **Styling**: Tailwind CSS (utility-first)
- **Design Delivery Format Needed**:
  - Color palette (hex codes)
  - Typography scale (font names, sizes, weights, line heights)
  - Spacing scale
  - Component designs (detailed specifications)
  - Figma file or detailed style guide (if possible)

---

## Deliverables Requested from Google Gemini

### 1. Brand Identity
- [ ] Logo concept/direction
- [ ] Color palette (primary, secondary, neutrals, semantic colors)
- [ ] Typography system (font pairings, scale)

### 2. Component Library
- [ ] Button variations and states
- [ ] Form elements (inputs, selects, checkboxes, radio buttons)
- [ ] Card designs (vehicle, route, info, summary)
- [ ] Navigation header (desktop & mobile)
- [ ] Footer design
- [ ] Icon style direction

### 3. Page Layouts
- [ ] Homepage layout
- [ ] Vehicles page layout
- [ ] Routes page layout
- [ ] Payment page layout
- [ ] Confirmation page layout

### 4. Design System Documentation
- [ ] Spacing scale
- [ ] Color usage guidelines
- [ ] Typography usage guidelines
- [ ] Component usage guidelines

### 5. Responsive Behavior
- [ ] Mobile layouts for key pages
- [ ] Tablet considerations
- [ ] Breakpoint strategy

---

## Current Design Issues to Address

### Problems with Current Design:
1. **Generic appearance**: Looks like a basic template, not unique
2. **Vehicle cards**: Using SVG placeholders instead of inspiring visuals
3. **Color scheme**: Basic blue/gray, not distinctive
4. **Typography**: Standard system fonts, not branded
5. **Spacing**: Inconsistent padding and margins
6. **Forms**: Basic browser styling, not polished
7. **No unique Thai identity**: Could be any car service anywhere

### Goals for New Design:
1. **Memorable brand identity**: Distinctive Thai car hire service
2. **Professional polish**: Every detail refined
3. **User-friendly**: Especially for tourists (clear, simple)
4. **Mobile-optimized**: Most bookings will be on mobile
5. **Trustworthy**: High-end appearance inspires confidence
6. **Conversion-focused**: Design that encourages bookings

---

## Questions for Google Gemini to Answer

When designing, please provide rationale for:
1. **Color choices**: Why this palette works for car hire service
2. **Typography choices**: Why these fonts work for Thai/English
3. **Layout approach**: Why this structure serves the user journey
4. **Component styling**: How it enhances usability
5. **Thai cultural elements**: How they're integrated subtly

---

## Additional Context

**Website URL**: https://car-rental-phi-lime.vercel.app
**GitHub**: https://github.com/CRYPTOSKY168/tuktik-car-hire
**Tech Stack**: Next.js, TypeScript, Tailwind CSS
**Current State**: Functional but needs professional design polish

**Inspiration** (general direction, NOT to copy):
- Klook (booking flow simplicity)
- Airbnb (clean cards, trust indicators)
- Grab/Uber (familiar ride-booking UX)
- Thai Airways (subtle Thai sophistication)

---

## Design Philosophy Summary

**Core Principles**:
1. **Clarity over cleverness**: Users should book quickly without confusion
2. **Trust through polish**: Every pixel matters for building confidence
3. **Mobile-first**: But beautiful on all devices
4. **Thai soul, global appeal**: Locally rooted, internationally accessible
5. **Conversion-focused**: Beautiful design that drives bookings

---

## Next Steps After Design Delivery

Once you provide the design system, we will:
1. Implement new color palette in Tailwind config
2. Add custom fonts and typography scale
3. Rebuild components with new styling
4. Add animations and microinteractions
5. Implement responsive layouts
6. Add actual vehicle photos
7. Polish every detail

**Thank you for helping TukTik become a world-class car hire service!**
