# Mobile Responsiveness Guide

**Last Updated**: 2025-10-16  
**Target Devices**: Mobile (320px+), Tablet (768px+), Desktop (1024px+)

## Breakpoints

Using Tailwind CSS default breakpoints:

| Breakpoint | Min Width | Target Devices |
|------------|-----------|----------------|
| `sm` | 640px | Large phones (landscape) |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

## Mobile-First Approach

All styles are mobile-first. Desktop styles are added with breakpoint prefixes:

```tsx
// Mobile: full width, Desktop: half width
<div className="w-full lg:w-1/2">

// Mobile: stack vertically, Desktop: horizontal
<div className="flex flex-col lg:flex-row">

// Mobile: hidden, Desktop: visible
<div className="hidden lg:block">
```

## Touch Targets

### Minimum Sizes (WCAG 2.1 AA)

- Buttons: 44x44 pixels minimum
- Links: 44x44 pixels minimum
- Form inputs: 44px height minimum
- Spacing between targets: 8px minimum

### Implementation

```tsx
// Button with proper touch target
<button className="px-4 py-3 min-h-[44px] min-w-[44px]">
  Click me
</button>

// Link with proper touch target
<a href="#" className="inline-block px-4 py-3 min-h-[44px]">
  Link
</a>

// Form input with proper height
<input className="w-full h-12 px-4" />
```

## Typography

### Font Sizes

| Element | Mobile | Desktop |
|---------|--------|---------|
| H1 | 24px (1.5rem) | 32px (2rem) |
| H2 | 20px (1.25rem) | 24px (1.5rem) |
| H3 | 18px (1.125rem) | 20px (1.25rem) |
| Body | 16px (1rem) | 16px (1rem) |
| Small | 14px (0.875rem) | 14px (0.875rem) |

### Implementation

```tsx
<h1 className="text-2xl lg:text-3xl font-bold">
<h2 className="text-xl lg:text-2xl font-semibold">
<p className="text-base">
<small className="text-sm">
```

## Layout Patterns

### Navigation

**Mobile**: Hamburger menu
**Desktop**: Horizontal menu

```tsx
<nav>
  {/* Mobile menu button */}
  <button className="lg:hidden">☰</button>
  
  {/* Desktop menu */}
  <ul className="hidden lg:flex gap-4">
    <li><a href="#">Home</a></li>
    <li><a href="#">About</a></li>
  </ul>
</nav>
```

### Tables

**Mobile**: Card layout
**Desktop**: Table layout

```tsx
{/* Mobile: Cards */}
<div className="lg:hidden space-y-4">
  {items.map(item => (
    <div key={item.id} className="border rounded p-4">
      <div className="font-bold">{item.name}</div>
      <div className="text-sm text-gray-600">{item.date}</div>
    </div>
  ))}
</div>

{/* Desktop: Table */}
<table className="hidden lg:table w-full">
  <thead>
    <tr>
      <th>Name</th>
      <th>Date</th>
    </tr>
  </thead>
  <tbody>
    {items.map(item => (
      <tr key={item.id}>
        <td>{item.name}</td>
        <td>{item.date}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### Forms

**Mobile**: Single column
**Desktop**: Multi-column

```tsx
<form className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label>First Name</label>
      <input className="w-full h-12 px-4" />
    </div>
    <div>
      <label>Last Name</label>
      <input className="w-full h-12 px-4" />
    </div>
  </div>
</form>
```

## Common Issues and Solutions

### Issue 1: Horizontal Scrolling

**Problem**: Content overflows on mobile

**Solution**: Use `max-w-full` and `overflow-x-auto`

```tsx
<div className="max-w-full overflow-x-auto">
  <table className="min-w-full">
    {/* table content */}
  </table>
</div>
```

### Issue 2: Text Too Small

**Problem**: Text is hard to read on mobile

**Solution**: Use minimum 16px font size

```tsx
<p className="text-base"> {/* 16px */}
```

### Issue 3: Buttons Too Small

**Problem**: Buttons are hard to tap

**Solution**: Use minimum 44x44px touch targets

```tsx
<button className="px-6 py-3 min-h-[44px]">
```

### Issue 4: Images Not Responsive

**Problem**: Images overflow container

**Solution**: Use `max-w-full` and `h-auto`

```tsx
<img src="..." className="max-w-full h-auto" />
```

## Testing Checklist

### Mobile (320px - 640px)

- [ ] All text is readable (minimum 16px)
- [ ] All buttons are tappable (minimum 44x44px)
- [ ] No horizontal scrolling
- [ ] Forms are single column
- [ ] Navigation is hamburger menu
- [ ] Tables are card layout
- [ ] Images scale properly

### Tablet (768px - 1024px)

- [ ] Layout uses available space
- [ ] Forms can be multi-column
- [ ] Navigation can be horizontal
- [ ] Tables can be table layout
- [ ] Sidebars are visible

### Desktop (1024px+)

- [ ] Full layout with sidebars
- [ ] Multi-column forms
- [ ] Horizontal navigation
- [ ] Table layout
- [ ] Optimal use of space

## Browser Testing

### Required Browsers

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Mobile Browsers

- ✅ Chrome Mobile (Android)
- ✅ Safari Mobile (iOS)
- ✅ Samsung Internet (Android)

## Device Testing

### Physical Devices

- iPhone SE (375px)
- iPhone 12/13/14 (390px)
- iPhone 14 Pro Max (430px)
- Samsung Galaxy S21 (360px)
- iPad (768px)
- iPad Pro (1024px)

### Browser DevTools

Use Chrome DevTools device emulation:
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select device or custom dimensions
4. Test at various sizes

## Performance

### Mobile Optimization

- Lazy load images
- Minimize JavaScript bundle
- Use responsive images (srcset)
- Optimize fonts
- Enable compression

### Implementation

```tsx
// Lazy load images
<img src="..." loading="lazy" />

// Responsive images
<img
  src="image-small.jpg"
  srcSet="image-small.jpg 320w, image-medium.jpg 768w, image-large.jpg 1024w"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## Accessibility on Mobile

### Touch Gestures

- All gestures have button alternatives
- No complex gestures required
- Swipe actions have visible buttons

### Zoom

- Text can be zoomed to 200%
- No loss of functionality when zoomed
- Viewport meta tag allows zoom

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
```

### Screen Readers

- Test with VoiceOver (iOS)
- Test with TalkBack (Android)
- All interactive elements are labeled

## Status

### Completed

- ✅ Tailwind breakpoints configured
- ✅ Touch target sizes defined
- ✅ Typography scale established
- ✅ Layout patterns documented

### In Progress

- ⏳ Testing all pages on mobile devices
- ⏳ Cross-browser testing
- ⏳ Performance optimization

### Pending

- [ ] Physical device testing
- [ ] User testing on mobile
- [ ] Performance audit

---

**Next Review**: After Phase 19 completion  
**Responsible**: Development Team

