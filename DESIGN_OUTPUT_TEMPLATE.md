# Design System Output Template
**วางข้อมูลที่ได้จาก Google Gemini ที่นี่**

---

## 1. Color Palette

### Primary Colors
```
Primary 50:  #______
Primary 100: #______
Primary 200: #______
Primary 300: #______
Primary 400: #______
Primary 500: #______ (Main brand color)
Primary 600: #______
Primary 700: #______
Primary 800: #______
Primary 900: #______
```

### Secondary Colors
```
Secondary 50:  #______
Secondary 100: #______
Secondary 200: #______
Secondary 300: #______
Secondary 400: #______
Secondary 500: #______ (Main secondary color)
Secondary 600: #______
Secondary 700: #______
Secondary 800: #______
Secondary 900: #______
```

### Neutral Colors
```
Gray 50:  #______
Gray 100: #______
Gray 200: #______
Gray 300: #______
Gray 400: #______
Gray 500: #______
Gray 600: #______
Gray 700: #______
Gray 800: #______
Gray 900: #______
```

### Semantic Colors
```
Success 50:  #______
Success 500: #______
Success 600: #______

Error 50:  #______
Error 500: #______
Error 600: #______

Warning 50:  #______
Warning 500: #______
Warning 600: #______

Info 50:  #______
Info 500: #______
Info 600: #______
```

### Color Usage Guidelines
- **Primary**: [วิธีใช้สี primary]
- **Secondary**: [วิธีใช้สี secondary]
- **Neutrals**: [วิธีใช้สี neutral]

---

## 2. Typography

### Font Families
```
Heading Font: [ชื่อ font]
- Weights: [ระบุ weights ที่ใช้]
- Google Fonts URL: [URL ถ้ามี]

Body Font: [ชื่อ font]
- Weights: [ระบุ weights ที่ใช้]
- Google Fonts URL: [URL ถ้ามี]

Thai Font: [ชื่อ font ภาษาไทย]
- Weights: [ระบุ weights ที่ใช้]
- Google Fonts URL: [URL ถ้ามี]
```

### Font Size Scale
```
xs:   [__px / __rem] - [line-height]
sm:   [__px / __rem] - [line-height]
base: [__px / __rem] - [line-height]
lg:   [__px / __rem] - [line-height]
xl:   [__px / __rem] - [line-height]
2xl:  [__px / __rem] - [line-height]
3xl:  [__px / __rem] - [line-height]
4xl:  [__px / __rem] - [line-height]
5xl:  [__px / __rem] - [line-height]
6xl:  [__px / __rem] - [line-height]
```

### Typography Usage
- **Headings**: [H1-H6 sizes และ weights]
- **Body Text**: [font size และ line height]
- **Captions**: [font size และ style]
- **Buttons**: [font size และ weight]

---

## 3. Spacing Scale
```
0:    0px
1:    [__px]
2:    [__px]
3:    [__px]
4:    [__px]
5:    [__px]
6:    [__px]
8:    [__px]
10:   [__px]
12:   [__px]
16:   [__px]
20:   [__px]
24:   [__px]
32:   [__px]
40:   [__px]
48:   [__px]
64:   [__px]
```

---

## 4. Border Radius
```
none: 0px
sm:   [__px]
base: [__px]
md:   [__px]
lg:   [__px]
xl:   [__px]
2xl:  [__px]
full: 9999px
```

---

## 5. Shadows
```
sm:   [box-shadow value]
base: [box-shadow value]
md:   [box-shadow value]
lg:   [box-shadow value]
xl:   [box-shadow value]
2xl:  [box-shadow value]
```

---

## 6. Component Specifications

### Button Component

#### Primary Button
```
Background: [color]
Text: [color]
Padding: [top/bottom] [left/right]
Border Radius: [value]
Font Size: [value]
Font Weight: [value]
Shadow: [value]

Hover State:
- Background: [color]
- Shadow: [value]

Active State:
- Background: [color]

Disabled State:
- Background: [color]
- Text: [color]
- Opacity: [value]
```

#### Secondary Button
```
[Same structure as above]
```

#### Outline Button
```
[Same structure as above]
```

### Input Component
```
Background: [color]
Border: [width] [color]
Border Radius: [value]
Padding: [value]
Font Size: [value]
Height: [value]

Focus State:
- Border Color: [color]
- Shadow: [value]

Error State:
- Border Color: [color]

Disabled State:
- Background: [color]
- Opacity: [value]
```

### Card Component
```
Background: [color]
Border: [value]
Border Radius: [value]
Shadow: [value]
Padding: [value]

Hover State:
- Shadow: [value]
- Transform: [value if any]
```

### [ระบุ components อื่นๆ ตาม design]

---

## 7. Icon System

### Icon Style
- [ ] Line icons
- [ ] Filled icons
- [ ] Duotone icons

### Icon Library Recommendation
[ชื่อ icon library ที่แนะนำ]

### Icon Sizes
```
xs:  [__px × __px]
sm:  [__px × __px]
md:  [__px × __px]
lg:  [__px × __px]
xl:  [__px × __px]
```

### Custom Icons Needed
- [รายการ custom icons ที่ต้องออกแบบเอง]

---

## 8. Layout Specifications

### Container
```
Max Width: [__px]
Padding (Mobile): [value]
Padding (Desktop): [value]
```

### Grid System
```
Columns (Mobile): [number]
Columns (Tablet): [number]
Columns (Desktop): [number]
Gap: [value]
```

### Breakpoints
```
sm:  [__px]
md:  [__px]
lg:  [__px]
xl:  [__px]
2xl: [__px]
```

---

## 9. Animation Specifications

### Transition Duration
```
Fast:   [__ms]
Normal: [__ms]
Slow:   [__ms]
```

### Easing Functions
```
Default: [cubic-bezier or keyword]
In:      [cubic-bezier or keyword]
Out:     [cubic-bezier or keyword]
InOut:   [cubic-bezier or keyword]
```

### Common Animations
- **Hover**: [animation description]
- **Focus**: [animation description]
- **Modal**: [animation description]
- **Page Transition**: [animation description]

---

## 10. Page-Specific Designs

### Homepage

#### Hero Section
```
Height (Desktop): [value]
Height (Mobile): [value]
Background: [color/image/gradient]
Overlay: [color and opacity]

Heading:
- Font Size: [value]
- Font Weight: [value]
- Color: [value]

CTA Button:
- Size: [value]
- Variant: [primary/secondary]
```

#### Featured Vehicles Section
```
Layout: [grid/carousel]
Cards Per Row: [desktop] / [tablet] / [mobile]
Gap: [value]
```

### [ระบุหน้าอื่นๆ ตาม design]

---

## 11. Thai Cultural Elements

### Design Integration
[อธิบายว่า design ใช้ Thai elements อย่างไร]

### Color Inspiration
[อธิบาย color palette ว่าได้แรงบันดาลใจจากอะไร]

### Pattern Usage
[ถ้ามี Thai patterns ใช้ที่ไหน อย่างไร]

---

## 12. Figma File / Design Assets

### Figma Link
[URL to Figma file if available]

### Asset Export
- [ ] Icons exported
- [ ] Images exported
- [ ] Patterns exported
- [ ] Logos exported

---

## 13. Implementation Notes

### Priority Order
1. [First component/page to implement]
2. [Second component/page to implement]
3. [etc...]

### Special Considerations
[หมายเหตุพิเศษสำหรับการ implement]

---

## 14. Design Rationale

### Why This Color Palette?
[คำอธิบายจาก Gemini]

### Why This Typography?
[คำอธิบายจาก Gemini]

### Why This Layout Approach?
[คำอธิบายจาก Gemini]

---

## 15. Accessibility Compliance

### Color Contrast Ratios
- Primary on White: [ratio]
- Secondary on White: [ratio]
- Text on Background: [ratio]
[etc...]

### Focus Indicators
[ลักษณะ focus indicator]

### ARIA Considerations
[หมายเหตุเรื่อง ARIA labels]

---

**พร้อมสำหรับการ implement แล้ว!**
