# Design Guidelines: Rakeez Admin Dashboard

## Design Philosophy: Professional Enterprise Admin Interface

**Design System**: Shadcn/ui with Tailwind CSS - enterprise-grade admin interface with consistent brand identity, accessibility, and professional polish.

**Core Principles**:
- Professional brand identity throughout
- Clear information hierarchy
- Consistent visual language
- Accessible and readable (WCAG AA compliance)
- Enterprise-ready polish

---

## Official Brand Colors

**Primary Palette** (from Rakeez Brand Guidelines):
- **Dark Blue**: `#00269A` / `hsl(229 100% 30%)` - Primary brand color
- **Cyan**: `#6BDAD5` / `hsl(177 60% 64%)` - Secondary/Accent
- **Green**: `#45D492` / `hsl(152 62% 55%)` - Success/Accent
- **Light Green**: `#CBE880` / `hsl(73 70% 71%)` - Tertiary Accent

**Usage**:
- Primary actions, headings, navigation → Dark Blue
- Active states, highlights → Cyan
- Success, completed states → Green
- Tertiary accents, charts → Light Green
- Destructive actions → Red `hsl(0 84% 60%)`

---

## Typography System

**Font**: Open Sans (fallback: system sans-serif)

**Hierarchy**:
- Page Titles (h1): 24px bold, Dark Blue `text-2xl font-bold text-primary`
- Section Headers (h2): 18px semibold, Dark Blue `text-lg font-semibold text-primary`
- Subsection Headers (h3): 16px semibold `text-base font-semibold`
- Body Text: 14-16px regular, neutral dark `text-sm text-foreground`
- Helper/Metadata: 12-14px regular, muted `text-xs text-muted-foreground`
- Table Headers: 14px bold, Dark Blue `text-sm font-bold text-primary`

**Emphasis**:
- Headings → Always use Dark Blue for brand consistency
- Body text → Neutral dark gray/black for readability
- Muted text → Secondary information, timestamps, helper text

---

## Sidebar Navigation

**Visual Design**:
- Background: Dark Blue `bg-sidebar` (#00269A)
- Default links: White text `text-sidebar-foreground`
- Active/Selected: Cyan background `bg-sidebar-primary` with bold dark text `font-semibold text-sidebar-primary-foreground`
- Hover: Light blue/darker blue background `bg-sidebar-accent` with white text
- Icons: Aligned left, matching text color, 20px size

**States**:
```
Default → White text on Dark Blue
Hover → bg-sidebar-accent text-sidebar-accent-foreground
Active → bg-sidebar-primary text-sidebar-primary-foreground font-semibold
```

**Structure**:
- Logo at top with brand identity
- Navigation items with icons + labels
- Collapsible on mobile (icons only)
- Consistent 12px spacing between items

---

## Table Styling

**Structure**:
- Alternating row colors: White / Light gray `even:bg-muted/30`
- Bold headers in Dark Blue `font-bold text-primary`
- Rounded corners `rounded-lg`
- Subtle borders `border border-border`
- Consistent padding: `p-4` (cells), `p-6` (card container)

**Numeric Columns**:
- Right-aligned: `text-right`
- Monospace font for currency/IDs: `font-mono`
- Consistent decimal places

**Status Badges**:
Use brand colors for clear visual hierarchy:

**Bookings**:
- Pending → Orange `bg-orange-500`
- Confirmed → Dark Blue `bg-primary`
- In Progress → Cyan `bg-secondary`
- Completed → Green `bg-accent`
- Cancelled → Red `bg-destructive`

**Payments**:
- Paid → Green `bg-accent`
- Failed → Red `bg-destructive`
- Pending → Orange `bg-orange-500`
- Refunded → Gray `bg-muted`

**Wallets**:
- Credit → Green `bg-accent`
- Debit → Red `bg-destructive`

**Support Tickets**:
- Open → Dark Blue `bg-primary`
- In Progress → Orange `bg-orange-500`
- Resolved → Green `bg-accent`
- Closed → Gray `bg-muted`

**Badge Styling**:
```tsx
<Badge variant="default" className="bg-primary">Status</Badge>
<Badge className="bg-secondary text-secondary-foreground">Status</Badge>
<Badge className="bg-accent text-accent-foreground">Status</Badge>
<Badge className="bg-orange-500 text-white">Status</Badge>
<Badge variant="destructive">Status</Badge>
```

---

## Buttons & Actions

**Primary Action** (Create, Save, Submit):
- Background: Dark Blue `bg-primary`
- Text: White `text-primary-foreground`
- Hover: Slightly darker `hover:bg-primary/90`
- Size: `px-4 py-2`
- Border radius: `rounded-md`

**Secondary Action** (Cancel, Back):
- Variant: Outline `variant="outline"`
- Border: Input border color
- Hover: Light background `hover:bg-accent hover:text-accent-foreground`

**Tertiary/Accent Action** (Special actions):
- Background: Cyan `bg-secondary`
- Text: Dark `text-secondary-foreground`
- Hover: `hover:bg-secondary/90`

**Destructive Action** (Delete, Remove):
- Background: Red `bg-destructive`
- Text: White `text-destructive-foreground`
- Always require confirmation dialog

**Placement**:
- Primary actions: Top-right of sections
- Form actions: Bottom-right (Cancel left, Save right)
- Row actions: Dropdown menu with icon trigger

**Tooltips**:
Add to icon buttons for clarity:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>...</TooltipTrigger>
    <TooltipContent>Edit Service</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## Cards & Containers

**Card Styling**:
- Background: White `bg-card`
- Border: Subtle `border border-border`
- Rounded corners: `rounded-lg`
- Shadow: Subtle `shadow-sm`
- Padding: `p-6`
- Spacing between cards: `space-y-6`

**Consistent Pattern**:
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-2xl font-bold text-primary">Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

---

## Loading States

**Spinner**:
- Use `Loader2` from lucide-react with `animate-spin`
- Color: Primary brand `text-primary`
- Size: Match context (sm for buttons, lg for pages)

**Skeleton Loaders**:
```tsx
<Skeleton className="h-12 w-full" />
<Skeleton className="h-8 w-3/4" />
<Skeleton className="h-8 w-1/2" />
```

**Page Loading**:
Center-aligned spinner with "Loading..." text in muted color

**Button Loading**:
Disabled state with spinner + text: "Saving..."

---

## Empty States

**Structure**:
- Icon in brand color (Cyan or Green): 48px size
- Heading: "No [items] found"
- Description: Helpful message
- Action button: "Create [item]" in primary color

**Example**:
```tsx
<div className="text-center py-12">
  <FileQuestion className="mx-auto h-12 w-12 text-secondary" />
  <h3 className="mt-4 text-lg font-semibold">No bookings found</h3>
  <p className="mt-2 text-sm text-muted-foreground">
    Get started by creating a new booking
  </p>
  <Button className="mt-6 bg-primary">
    <Plus className="mr-2 h-4 w-4" />
    Create Booking
  </Button>
</div>
```

---

## Spacing System

**Consistent Units** (using Tailwind scale):
- Extra small gap: `gap-2` (8px)
- Small gap: `gap-4` (16px)
- Medium gap: `gap-6` (24px)
- Large gap: `gap-8` (32px)

**Component Spacing**:
- Card padding: `p-6`
- Form field gaps: `space-y-4`
- Section margins: `mb-6` or `space-y-6`
- Button groups: `gap-2`
- Table cell padding: `px-4 py-3`

---

## Responsive Design

**Breakpoints**:
- Mobile: < 640px - Sidebar collapses to icons only
- Tablet: 640px - 1024px - Adjusted table columns
- Desktop: > 1024px - Full layout

**Sidebar Behavior**:
- Desktop: Full width with icons + labels
- Mobile: Collapsed, icons only (or drawer menu)
- Toggle button to expand/collapse

**Table Behavior**:
- Desktop: All columns visible
- Tablet: Hide less critical columns
- Mobile: Card view instead of table

---

## Accessibility

**WCAG AA Compliance**:
- Color contrast: 4.5:1 minimum for text
- Focus indicators: Clear ring around interactive elements
- Keyboard navigation: Tab order, Enter/Escape support
- Screen reader: Proper aria labels and descriptions
- Error messages: Linked to inputs via aria-describedby

**Focus States**:
```css
focus:ring-2 focus:ring-ring focus:ring-offset-2
```

---

## Brand Elements

**Logo**:
- Official Rakeez SVG logo in sidebar header
- Dimensions: Auto height, max 40px
- Position: Top of sidebar with padding

**Favicon**:
- Brand favicon.svg in public folder
- Referenced in index.html

**Currency Symbol**:
- Use SarSymbol component (SVG) instead of text
- Import: `import { SarSymbol } from '@/components/sar-symbol'`
- Default 16px, customizable via size prop

---

## Micro-Interactions

**Hover States**:
- Buttons: Subtle background darken `hover:bg-primary/90`
- Links: Underline or background highlight
- Cards: Subtle lift `hover:shadow-md transition-shadow`

**Transitions**:
- Duration: 200ms for most interactions
- Easing: Default ease or ease-in-out
- Properties: background-color, transform, opacity

**Focus Animations**:
- Ring scales outward on focus
- Smooth transition, no jarring movements

---

## Form Components

**Input Fields**:
- Full width within container
- Height: `h-10`
- Border: `border border-input`
- Focus: `focus:ring-2 focus:ring-ring`
- Disabled: `opacity-50 cursor-not-allowed`

**Select Dropdowns**:
- Shadcn Select component
- Chevron indicator
- Same dimensions as text inputs
- Hover state on options

**Validation**:
- Error: Red border + error message below
- Success: Green border + check icon
- Required: Asterisk in label

---

## Data Visualization

**Charts** (using Recharts):
- Colors: Use brand palette variables (chart-1 through chart-5)
- Primary: Dark Blue
- Secondary: Cyan
- Tertiary: Green
- Accent: Light Green

**Tooltips**: Brand-colored background with white text

---

## Images & Icons

**Icons**:
- Source: Lucide React
- Size: Consistent per context (16px inline, 20px navigation, 24px headers)
- Color: Match parent text color
- Alignment: Vertically centered with text

**No Images Required**:
Admin dashboard is data-centric. Visual communication through typography, icons, and components.
