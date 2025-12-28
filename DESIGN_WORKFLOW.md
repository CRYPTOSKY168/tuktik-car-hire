# TukTik Design Implementation Workflow
**คู่มือการทำงานกับ Google Gemini และ Sub-Agents**

---

## 📋 ขั้นตอนการทำงาน

### Step 1: ส่ง Design Brief ไปให้ Google Gemini

#### 1.1 เปิดไฟล์ Design Brief
```bash
# ไฟล์ที่ต้องส่งให้ Google Gemini
open DESIGN_BRIEF.md
```

#### 1.2 Copy เนื้อหาทั้งหมดจาก DESIGN_BRIEF.md

#### 1.3 ไปที่ Google Gemini / Stitch
- URL: https://gemini.google.com (หรือ Google Stitch)
- Paste Design Brief ทั้งหมด
- (Optional) แนบภาพหน้าเว็บปัจจุบัน: https://car-rental-phi-lime.vercel.app

#### 1.4 Prompt เพิ่มเติมให้ Gemini
```
I need you to design a complete design system for this car hire website.

Please provide:
1. Complete color palette (all shades with hex codes)
2. Typography system (font names, sizes, weights, line heights)
3. Spacing scale
4. Component specifications (buttons, inputs, cards, etc.)
5. Page layout designs
6. Icon style recommendations
7. Animation specifications

Please be specific with exact values (hex codes, pixel sizes, etc.) so I can implement them directly in code.

Format your response following the structure in the design brief.
```

---

### Step 2: รับ Design Output จาก Gemini

#### 2.1 เปิดไฟล์ Template
```bash
open DESIGN_OUTPUT_TEMPLATE.md
```

#### 2.2 Copy คำตอบจาก Gemini มาใส่ในไฟล์
- กรอกข้อมูลใน `DESIGN_OUTPUT_TEMPLATE.md`
- ใส่ค่าสี (hex codes)
- ใส่ชื่อ fonts
- ใส่ spacing values
- ใส่ component specifications
- บันทึกไฟล์

#### 2.3 (Optional) ถ้า Gemini ให้ Figma file
- เก็บ Figma URL ไว้ในไฟล์
- Export assets ที่จำเป็น (icons, images, logos)

---

### Step 3: ส่ง Design Output กลับมาให้ Claude

#### 3.1 อ่านไฟล์ที่กรอกแล้ว
```bash
# คุณจะส่งคำสั่งนี้ให้ Claude
Please read the design output file and start implementing the new design system
```

#### 3.2 Claude จะอ่านไฟล์
```
DESIGN_OUTPUT_TEMPLATE.md
```

#### 3.3 Claude จะเริ่มสร้าง Sub-Agents

---

### Step 4: Claude สร้าง Sub-Agents และ Execute

Claude จะทำตามลำดับนี้:

#### Phase 1: Foundation (Parallel - 15 Agents)
```
✓ Agent 1:  THEME AGENT        → Configure Tailwind theme
✓ Agent 2:  TYPOGRAPHY AGENT   → Setup fonts & typography scale
✓ Agent 3:  ICON AGENT         → Setup icon system
```
**⏱️ เวลาโดยประมาณ: 30-45 นาที**

#### Phase 2: Components (Parallel)
```
✓ Agent 4:  COMPONENT AGENT    → Rebuild all UI components
✓ Agent 5:  LAYOUT AGENT       → Rebuild layouts (Header, Footer)
✓ Agent 6:  VEHICLE CARD AGENT → Redesign vehicle cards
```
**⏱️ เวลาโดยประมาณ: 45-60 นาที**

#### Phase 3: Pages (Parallel)
```
✓ Agent 7:  PAGE AGENT         → Rebuild all pages
✓ Agent 8:  BOOKING FLOW AGENT → Rebuild booking components
✓ Agent 9:  IMAGE AGENT        → Optimize images
```
**⏱️ เวลาโดยประมาณ: 45-60 นาที**

#### Phase 4: Enhancement (Parallel)
```
✓ Agent 10: ANIMATION AGENT    → Add animations
✓ Agent 11: RESPONSIVE AGENT   → Ensure mobile-first design
✓ Agent 12: ACCESSIBILITY AGNT → WCAG compliance
```
**⏱️ เวลาโดยประมาณ: 30-45 นาที**

#### Phase 5: Optimization (Parallel)
```
✓ Agent 13: I18N AGENT         → Update translations
✓ Agent 14: PERFORMANCE AGENT  → Optimize performance
```
**⏱️ เวลาโดยประมาณ: 20-30 นาที**

#### Phase 6: Quality Assurance (Sequential)
```
✓ Agent 15: QA AGENT           → Test everything
```
**⏱️ เวลาโดยประมาณ: 30-45 นาที**

---

### Step 5: Review & Deploy

#### 5.1 Preview เว็บไซต์ใหม่
```bash
npm run dev
# เปิดเบราว์เซอร์ที่ http://localhost:3000
```

#### 5.2 ทดสอบหน้าทั้งหมด
- [ ] Homepage (/)
- [ ] Vehicles (/vehicles)
- [ ] Routes (/routes)
- [ ] Payment (/payment)
- [ ] Confirmation (/confirmation)

#### 5.3 ทดสอบบนอุปกรณ์ต่างๆ
- [ ] Mobile (320px - 767px)
- [ ] Tablet (768px - 1023px)
- [ ] Desktop (1024px+)

#### 5.4 ทดสอบ Accessibility
```bash
# Run Lighthouse audit
npm run build
# Open Chrome DevTools → Lighthouse
```

#### 5.5 Deploy to Vercel
```bash
git add .
git commit -m "Implement new design system from Google Gemini

- Updated color palette
- New typography system
- Redesigned all components
- Rebuilt all pages
- Enhanced animations
- Optimized performance
- WCAG 2.1 AA compliant

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main

# Vercel จะ auto-deploy
```

---

## 🎯 ตัวอย่างการใช้งานจริง

### Scenario: คุณได้ Design System จาก Gemini แล้ว

```bash
# 1. คุณพิมพ์ใน Claude Code CLI:
"ผมได้ design system จาก Google Gemini มาแล้ว อยู่ในไฟล์ DESIGN_OUTPUT_TEMPLATE.md
เริ่ม implement ให้หน่อยครับ ใช้ sub-agents แยกงานกันทำ"

# 2. Claude จะตอบ:
"รับทราบครับ! ให้ผมอ่านไฟล์ design system และเริ่มสร้าง sub-agents ให้นะครับ"

# 3. Claude จะ:
- Read DESIGN_OUTPUT_TEMPLATE.md
- Parse design system
- Create 15 sub-agents (parallel execution)
- Each agent works on specific task
- Commit changes as they complete
- Run QA tests
- Report completion

# 4. คุณจะได้:
- เว็บไซต์ที่ redesign ใหม่หมด
- Professional design
- Fast performance
- Mobile-optimized
- Accessible
- Ready to deploy
```

---

## 📁 โครงสร้างไฟล์ที่เกี่ยวข้อง

```
/Users/phiopan/Tuktik/car-rental/
├── DESIGN_BRIEF.md              ← ส่งไฟล์นี้ให้ Google Gemini
├── DESIGN_OUTPUT_TEMPLATE.md    ← กรอก output จาก Gemini ในนี้
├── AGENT_ARCHITECTURE.md        ← โครงสร้าง Sub-Agents
├── DESIGN_WORKFLOW.md           ← ไฟล์นี้ (คู่มือ)
│
├── tailwind.config.ts           ← จะถูก update โดย THEME AGENT
├── app/globals.css              ← จะถูก update โดย THEME AGENT
│
├── components/
│   ├── ui/                      ← จะถูก rebuild โดย COMPONENT AGENT
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── layout/                  ← จะถูก rebuild โดย LAYOUT AGENT
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ...
│   └── booking/                 ← จะถูก rebuild โดย BOOKING FLOW AGENT
│       ├── BookingForm.tsx
│       └── BookingSummary.tsx
│
└── app/                         ← จะถูก rebuild โดย PAGE AGENT
    ├── page.tsx
    ├── vehicles/page.tsx
    ├── routes/page.tsx
    ├── payment/page.tsx
    └── confirmation/page.tsx
```

---

## ⚙️ Agent Configuration

### แต่ละ Agent จะทำอะไร?

#### 1. THEME AGENT
**Input**: Color palette, spacing, shadows, border radius
**Output**:
- `tailwind.config.ts` with new theme
- `app/globals.css` with CSS variables
- `lib/theme/colors.ts` (new)

**Example Output**:
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f2ff',
          100: '#baddff',
          // ... from Gemini
        }
      }
    }
  }
}
```

#### 2. TYPOGRAPHY AGENT
**Input**: Font families, font sizes, line heights
**Output**:
- Font imports in `app/layout.tsx`
- Typography config in `tailwind.config.ts`
- Typography utilities in `app/globals.css`

**Example Output**:
```typescript
// app/layout.tsx
import { Prompt, Inter } from 'next/font/google';

const promptFont = Prompt({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
});
```

#### 3. COMPONENT AGENT
**Input**: Component specifications
**Output**: All components in `components/ui/`

**Example Output**:
```typescript
// components/ui/Button.tsx
export default function Button({
  variant = 'primary',
  size = 'md',
  ...props
}) {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-semibold transition-all`}
      {...props}
    />
  );
}
```

[... อธิบาย agents อื่นๆ ในลักษณะเดียวกัน ...]

---

## 🚀 Quick Commands

### สำหรับผู้ใช้
```bash
# 1. ดู Design Brief
cat DESIGN_BRIEF.md

# 2. ดู Agent Architecture
cat AGENT_ARCHITECTURE.md

# 3. แก้ไข Design Output Template (หลังได้จาก Gemini)
# ใช้ editor ที่ชอบ เช่น VS Code, Sublime, etc.

# 4. เริ่ม Development Server
npm run dev

# 5. Build Production
npm run build

# 6. Deploy to Vercel
vercel --prod
```

### สำหรับ Claude
```bash
# Claude จะใช้คำสั่งเหล่านี้เมื่อ implement

# Read design output
Read DESIGN_OUTPUT_TEMPLATE.md

# Create agents and execute
Task subagent_type="general-purpose" prompt="Implement theme system..."
Task subagent_type="general-purpose" prompt="Implement typography..."
# ... (15 agents total)

# Test and deploy
Bash "npm run build"
Bash "npm run dev" run_in_background=true
```

---

## 📊 Progress Tracking

### Checklist สำหรับ User

#### Pre-Implementation
- [ ] ส่ง DESIGN_BRIEF.md ให้ Google Gemini
- [ ] รับ design system output จาก Gemini
- [ ] กรอกข้อมูลใน DESIGN_OUTPUT_TEMPLATE.md
- [ ] บันทึกไฟล์
- [ ] แจ้ง Claude ให้เริ่ม implementation

#### During Implementation
- [ ] Phase 1: Foundation (THEME, TYPOGRAPHY, ICON)
- [ ] Phase 2: Components (COMPONENT, LAYOUT, VEHICLE CARD)
- [ ] Phase 3: Pages (PAGE, BOOKING FLOW, IMAGE)
- [ ] Phase 4: Enhancement (ANIMATION, RESPONSIVE, ACCESSIBILITY)
- [ ] Phase 5: Optimization (I18N, PERFORMANCE)
- [ ] Phase 6: QA (Testing & Validation)

#### Post-Implementation
- [ ] Review เว็บไซต์ใหม่
- [ ] ทดสอบบนอุปกรณ์ต่างๆ
- [ ] ทดสอบ accessibility
- [ ] Run Lighthouse audit
- [ ] Commit to Git
- [ ] Deploy to Vercel
- [ ] ทดสอบ production site

---

## 🎨 Design System Benefits

### Before (Current)
- ❌ Generic blue/gray color scheme
- ❌ System fonts
- ❌ Basic Tailwind defaults
- ❌ Placeholder vehicle cards
- ❌ No brand identity
- ❌ Looks like template

### After (New Design)
- ✅ Custom Thai-inspired color palette
- ✅ Professional font pairing
- ✅ Custom component library
- ✅ Beautiful vehicle cards
- ✅ Strong brand identity
- ✅ Unique, memorable design
- ✅ Optimized for conversions
- ✅ Mobile-first responsive
- ✅ WCAG 2.1 AA accessible
- ✅ Fast performance

---

## 💡 Tips

### สำหรับการขอ Design จาก Gemini
1. **Be Specific**: ยิ่งระบุรายละเอียดมาก ได้ design ดีมาก
2. **Show Examples**: แนบภาพหน้าเว็บปัจจุบัน
3. **Ask for Rationale**: ขอให้อธิบายทำไมเลือก design นี้
4. **Request Exact Values**: ขอ hex codes, pixel values ที่แน่นอน
5. **Iterate**: ถ้าไม่ชอบ ให้ feedback และขอ revise

### สำหรับการทำงานกับ Sub-Agents
1. **Trust the Process**: Agents จะทำงานอัตโนมัติ
2. **Review Gradually**: ตรวจสอบทีละ phase
3. **Test Frequently**: ทดสอบระหว่างทาง
4. **Provide Feedback**: ถ้ามีอะไรไม่ถูกใจ แจ้ง Claude
5. **Commit Often**: แต่ละ phase commit แยก

---

## 🆘 Troubleshooting

### ถ้า Gemini ให้ design ไม่ครบ
```
"Google Gemini ให้ color palette มา แต่ไม่ได้ให้ component specs
ช่วย prompt Gemini เพิ่มเติมให้หน่อย"
```

### ถ้า design ไม่ชอบ
```
"ผมไม่ชอบสี primary ที่ Gemini ให้มา
ช่วยสร้าง prompt ให้ขอ revise color palette ใหม่"
```

### ถ้า agent มีปัญหา
```
"Component Agent มี error ตอน build button component
ช่วยแก้ไขให้หน่อย"
```

### ถ้าต้องการเปลี่ยนแปลงเล็กน้อย
```
"ผมอยากเปลี่ยน primary color จาก #... เป็น #...
ช่วย update theme และ rebuild components ที่เกี่ยวข้อง"
```

---

## 📞 Support

ถ้ามีปัญหาหรือคำถาม:
1. ตรวจสอบ AGENT_ARCHITECTURE.md ว่า agent แต่ละตัวทำอะไร
2. ดู DESIGN_BRIEF.md ว่าขอ design อะไรไป
3. ตรวจสอบ DESIGN_OUTPUT_TEMPLATE.md ว่ากรอกครบหรือไม่
4. ถาม Claude Code โดยตรง

---

**พร้อมสร้างเว็บไซต์ที่สวยที่สุดในไทยแล้ว! 🚀**

**Next Step**: ส่ง DESIGN_BRIEF.md ให้ Google Gemini เลย!
