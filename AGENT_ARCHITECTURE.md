# TukTik Car Hire - Sub-Agent Architecture Plan

## Overview
This document outlines the specialized sub-agent architecture for implementing the new design system from Google Gemini. Each agent will work independently on specific aspects of the design implementation to ensure clean, organized, and efficient execution.

---

## Agent Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                       │
│              (Coordinates all sub-agents)                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│ THEME AGENT  │      │COMPONENT AGNT│     │ LAYOUT AGENT │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│TYPOGRAPHY AG.│      │  ICON AGENT  │     │  PAGE AGENT  │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│ANIMATION AG. │      │  IMAGE AGENT │     │   QA AGENT   │
└──────────────┘      └──────────────┘     └──────────────┘
```

---

## Agent Specifications

### 1. THEME AGENT
**Responsibility**: Implement core design system foundation

**Specific Tasks**:
- [ ] Update Tailwind config with new color palette
- [ ] Define color variables (CSS custom properties)
- [ ] Set up dark mode variants (if provided)
- [ ] Configure semantic color tokens (primary, secondary, success, error, warning)
- [ ] Create utility classes for brand colors
- [ ] Set up spacing scale
- [ ] Configure border radius scale
- [ ] Set up shadow scale
- [ ] Configure breakpoints (if different from default)

**Files to Modify**:
- `tailwind.config.ts`
- `app/globals.css`
- (potentially) `lib/theme/colors.ts` (new file)
- (potentially) `lib/theme/config.ts` (new file)

**Input Required from Design**:
- Color palette (hex/rgb values)
- Spacing scale
- Shadow definitions
- Border radius values

**Output**:
- Fully configured Tailwind theme
- CSS variables for dynamic theming
- Theme configuration documentation

---

### 2. TYPOGRAPHY AGENT
**Responsibility**: Implement typography system

**Specific Tasks**:
- [ ] Add custom fonts (Google Fonts or local)
- [ ] Configure font families in Tailwind
- [ ] Set up font size scale
- [ ] Configure font weights
- [ ] Set line height scale
- [ ] Configure letter spacing
- [ ] Create typography utility classes
- [ ] Set up Thai font support
- [ ] Test Thai + English rendering
- [ ] Create typography component examples

**Files to Modify**:
- `tailwind.config.ts`
- `app/layout.tsx` (font imports)
- `app/globals.css`
- (potentially) `components/ui/Typography.tsx` (new component)
- (potentially) `lib/fonts/index.ts` (new file)

**Input Required from Design**:
- Font family names
- Font weights to include
- Font size scale
- Line height scale
- Letter spacing values

**Output**:
- Fonts loaded and configured
- Typography scale implemented
- Thai language rendering tested
- Typography component library

---

### 3. COMPONENT AGENT
**Responsibility**: Rebuild all UI components with new design

**Specific Tasks**:
- [ ] Redesign Button component (all variants and states)
- [ ] Redesign Input component
- [ ] Redesign Select/Dropdown component
- [ ] Create Checkbox component
- [ ] Create Radio component
- [ ] Create DatePicker component
- [ ] Create TimePicker component
- [ ] Create Card component (with variants)
- [ ] Create Badge component
- [ ] Create Tag component
- [ ] Create Modal/Dialog component
- [ ] Create Toast/Notification component
- [ ] Create Loading/Spinner component
- [ ] Create Skeleton loader component

**Files to Modify**:
- `components/ui/Button.tsx`
- `components/ui/Input.tsx` (new)
- `components/ui/Select.tsx` (new)
- `components/ui/Checkbox.tsx` (new)
- `components/ui/Radio.tsx` (new)
- `components/ui/DatePicker.tsx` (new)
- `components/ui/TimePicker.tsx` (new)
- `components/ui/Card.tsx` (new)
- `components/ui/Badge.tsx` (new)
- `components/ui/Tag.tsx` (new)
- `components/ui/Modal.tsx` (new)
- `components/ui/Toast.tsx` (new)
- `components/ui/Loading.tsx` (new)
- `components/ui/Skeleton.tsx` (new)

**Input Required from Design**:
- Component designs (all states)
- Spacing specifications
- Border/shadow specifications
- Color usage per component

**Output**:
- Complete component library
- Storybook/documentation (optional)
- Type-safe component props
- Accessibility compliant components

---

### 4. LAYOUT AGENT
**Responsibility**: Implement page layouts and structure

**Specific Tasks**:
- [ ] Redesign Header component
- [ ] Redesign Footer component
- [ ] Create Hero section component
- [ ] Create Section container component
- [ ] Create Grid/Column layouts
- [ ] Implement responsive breakpoints
- [ ] Create sticky sidebar component
- [ ] Create mobile navigation component
- [ ] Implement responsive navigation
- [ ] Create page wrapper components

**Files to Modify**:
- `components/layout/Header.tsx`
- `components/layout/Footer.tsx`
- `components/layout/Hero.tsx` (new)
- `components/layout/Section.tsx` (new)
- `components/layout/Container.tsx` (new)
- `components/layout/Grid.tsx` (new)
- `components/layout/Sidebar.tsx` (new)
- `components/layout/MobileNav.tsx` (new)

**Input Required from Design**:
- Header layout design
- Footer layout design
- Hero section design
- Grid system specifications
- Mobile navigation design

**Output**:
- Responsive layout components
- Navigation system
- Container/grid system
- Mobile-optimized layouts

---

### 5. ICON AGENT
**Responsibility**: Implement icon system

**Specific Tasks**:
- [ ] Choose icon library (Heroicons, Lucide, or custom)
- [ ] Create Icon component wrapper
- [ ] Implement all needed icons:
  - Navigation icons
  - Vehicle spec icons
  - Trip flow icons
  - Payment icons
  - UI icons
  - Feature icons
- [ ] Create icon size variants
- [ ] Create icon color variants
- [ ] Optimize SVG icons
- [ ] Create icon documentation

**Files to Create**:
- `components/ui/Icon.tsx`
- `lib/icons/index.ts`
- (potentially) `public/icons/` (for custom SVGs)

**Input Required from Design**:
- Icon style (line, filled, duotone)
- Icon list
- Icon sizes
- Custom icons (if any)

**Output**:
- Complete icon system
- Icon component library
- Optimized SVG assets
- Icon usage documentation

---

### 6. PAGE AGENT
**Responsibility**: Rebuild all pages with new design

**Specific Tasks**:
- [ ] Redesign Homepage (`/`)
  - Hero section
  - Featured vehicles
  - Popular routes
  - Why choose us
  - Testimonials section
- [ ] Redesign Vehicles page (`/vehicles`)
  - Filter sidebar
  - Vehicle grid
  - Sort controls
  - Empty states
- [ ] Redesign Routes page (`/routes`)
  - Route selection form
  - Popular routes cards
  - Booking summary
- [ ] Redesign Payment page (`/payment`)
  - Personal info form
  - Add-ons selection
  - Payment method selection
  - Summary sidebar
- [ ] Redesign Confirmation page (`/confirmation`)
  - Success message
  - Booking details
  - What's next section
  - Action buttons

**Files to Modify**:
- `app/page.tsx`
- `app/vehicles/page.tsx`
- `app/routes/page.tsx`
- `app/payment/page.tsx`
- `app/confirmation/page.tsx`

**Input Required from Design**:
- Page layouts for all screens
- Section designs
- Content hierarchy
- Responsive behavior

**Output**:
- Fully redesigned pages
- Responsive implementations
- Enhanced user experience
- Improved conversion flow

---

### 7. VEHICLE CARD AGENT
**Responsibility**: Redesign vehicle card component (critical component)

**Specific Tasks**:
- [ ] Redesign VehicleCard component
- [ ] Implement image area (placeholder + actual images)
- [ ] Redesign vehicle type badge
- [ ] Redesign pricing display
- [ ] Create "Driver Included" indicator
- [ ] Redesign spec icons layout
- [ ] Redesign feature tags
- [ ] Implement hover effects
- [ ] Add selection states
- [ ] Create card variations (grid, list, featured)
- [ ] Optimize for mobile

**Files to Modify**:
- `components/ui/VehicleCard.tsx`
- (potentially) `components/vehicles/VehicleGrid.tsx` (new)
- (potentially) `components/vehicles/VehicleList.tsx` (new)

**Input Required from Design**:
- Vehicle card design
- Hover/active states
- Badge designs
- Icon layouts
- Responsive behavior

**Output**:
- Professional vehicle cards
- Multiple card variants
- Optimized for conversions
- Mobile-friendly

---

### 8. BOOKING FLOW AGENT
**Responsibility**: Redesign booking flow components

**Specific Tasks**:
- [ ] Redesign BookingForm component
- [ ] Redesign BookingSummary component
- [ ] Create step indicator component
- [ ] Redesign route selection UI
- [ ] Redesign trip type selector
- [ ] Redesign add-ons selection
- [ ] Create payment method selector
- [ ] Implement form validation UI
- [ ] Add loading/processing states
- [ ] Create success/error states

**Files to Modify**:
- `components/booking/BookingForm.tsx`
- `components/booking/BookingSummary.tsx`
- `components/booking/StepIndicator.tsx` (new)
- `components/booking/RouteSelector.tsx` (new)
- `components/booking/TripTypeSelector.tsx` (new)
- `components/booking/AddOnSelector.tsx` (new)
- `components/booking/PaymentSelector.tsx` (new)

**Input Required from Design**:
- Booking form design
- Summary sidebar design
- Step indicator design
- Form element designs
- Validation state designs

**Output**:
- Polished booking flow
- Intuitive form UX
- Clear progress indication
- Error handling UI

---

### 9. ANIMATION AGENT
**Responsibility**: Implement animations and microinteractions

**Specific Tasks**:
- [ ] Configure animation utilities
- [ ] Implement button hover effects
- [ ] Implement card hover effects
- [ ] Create page transition animations
- [ ] Add form validation animations
- [ ] Create loading animations
- [ ] Implement success/error animations
- [ ] Add scroll animations (optional)
- [ ] Create skeleton loading animations
- [ ] Implement mobile touch feedback
- [ ] Add reduced motion support

**Files to Modify**:
- `tailwind.config.ts` (animation config)
- `app/globals.css` (keyframes)
- `lib/animations/index.ts` (new file)
- All component files (add animation classes)

**Input Required from Design**:
- Animation timing
- Easing functions
- Animation types
- Transition durations

**Output**:
- Smooth animations
- Professional microinteractions
- Accessibility-friendly motion
- Reduced motion support

---

### 10. IMAGE AGENT
**Responsibility**: Optimize and manage images

**Specific Tasks**:
- [ ] Create image optimization pipeline
- [ ] Add actual vehicle photos (placeholder structure)
- [ ] Optimize hero background images
- [ ] Create image placeholder system
- [ ] Implement lazy loading
- [ ] Add responsive images
- [ ] Create blur-up loading effect
- [ ] Optimize image formats (WebP, AVIF)
- [ ] Create image CDN integration (optional)

**Files to Create/Modify**:
- `components/ui/Image.tsx` (new)
- `lib/images/optimizer.ts` (new)
- `public/images/` (directory structure)
- Update all components using images

**Input Required from Design**:
- Image sizes/dimensions
- Image aspect ratios
- Placeholder designs
- Loading states

**Output**:
- Optimized image system
- Fast loading images
- Responsive images
- Professional placeholders

---

### 11. RESPONSIVE AGENT
**Responsibility**: Ensure mobile-first responsive design

**Specific Tasks**:
- [ ] Audit all components for mobile responsiveness
- [ ] Implement mobile navigation
- [ ] Optimize forms for mobile
- [ ] Create touch-friendly buttons (min 44px)
- [ ] Test on multiple screen sizes
- [ ] Optimize booking flow for mobile
- [ ] Create mobile-specific layouts
- [ ] Test on actual devices
- [ ] Fix any responsive issues
- [ ] Optimize font sizes for mobile

**Files to Modify**:
- All component files (responsive classes)
- All page files (mobile layouts)

**Input Required from Design**:
- Mobile layouts
- Tablet layouts
- Breakpoint specifications
- Mobile-specific interactions

**Output**:
- Fully responsive website
- Mobile-optimized UX
- Tested across devices
- Touch-friendly interfaces

---

### 12. ACCESSIBILITY AGENT
**Responsibility**: Ensure WCAG 2.1 AA compliance

**Specific Tasks**:
- [ ] Audit color contrast ratios
- [ ] Add focus indicators
- [ ] Implement keyboard navigation
- [ ] Add ARIA labels
- [ ] Test with screen readers
- [ ] Add skip links
- [ ] Ensure semantic HTML
- [ ] Add alt text for images
- [ ] Test form accessibility
- [ ] Add loading announcements
- [ ] Implement error announcements

**Files to Modify**:
- All component files (accessibility attributes)
- All page files (semantic structure)

**Tools to Use**:
- Lighthouse accessibility audit
- axe DevTools
- WAVE accessibility checker

**Output**:
- WCAG 2.1 AA compliant website
- Screen reader friendly
- Keyboard navigable
- Accessible forms

---

### 13. I18N AGENT
**Responsibility**: Update translations and language support

**Specific Tasks**:
- [ ] Update all Thai translations for new UI
- [ ] Update all English translations
- [ ] Ensure translation completeness
- [ ] Test language switcher
- [ ] Verify Thai typography rendering
- [ ] Add new translation keys for new components
- [ ] Optimize translation loading
- [ ] Test RTL support (if needed)

**Files to Modify**:
- `lib/i18n/translations.ts`
- All components with translatable text

**Input Required from Design**:
- New UI copy
- Microcopy for new components

**Output**:
- Complete bilingual support
- Beautiful Thai rendering
- Seamless language switching

---

### 14. PERFORMANCE AGENT
**Responsibility**: Optimize performance and loading

**Specific Tasks**:
- [ ] Optimize bundle size
- [ ] Implement code splitting
- [ ] Add lazy loading for routes
- [ ] Optimize images
- [ ] Minimize CSS/JS
- [ ] Implement caching strategies
- [ ] Add preloading for critical resources
- [ ] Optimize fonts loading
- [ ] Run Lighthouse audits
- [ ] Fix performance issues
- [ ] Optimize Core Web Vitals

**Files to Modify**:
- `next.config.ts`
- All component files (dynamic imports)
- `app/layout.tsx` (font loading)

**Tools to Use**:
- Lighthouse
- WebPageTest
- Chrome DevTools Performance

**Output**:
- Fast loading website
- Optimized Core Web Vitals
- Efficient resource loading
- Better SEO performance

---

### 15. QA AGENT
**Responsibility**: Test and validate all implementations

**Specific Tasks**:
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Cross-device testing (iOS, Android, Desktop)
- [ ] Functional testing (all flows work)
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Accessibility testing
- [ ] Responsive testing
- [ ] Link testing
- [ ] Form validation testing
- [ ] Payment flow testing
- [ ] Create bug reports
- [ ] Verify all fixes

**Tools to Use**:
- BrowserStack (cross-browser)
- Responsive design mode
- Lighthouse
- axe DevTools

**Output**:
- QA report
- Bug list
- Fix verification
- Final approval

---

## Agent Execution Plan

### Phase 1: Foundation (Run in Parallel)
**Agents**: Theme, Typography, Icon
**Duration**: ~1-2 hours
**Dependencies**: Design system from Google Gemini

### Phase 2: Components (Run in Parallel)
**Agents**: Component, Layout, Vehicle Card
**Duration**: ~2-3 hours
**Dependencies**: Phase 1 complete

### Phase 3: Pages (Run in Parallel)
**Agents**: Page, Booking Flow, Image
**Duration**: ~2-3 hours
**Dependencies**: Phase 2 complete

### Phase 4: Enhancement (Run in Parallel)
**Agents**: Animation, Responsive, Accessibility
**Duration**: ~1-2 hours
**Dependencies**: Phase 3 complete

### Phase 5: Optimization (Run in Parallel)
**Agents**: I18N, Performance
**Duration**: ~1 hour
**Dependencies**: Phase 4 complete

### Phase 6: Quality Assurance (Sequential)
**Agents**: QA
**Duration**: ~1-2 hours
**Dependencies**: Phase 5 complete

---

## Communication Protocol Between Agents

### Shared State
- All agents will read from the same design system specification
- All agents will commit to Git after completing tasks
- All agents will document changes in their respective files

### Conflict Resolution
- Theme Agent sets the foundation (highest priority)
- Component Agent defines component API
- Page Agent consumes components (lowest priority)

### Code Review Process
- Each agent creates descriptive commit messages
- QA Agent reviews all implementations
- Orchestrator Agent coordinates fixes

---

## Success Criteria

### Visual Quality
- [ ] Design matches Gemini specifications
- [ ] All components are polished
- [ ] Consistent design language
- [ ] Professional appearance

### Functionality
- [ ] All features work correctly
- [ ] No regressions
- [ ] Booking flow functional
- [ ] Payment flow functional

### Performance
- [ ] Lighthouse score > 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1

### Accessibility
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigable
- [ ] Screen reader friendly

### Responsiveness
- [ ] Works on mobile (320px+)
- [ ] Works on tablet (768px+)
- [ ] Works on desktop (1024px+)

---

## Agent Coordination Example

```typescript
// Example: Theme Agent completes first
// File: tailwind.config.ts
export default {
  theme: {
    colors: {
      primary: {
        50: '#...',
        // ... full palette from Gemini
      }
    }
  }
}

// Then: Component Agent uses theme
// File: components/ui/Button.tsx
<button className="bg-primary-600 hover:bg-primary-700">
  {children}
</button>

// Then: Page Agent uses components
// File: app/page.tsx
<Button variant="primary">Book Now</Button>
```

---

## Ready for Implementation

Once design system is received from Google Gemini, execute agents in phases:

1. **Prepare**: Parse design system into structured data
2. **Phase 1-6**: Execute agents as planned
3. **Review**: QA Agent validates everything
4. **Deploy**: Push to production

**Estimated Total Time**: 8-12 hours (parallel execution)

---

## Notes

- All agents should use TypeScript
- All agents should maintain type safety
- All agents should write clean, documented code
- All agents should test their implementations
- All agents should commit frequently

**Let's make TukTik the most beautiful car hire service in Thailand!**
