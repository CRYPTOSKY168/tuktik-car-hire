# Agent Execution Plan
**Claude Code จะใช้ไฟล์นี้เป็นแผนการ execute agents**

---

## Pre-Execution Checklist

### ✅ Required Files
- [x] DESIGN_BRIEF.md (created)
- [x] AGENT_ARCHITECTURE.md (created)
- [x] DESIGN_OUTPUT_TEMPLATE.md (created)
- [x] DESIGN_WORKFLOW.md (created)
- [ ] DESIGN_OUTPUT_TEMPLATE.md (filled with Gemini output) ← **WAITING**

### ✅ Current Status
**STATUS**: Waiting for design system from Google Gemini

---

## Execution Phases

### Phase 1: FOUNDATION (Parallel Execution)

#### Agent 1.1: THEME AGENT
**Trigger**: User confirms design system received
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract color palette, spacing, shadows, border radius
**Tasks**:
```typescript
1. Parse design output
2. Update tailwind.config.ts:
   - colors.primary.*
   - colors.secondary.*
   - colors.gray.*
   - colors.success/error/warning/info.*
   - spacing scale
   - borderRadius scale
   - boxShadow scale
3. Create lib/theme/colors.ts
4. Update app/globals.css with CSS variables
5. Test theme application
6. Commit: "feat(theme): implement design system theme from Gemini"
```

#### Agent 1.2: TYPOGRAPHY AGENT
**Trigger**: Same as 1.1 (parallel)
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract typography specs
**Tasks**:
```typescript
1. Parse font specifications
2. Add font imports to app/layout.tsx
3. Update tailwind.config.ts:
   - fontFamily
   - fontSize scale
   - fontWeight scale
   - lineHeight scale
   - letterSpacing
4. Update app/globals.css with typography utilities
5. Test Thai + English rendering
6. Commit: "feat(typography): implement design system fonts"
```

#### Agent 1.3: ICON AGENT
**Trigger**: Same as 1.1 (parallel)
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract icon specifications
**Tasks**:
```typescript
1. Install icon library (if recommended by Gemini)
2. Create components/ui/Icon.tsx wrapper
3. Create lib/icons/index.ts
4. Export all needed icons
5. Test icon rendering
6. Commit: "feat(icons): implement icon system"
```

**Phase 1 Success Criteria**:
- [ ] Theme configured in Tailwind
- [ ] Fonts loaded and working
- [ ] Icons ready to use
- [ ] No build errors
- [ ] 3 commits created

---

### Phase 2: COMPONENTS (Parallel Execution)

#### Agent 2.1: COMPONENT AGENT
**Trigger**: Phase 1 complete
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract component specifications
**Tasks**:
```typescript
1. Rebuild components/ui/Button.tsx (all variants, all states)
2. Create components/ui/Input.tsx
3. Create components/ui/Select.tsx
4. Create components/ui/Checkbox.tsx
5. Create components/ui/Radio.tsx
6. Create components/ui/DatePicker.tsx (or use library)
7. Create components/ui/TimePicker.tsx (or use library)
8. Create components/ui/Card.tsx
9. Create components/ui/Badge.tsx
10. Create components/ui/Tag.tsx
11. Create components/ui/Modal.tsx
12. Create components/ui/Toast.tsx
13. Create components/ui/Loading.tsx
14. Create components/ui/Skeleton.tsx
15. Test all components
16. Commit: "feat(components): rebuild all UI components with new design"
```

#### Agent 2.2: LAYOUT AGENT
**Trigger**: Phase 1 complete (parallel with 2.1)
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract layout specifications
**Tasks**:
```typescript
1. Rebuild components/layout/Header.tsx
2. Rebuild components/layout/Footer.tsx
3. Create components/layout/Hero.tsx
4. Create components/layout/Section.tsx
5. Create components/layout/Container.tsx
6. Create components/layout/Grid.tsx
7. Create components/layout/Sidebar.tsx
8. Create components/layout/MobileNav.tsx
9. Test responsive layouts
10. Commit: "feat(layout): rebuild layout components with new design"
```

#### Agent 2.3: VEHICLE CARD AGENT
**Trigger**: Phase 1 complete (parallel with 2.1, 2.2)
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract vehicle card specifications
**Tasks**:
```typescript
1. Rebuild components/ui/VehicleCard.tsx
2. Implement new image area
3. Redesign vehicle type badge
4. Redesign pricing display
5. Add "Driver Included" indicator
6. Redesign spec icons layout
7. Redesign feature tags
8. Add hover effects
9. Add selection states
10. Create card variations (grid, list, featured)
11. Test on mobile
12. Commit: "feat(vehicle-card): redesign vehicle card component"
```

**Phase 2 Success Criteria**:
- [ ] All UI components rebuilt
- [ ] Layout components rebuilt
- [ ] Vehicle card redesigned
- [ ] No TypeScript errors
- [ ] No build errors
- [ ] 3 commits created

---

### Phase 3: PAGES (Parallel Execution)

#### Agent 3.1: PAGE AGENT
**Trigger**: Phase 2 complete
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract page layout specifications
**Tasks**:
```typescript
1. Rebuild app/page.tsx (Homepage)
   - New Hero section
   - Featured vehicles with new cards
   - Popular routes section
   - Why choose us section
   - (Optional) Testimonials section
2. Rebuild app/vehicles/page.tsx
   - Filter sidebar
   - Vehicle grid with new cards
   - Sort controls
   - Empty states
3. Update app/routes/page.tsx (minor updates)
4. Update app/payment/page.tsx (use new components)
5. Update app/confirmation/page.tsx (use new components)
6. Test all pages
7. Commit: "feat(pages): rebuild all pages with new design"
```

#### Agent 3.2: BOOKING FLOW AGENT
**Trigger**: Phase 2 complete (parallel with 3.1)
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract booking flow specifications
**Tasks**:
```typescript
1. Rebuild components/booking/BookingForm.tsx
2. Rebuild components/booking/BookingSummary.tsx
3. Create components/booking/StepIndicator.tsx
4. Create components/booking/RouteSelector.tsx
5. Create components/booking/TripTypeSelector.tsx
6. Create components/booking/AddOnSelector.tsx
7. Create components/booking/PaymentSelector.tsx
8. Test booking flow end-to-end
9. Commit: "feat(booking): rebuild booking flow components"
```

#### Agent 3.3: IMAGE AGENT
**Trigger**: Phase 2 complete (parallel with 3.1, 3.2)
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract image specifications
**Tasks**:
```typescript
1. Create components/ui/Image.tsx (Next.js Image wrapper)
2. Set up public/images/ directory structure
3. Add hero background images (placeholders or from design)
4. Create image placeholder system
5. Implement lazy loading
6. Add responsive images
7. Create blur-up loading effect
8. Optimize image formats
9. Commit: "feat(images): implement image optimization system"
```

**Phase 3 Success Criteria**:
- [ ] All pages rebuilt
- [ ] Booking flow polished
- [ ] Images optimized
- [ ] End-to-end flow works
- [ ] No build errors
- [ ] 3 commits created

---

### Phase 4: ENHANCEMENT (Parallel Execution)

#### Agent 4.1: ANIMATION AGENT
**Trigger**: Phase 3 complete
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract animation specifications
**Tasks**:
```typescript
1. Update tailwind.config.ts with animation config
2. Add keyframes to app/globals.css
3. Create lib/animations/index.ts
4. Add button hover effects
5. Add card hover effects
6. Add page transition animations (if applicable)
7. Add form validation animations
8. Add loading animations
9. Add success/error animations
10. Add scroll animations (optional, tasteful)
11. Add skeleton loading animations
12. Add mobile touch feedback
13. Add reduced motion support
14. Test all animations
15. Commit: "feat(animations): add microinteractions and animations"
```

#### Agent 4.2: RESPONSIVE AGENT
**Trigger**: Phase 3 complete (parallel with 4.1)
**Input**: Read DESIGN_OUTPUT_TEMPLATE.md → Extract responsive specifications
**Tasks**:
```typescript
1. Audit all components for mobile responsiveness
2. Optimize mobile navigation
3. Optimize forms for mobile
4. Ensure touch-friendly buttons (min 44px)
5. Test on multiple screen sizes (320px, 375px, 768px, 1024px, 1440px)
6. Optimize booking flow for mobile
7. Create mobile-specific layouts where needed
8. Test on actual devices (if possible)
9. Fix any responsive issues
10. Optimize font sizes for mobile
11. Commit: "feat(responsive): optimize for mobile-first design"
```

#### Agent 4.3: ACCESSIBILITY AGENT
**Trigger**: Phase 3 complete (parallel with 4.1, 4.2)
**Input**: WCAG 2.1 AA requirements
**Tasks**:
```typescript
1. Audit color contrast ratios
2. Add focus indicators to all interactive elements
3. Implement keyboard navigation
4. Add ARIA labels where needed
5. Test with screen readers (if possible)
6. Add skip links
7. Ensure semantic HTML
8. Add alt text for images
9. Test form accessibility
10. Add loading announcements
11. Implement error announcements
12. Run Lighthouse accessibility audit
13. Fix any issues
14. Commit: "feat(a11y): ensure WCAG 2.1 AA compliance"
```

**Phase 4 Success Criteria**:
- [ ] Smooth animations added
- [ ] Fully responsive on all devices
- [ ] WCAG 2.1 AA compliant
- [ ] Lighthouse accessibility score > 90
- [ ] No build errors
- [ ] 3 commits created

---

### Phase 5: OPTIMIZATION (Parallel Execution)

#### Agent 5.1: I18N AGENT
**Trigger**: Phase 4 complete
**Input**: lib/i18n/translations.ts + new UI copy from design
**Tasks**:
```typescript
1. Review all new UI components for translation keys
2. Update lib/i18n/translations.ts (English)
3. Update lib/i18n/translations.ts (Thai)
4. Ensure translation completeness
5. Test language switcher
6. Verify Thai typography rendering
7. Add new translation keys for new components
8. Test both languages across all pages
9. Commit: "feat(i18n): update translations for new design"
```

#### Agent 5.2: PERFORMANCE AGENT
**Trigger**: Phase 4 complete (parallel with 5.1)
**Input**: Performance requirements
**Tasks**:
```typescript
1. Run npm run build
2. Analyze bundle size
3. Implement code splitting (if needed)
4. Add lazy loading for routes
5. Optimize images (already done by Image Agent)
6. Minimize CSS/JS
7. Implement caching strategies
8. Add preloading for critical resources
9. Optimize fonts loading
10. Run Lighthouse performance audit
11. Fix performance issues
12. Optimize Core Web Vitals (LCP, FID, CLS)
13. Commit: "perf: optimize bundle size and loading performance"
```

**Phase 5 Success Criteria**:
- [ ] Bilingual support complete
- [ ] Lighthouse performance score > 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Bundle size optimized
- [ ] 2 commits created

---

### Phase 6: QUALITY ASSURANCE (Sequential)

#### Agent 6.1: QA AGENT
**Trigger**: Phase 5 complete
**Input**: All previous work
**Tasks**:
```typescript
1. Cross-browser testing
   - Chrome (latest)
   - Safari (latest)
   - Firefox (latest)
   - Edge (latest)
2. Cross-device testing
   - iOS (iPhone)
   - Android
   - Desktop (macOS, Windows)
3. Functional testing
   - Vehicle selection flow
   - Route selection flow
   - Booking flow
   - Payment flow
   - Confirmation page
   - Language switcher
   - All links work
4. Visual testing
   - Design matches specifications
   - Consistent spacing
   - Proper alignment
   - No layout shifts
5. Performance testing
   - Run Lighthouse on all pages
   - Check Core Web Vitals
6. Accessibility testing
   - Run axe DevTools
   - Keyboard navigation test
   - Screen reader test (if possible)
7. Responsive testing
   - Test all breakpoints
   - Test touch interactions
8. Create QA report
9. Create bug list (if any)
10. Verify fixes
11. Final approval
12. Commit: "test: QA validation and bug fixes"
```

**Phase 6 Success Criteria**:
- [ ] All tests passed
- [ ] All bugs fixed
- [ ] Cross-browser compatible
- [ ] Cross-device compatible
- [ ] Ready for production
- [ ] 1 commit created

---

## Final Deployment

### Pre-Deployment Checklist
- [ ] All 6 phases complete
- [ ] All tests passed
- [ ] No build errors
- [ ] No TypeScript errors
- [ ] Lighthouse scores > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Core Web Vitals optimized

### Deployment Steps
```bash
# 1. Final build test
npm run build

# 2. Create final commit
git add .
git commit -m "feat: implement complete design system from Google Gemini

Phase 1: Foundation (Theme, Typography, Icons)
Phase 2: Components (UI Components, Layouts, Vehicle Cards)
Phase 3: Pages (All pages, Booking flow, Images)
Phase 4: Enhancement (Animations, Responsive, Accessibility)
Phase 5: Optimization (I18N, Performance)
Phase 6: QA (Testing and validation)

Design System Highlights:
- [Color palette description]
- [Typography description]
- [Component library description]
- WCAG 2.1 AA compliant
- Lighthouse score > 90
- Mobile-first responsive
- Optimized Core Web Vitals

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 3. Push to GitHub
git push origin main

# 4. Deploy to Vercel
vercel --prod

# 5. Verify production deployment
# Visit: https://car-rental-phi-lime.vercel.app
```

### Post-Deployment Checklist
- [ ] Production site loads correctly
- [ ] All pages work
- [ ] Booking flow functional
- [ ] Language switcher works
- [ ] Mobile responsive
- [ ] Fast loading
- [ ] No console errors

---

## Agent Communication Log Template

```
=== AGENT EXECUTION LOG ===

Phase 1: FOUNDATION
  [YYYY-MM-DD HH:MM] Agent 1.1 (THEME) - Started
  [YYYY-MM-DD HH:MM] Agent 1.1 (THEME) - Completed ✓
  [YYYY-MM-DD HH:MM] Agent 1.2 (TYPOGRAPHY) - Started
  [YYYY-MM-DD HH:MM] Agent 1.2 (TYPOGRAPHY) - Completed ✓
  [YYYY-MM-DD HH:MM] Agent 1.3 (ICON) - Started
  [YYYY-MM-DD HH:MM] Agent 1.3 (ICON) - Completed ✓
  Phase 1 Status: ✓ COMPLETE

Phase 2: COMPONENTS
  [YYYY-MM-DD HH:MM] Agent 2.1 (COMPONENT) - Started
  [YYYY-MM-DD HH:MM] Agent 2.1 (COMPONENT) - Completed ✓
  [YYYY-MM-DD HH:MM] Agent 2.2 (LAYOUT) - Started
  [YYYY-MM-DD HH:MM] Agent 2.2 (LAYOUT) - Completed ✓
  [YYYY-MM-DD HH:MM] Agent 2.3 (VEHICLE CARD) - Started
  [YYYY-MM-DD HH:MM] Agent 2.3 (VEHICLE CARD) - Completed ✓
  Phase 2 Status: ✓ COMPLETE

Phase 3: PAGES
  [YYYY-MM-DD HH:MM] Agent 3.1 (PAGE) - Started
  [YYYY-MM-DD HH:MM] Agent 3.1 (PAGE) - Completed ✓
  [YYYY-MM-DD HH:MM] Agent 3.2 (BOOKING FLOW) - Started
  [YYYY-MM-DD HH:MM] Agent 3.2 (BOOKING FLOW) - Completed ✓
  [YYYY-MM-DD HH:MM] Agent 3.3 (IMAGE) - Started
  [YYYY-MM-DD HH:MM] Agent 3.3 (IMAGE) - Completed ✓
  Phase 3 Status: ✓ COMPLETE

Phase 4: ENHANCEMENT
  [YYYY-MM-DD HH:MM] Agent 4.1 (ANIMATION) - Started
  [YYYY-MM-DD HH:MM] Agent 4.1 (ANIMATION) - Completed ✓
  [YYYY-MM-DD HH:MM] Agent 4.2 (RESPONSIVE) - Started
  [YYYY-MM-DD HH:MM] Agent 4.2 (RESPONSIVE) - Completed ✓
  [YYYY-MM-DD HH:MM] Agent 4.3 (ACCESSIBILITY) - Started
  [YYYY-MM-DD HH:MM] Agent 4.3 (ACCESSIBILITY) - Completed ✓
  Phase 4 Status: ✓ COMPLETE

Phase 5: OPTIMIZATION
  [YYYY-MM-DD HH:MM] Agent 5.1 (I18N) - Started
  [YYYY-MM-DD HH:MM] Agent 5.1 (I18N) - Completed ✓
  [YYYY-MM-DD HH:MM] Agent 5.2 (PERFORMANCE) - Started
  [YYYY-MM-DD HH:MM] Agent 5.2 (PERFORMANCE) - Completed ✓
  Phase 5 Status: ✓ COMPLETE

Phase 6: QA
  [YYYY-MM-DD HH:MM] Agent 6.1 (QA) - Started
  [YYYY-MM-DD HH:MM] Agent 6.1 (QA) - Completed ✓
  Phase 6 Status: ✓ COMPLETE

=== EXECUTION SUMMARY ===
Total Agents: 14
Total Commits: 15
Total Time: [X hours]
Status: ✓ SUCCESS

=== DEPLOYMENT ===
GitHub: Pushed ✓
Vercel: Deployed ✓
Production URL: https://car-rental-phi-lime.vercel.app
Status: ✓ LIVE

=== END LOG ===
```

---

## Error Handling

### If Phase Fails
1. **Stop execution** of current phase
2. **Log error** with details
3. **Report to user** what failed
4. **Ask for guidance** or attempt auto-fix
5. **Resume** after fix confirmed

### Common Errors
- **Build Error**: Check TypeScript types, imports
- **Theme Error**: Verify color values, spacing values
- **Component Error**: Check prop types, missing imports
- **Agent Conflict**: Ensure agents don't modify same files simultaneously

---

## Success Metrics

### Design Quality
- ✓ Visual design matches Gemini specifications
- ✓ Consistent design language across all pages
- ✓ Professional, polished appearance
- ✓ Unique Thai identity

### Technical Quality
- ✓ TypeScript: No errors
- ✓ Build: No errors
- ✓ Lighthouse Performance: > 90
- ✓ Lighthouse Accessibility: > 90
- ✓ Lighthouse Best Practices: > 90
- ✓ Lighthouse SEO: > 90

### User Experience
- ✓ Intuitive booking flow
- ✓ Fast page loads (LCP < 2.5s)
- ✓ Smooth interactions (FID < 100ms)
- ✓ No layout shifts (CLS < 0.1)
- ✓ Mobile-friendly
- ✓ Accessible (WCAG 2.1 AA)

---

**READY TO EXECUTE WHEN DESIGN SYSTEM IS RECEIVED**
