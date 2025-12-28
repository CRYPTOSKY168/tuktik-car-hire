# TukTik Project Context for Claude Sub-Agents

> **IMPORTANT:** Read this file before making any changes!

## Quick Summary

TukTik = Airport Transfer Booking System (Thailand)
- Next.js 14 + Firebase + Stripe
- Thai/English bilingual
- Customer books → Admin confirms → Assigns driver → Trip completes

---

## CRITICAL: Don't Do These Things

1. **DON'T change default booking status** - Must be `pending`
2. **DON'T skip status steps** - Follow: pending → confirmed → driver_assigned → driver_en_route → in_progress → completed
3. **DON'T use hardcoded English** - Always use `{language === 'th' ? 'ไทย' : 'English'}`
4. **DON'T create duplicate functions** - Check `lib/firebase/firestore.ts` first
5. **DON'T forget mobile** - Test all changes on mobile view

---

## Key Files Quick Reference

| Need to... | Check this file |
|------------|-----------------|
| Database operations | `lib/firebase/firestore.ts` |
| Booking state | `lib/contexts/BookingContext.tsx` |
| Admin bookings | `app/admin/bookings/page.tsx` |
| Customer dashboard | `app/dashboard/page.tsx` |
| Payment flow | `app/payment/page.tsx` |
| Booking form | `components/booking/BookingForm.tsx` |
| Translations | `lib/contexts/LanguageContext.tsx` |

---

## Status System

```
pending → confirmed → driver_assigned → driver_en_route → in_progress → completed
   ↓          ↓
cancelled  cancelled
```

- `pending`: Customer just booked, waiting for admin
- `confirmed`: Admin approved
- `driver_assigned`: Driver info added
- `driver_en_route`: Driver heading to pickup
- `in_progress`: Customer in vehicle
- `completed`: Trip finished

---

## Recent Changes (2025-12-27)

1. **Fixed location modal** - Shows all locations if no routes configured
2. **Improved date/time picker** - Custom modals instead of native inputs
3. **Moved UPCOMING TRIP** - Now at top on mobile
4. **Fixed Thai language** - All UI elements now bilingual
5. **Single booking limit** - Customer can only have 1 active booking

---

## Testing Checklist

Before deploying, verify:
- [ ] Booking form works (location/date/time selection)
- [ ] Payment flow works (Stripe + PromptPay)
- [ ] Admin can change status step-by-step
- [ ] Customer sees status updates in dashboard
- [ ] Mobile view works properly
- [ ] Thai language displays correctly

---

## Deployment

```bash
npm run build && vercel --prod
```

Live: https://car-rental-phi-lime.vercel.app

---

*Full documentation: ../CLAUDE_PROJECT_MEMORY.md*
