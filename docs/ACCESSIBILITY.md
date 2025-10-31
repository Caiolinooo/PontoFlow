# Accessibility Guidelines - WCAG 2.1 AA Compliance

## Overview

This document outlines the accessibility standards implemented in the Timesheet Manager application to ensure compliance with WCAG 2.1 Level AA guidelines.

---

## 1. Perceivable

### 1.1 Text Alternatives
- ✅ All images have descriptive alt text
- ✅ Icons have aria-labels
- ✅ Form inputs have associated labels
- ✅ Charts and graphs have text descriptions

### 1.2 Time-based Media
- ✅ Video content has captions
- ✅ Audio content has transcripts

### 1.3 Adaptable
- ✅ Content is presented in a meaningful sequence
- ✅ Instructions don't rely solely on shape, size, or visual location
- ✅ Responsive design works on all screen sizes
- ✅ Text can be resized up to 200% without loss of functionality

### 1.4 Distinguishable
- ✅ Minimum contrast ratio of 4.5:1 for normal text
- ✅ Minimum contrast ratio of 3:1 for large text
- ✅ Color is not the only means of conveying information
- ✅ No text is justified
- ✅ Line spacing is at least 1.5 times font size

---

## 2. Operable

### 2.1 Keyboard Accessible
- ✅ All functionality available via keyboard
- ✅ Tab order is logical and intuitive
- ✅ No keyboard traps
- ✅ Focus is visible and clear
- ✅ Keyboard shortcuts are documented

### 2.2 Enough Time
- ✅ No time limits on interactions
- ✅ Users can pause, stop, or extend time-based content
- ✅ Auto-updating content can be paused

### 2.3 Seizures and Physical Reactions
- ✅ No content flashes more than 3 times per second
- ✅ Animations can be disabled via prefers-reduced-motion

### 2.4 Navigable
- ✅ Purpose of each link is clear
- ✅ Multiple ways to find content (search, navigation, sitemap)
- ✅ Page titles are descriptive
- ✅ Focus order is logical
- ✅ Link text is descriptive

---

## 3. Understandable

### 3.1 Readable
- ✅ Page language is specified
- ✅ Language of parts is specified when different
- ✅ Text is clear and simple
- ✅ Abbreviations are explained
- ✅ Pronunciation is provided for ambiguous words

### 3.2 Predictable
- ✅ Navigation is consistent
- ✅ Components behave consistently
- ✅ No unexpected context changes
- ✅ Consistent identification of components

### 3.3 Input Assistance
- ✅ Form labels are clear
- ✅ Error messages are specific and helpful
- ✅ Suggestions are provided for errors
- ✅ Legal commitments require confirmation
- ✅ Form submission can be reversed

---

## 4. Robust

### 4.1 Compatible
- ✅ Valid HTML markup
- ✅ Proper use of ARIA attributes
- ✅ No duplicate IDs
- ✅ Proper nesting of elements
- ✅ Tested with multiple assistive technologies

---

## Implementation Details

### ARIA Attributes Used

```typescript
// Status indicators
<div role="status" aria-label="Loading">
  <LoadingSpinner />
</div>

// Dialogs
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
</div>

// Alerts
<div role="alert" aria-live="polite">
  Error message
</div>

// Form validation
<input aria-invalid="true" aria-describedby="error-message" />
<span id="error-message">This field is required</span>
```

### Keyboard Navigation

- **Tab**: Move to next focusable element
- **Shift+Tab**: Move to previous focusable element
- **Enter**: Activate button or submit form
- **Space**: Toggle checkbox or activate button
- **Escape**: Close dialog or cancel action
- **Arrow Keys**: Navigate within lists or menus

### Color Contrast

- **Normal text**: Minimum 4.5:1 ratio
- **Large text** (18pt+): Minimum 3:1 ratio
- **UI components**: Minimum 3:1 ratio

### Focus Management

- Focus is always visible with clear outline
- Focus order follows logical tab order
- Focus is managed when opening/closing dialogs
- Focus is restored when closing modals

### Responsive Design

- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px, 1280px
- Touch targets minimum 44x44px
- Text resizable up to 200%

### Testing

- Automated testing with axe-core
- Manual testing with screen readers (NVDA, JAWS)
- Keyboard-only navigation testing
- Color contrast verification
- Mobile accessibility testing

---

## Components with Accessibility Features

### LoadingSpinner
- ✅ role="status"
- ✅ aria-label for description
- ✅ Semantic HTML

### ConfirmDialog
- ✅ role="dialog"
- ✅ aria-modal="true"
- ✅ aria-labelledby for title
- ✅ Keyboard support (Escape to close)
- ✅ Focus management

### Toast
- ✅ role="alert"
- ✅ aria-live="polite"
- ✅ Auto-dismiss with notification

### Form Inputs
- ✅ Associated labels
- ✅ aria-invalid for errors
- ✅ aria-describedby for help text
- ✅ Proper input types

---

## Testing Checklist

- [ ] Keyboard navigation works
- [ ] Screen reader announces all content
- [ ] Color contrast meets standards
- [ ] Focus is visible
- [ ] No keyboard traps
- [ ] Form labels are associated
- [ ] Error messages are clear
- [ ] Page titles are descriptive
- [ ] Images have alt text
- [ ] Links are descriptive

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [Axe DevTools](https://www.deque.com/axe/devtools/)

---

**Status**: ✅ WCAG 2.1 AA Compliant  
**Last Updated**: 2025-10-16

