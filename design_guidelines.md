# Design Guidelines: Rakeez Admin Dashboard User Management

## Design Approach: Shadcn/ui Design System

**Selected Framework**: Shadcn/ui with Tailwind CSS - optimal for utility-focused admin interfaces requiring consistency, accessibility, and rapid development.

**Core Principles**:
- Clarity over decoration
- Predictable interactions
- Information hierarchy through typography and spacing
- Accessible contrast ratios (WCAG AA minimum)

---

## Color Palette

**Light Mode**:
- Background: 0 0% 100% (white)
- Card/Dialog: 0 0% 100%
- Border: 214 32% 91% (subtle gray)
- Input Background: 0 0% 100%
- Muted: 210 40% 96.1%
- Primary: 222 47% 11% (near-black for buttons)
- Destructive: 0 84% 60% (red for delete actions)
- Success: 142 76% 36% (green for verification states)
- Text Primary: 222 47% 11%
- Text Muted: 215 16% 47%

**Dark Mode**:
- Background: 222 47% 11%
- Card/Dialog: 217 33% 17%
- Border: 217 33% 24%
- Input Background: 217 33% 17%
- Muted: 217 33% 21%
- Primary: 210 40% 98% (light buttons)
- Text Primary: 210 40% 98%
- Text Muted: 215 20% 65%

---

## Typography

**Font Stack**: Inter (via CDN) with system fallbacks
- Display/Headings: 600 weight
- Body/Labels: 500 weight
- Helper Text: 400 weight

**Scale**:
- Dialog Title: text-lg (18px) font-semibold
- Section Headers: text-sm (14px) font-medium
- Form Labels: text-sm (14px) font-medium
- Input Text: text-sm (14px)
- Helper/Error Text: text-xs (12px)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-6
- Form field gaps: space-y-4
- Input internal padding: px-3 py-2
- Button padding: px-4 py-2
- Dialog spacing: p-6 for content, p-4 for footer

**Dialog Dimensions**:
- Width: max-w-md (448px) for single-column forms
- Height: Auto-grow with content, max-h-[85vh] with scroll
- Backdrop: rgba blur (backdrop-blur-sm)

---

## Form Components

### Dialog Structure
**Header**: Title (left-aligned), close button (absolute top-right with hover:bg-accent)
**Content**: Single column, full-width fields, space-y-4
**Footer**: Sticky bottom, flex justify-end, gap-2, border-t with pt-4

### Input Fields
**Text Inputs** (name, email, phone):
- Full width with border, rounded-md (6px)
- Focus ring: ring-2 ring-ring ring-offset-2
- Height: h-10
- Disabled state: opacity-50 cursor-not-allowed

**Select/Dropdown** (role, language):
- Shadcn Select component with chevron icon
- Same dimensions as text inputs
- Option list: bg-popover with border, shadow-md, rounded-md
- Hover state on options: bg-accent

**Toggle/Switch** (verification status):
- Inline with label (flex items-center justify-between)
- Shadcn Switch component
- Active state: bg-primary with checkmark thumb
- Visual feedback: transition-colors duration-200

### Validation States

**Default/Untouched**:
- Border: border (neutral)
- No additional styling

**Error State**:
- Border: border-destructive (red)
- Helper text: text-destructive text-xs mt-1
- Icon: AlertCircle (red) positioned right inside input
- Shake animation on submit attempt

**Success State**:
- Border: border-success (green)
- Icon: CheckCircle (green) positioned right inside input
- Only show after validation passes

**Required Fields**:
- Asterisk (*) in text-destructive after label
- "Required" helper text in muted color below empty fields on blur

### Buttons

**Primary Action** (Create/Save):
- bg-primary text-primary-foreground
- Full: px-4 py-2 rounded-md font-medium
- Hover: bg-primary/90
- Loading: disabled state with spinner (Loader2 spinning icon)

**Secondary Action** (Cancel):
- variant="outline"
- border border-input bg-background
- Hover: bg-accent text-accent-foreground

**Destructive Action** (Delete - if applicable):
- variant="destructive"
- bg-destructive text-destructive-foreground
- Confirm dialog before action

**Button Order**: Cancel (left), Primary (right) in dialog footer

---

## Form-Specific Configurations

### Technician Form Fields
1. **Full Name** (text input, required)
2. **Email** (email input, required, validation regex)
3. **Phone** (tel input, required, format: international)
4. **Role** (select: Technician, Senior Technician, Team Lead)
5. **Language Preference** (select: English, Arabic, Both)
6. **Verification Status** (toggle: Verified/Unverified)
7. **Hidden Field**: ID (for edit mode only)

### Customer Form Fields
1. **Full Name** (text input, required)
2. **Email** (email input, required)
3. **Phone** (tel input, required)
4. **Language Preference** (select: English, Arabic)
5. **Account Status** (toggle: Active/Inactive)

---

## Interaction Patterns

**Loading States**: Disable all inputs, show spinner on submit button, overlay subtle opacity on form
**Empty States**: Placeholder text in muted color (e.g., "Enter customer name")
**Keyboard Navigation**: Tab order follows visual order, Enter submits form, Escape closes dialog
**Focus Management**: Auto-focus first input on dialog open, return focus to trigger on close
**RTL Support**: Automatically flip layout when Arabic selected using dir="rtl" on dialog

---

## Micro-Interactions

**Form Transitions**: Dialog slides up with fade (duration-200)
**Field Focus**: Scale ring outward (scale animation)
**Toggle Animation**: Thumb slides with spring easing (duration-200)
**Error Shake**: translateX keyframe animation (subtle, 2-3px)
**Success Check**: Scale in checkmark icon (duration-300)

---

## Accessibility

- All inputs have associated labels (for attribute)
- Error messages have aria-describedby linking
- Dialog has aria-labelledby for title
- Color contrast meets WCAG AA (4.5:1 minimum)
- Focus indicators visible and clear
- Screen reader announcements for state changes

---

## Images Section

**No images required** - This is a modal dialog system for data entry. All visual communication achieved through typography, iconography (from Lucide React), and form components. Dialogs overlay the main dashboard content.