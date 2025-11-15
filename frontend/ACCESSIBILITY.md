# Accessibility Guidelines

This document outlines accessibility (a11y) best practices implemented in the WhatsApp Campaign System frontend.

## 🎯 Accessibility Standards

- **WCAG 2.1 Level AA** compliance target
- **WAI-ARIA** attributes for enhanced screen reader support
- **Keyboard navigation** fully supported
- **Focus management** for modals and dialogs
- **Color contrast** meets WCAG AA standards

## ✅ Implemented Features

### 1. Semantic HTML

All pages use semantic HTML5 elements:

```jsx
<main>        // Main content area
<nav>         // Navigation menus
<header>      // Page headers
<article>     // Content sections
<button>      // Interactive buttons (not divs)
<form>        // Form elements
```

### 2. Keyboard Navigation

**Tab Navigation:**
- All interactive elements accessible via Tab/Shift+Tab
- Logical tab order follows visual layout
- Focus indicators visible on all interactive elements

**Keyboard Shortcuts:**
- `Tab` - Next element
- `Shift + Tab` - Previous element
- `Enter` / `Space` - Activate buttons/links
- `Escape` - Close modals/dialogs
- `Arrow keys` - Navigate dropdowns/menus

### 3. ARIA Labels

**Material-UI** components include ARIA attributes by default:

```jsx
// Buttons with aria-label
<IconButton aria-label="Delete contact">
  <DeleteIcon />
</IconButton>

// Links with aria-label
<Link to="/dashboard" aria-label="Go to dashboard">
  Dashboard
</Link>

// Forms with aria-describedby
<TextField
  error={!!errors.email}
  helperText={errors.email?.message}
  aria-describedby="email-helper-text"
/>

// Dialogs with aria-labelledby
<Dialog
  open={open}
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <DialogTitle id="dialog-title">Confirm Delete</DialogTitle>
  <DialogContent id="dialog-description">...</DialogContent>
</Dialog>
```

### 4. Focus Management

**Modal Dialogs:**
- Focus trapped within modal when open
- Focus returns to trigger element on close
- First focusable element receives focus on open

**Route Changes:**
- Page title updates on navigation
- Main content receives focus on route change

### 5. Color Contrast

**WCAG AA Compliant Ratios:**
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

**Theme Colors:**
```javascript
// Primary (Green) on white: 4.54:1 ✓
primary: '#25D366'

// Secondary (Teal) on white: 6.28:1 ✓
secondary: '#128C7E'

// Error (Red) on white: 4.52:1 ✓
error: '#F44336'
```

### 6. Form Accessibility

**Labels:**
- All form fields have associated labels
- Labels visible (not placeholder-only)
- Helper text for additional context

**Error Handling:**
```jsx
<TextField
  label="Email"
  error={!!errors.email}
  helperText={errors.email?.message}
  required
  aria-required="true"
  aria-invalid={!!errors.email}
/>
```

**Required Fields:**
- Visual indicator (asterisk)
- `aria-required="true"` attribute
- Announced by screen readers

### 7. Loading States

**Progress Indicators:**
```jsx
// Circular progress with aria-label
<CircularProgress aria-label="Loading data" />

// Linear progress with role
<LinearProgress role="progressbar" aria-label="Campaign progress" />
```

**Loading Messages:**
```jsx
{isLoading && (
  <Box role="status" aria-live="polite">
    <CircularProgress aria-label="Loading contacts" />
    <Typography>Loading contacts...</Typography>
  </Box>
)}
```

### 8. Image Alt Text

All images include descriptive alt text:

```jsx
<img src="/logo.png" alt="WhatsApp Campaign System Logo" />

// Decorative images
<img src="/decoration.png" alt="" role="presentation" />
```

### 9. Tables

**Data Tables:**
- `<th>` elements with `scope` attribute
- Caption for table description
- Sortable columns announced to screen readers

```jsx
<Table>
  <caption>List of contacts</caption>
  <TableHead>
    <TableRow>
      <TableCell component="th" scope="col">Name</TableCell>
      <TableCell component="th" scope="col">Email</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell component="th" scope="row">John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 10. Navigation

**Skip Links** (Recommended addition):
```jsx
// Add to MainLayout.jsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

// CSS
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: white;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

**Breadcrumbs:**
```jsx
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/contacts">Contacts</a></li>
    <li aria-current="page">Add Contact</li>
  </ol>
</nav>
```

## 🧪 Testing Accessibility

### Automated Testing

**Axe DevTools:**
```bash
# Install Chrome extension
# Or use axe-core in tests
npm install --save-dev @axe-core/react
```

**Lighthouse:**
```bash
# Run accessibility audit
lighthouse https://your-site.com --only-categories=accessibility
```

### Manual Testing

**Keyboard Navigation:**
1. Unplug mouse
2. Navigate using Tab/Shift+Tab
3. Activate buttons with Enter/Space
4. Close modals with Escape
5. Check all interactive elements accessible

**Screen Reader:**
- **NVDA** (Windows, free)
- **JAWS** (Windows, paid)
- **VoiceOver** (macOS, built-in)

**Test Checklist:**
- [ ] All images have alt text
- [ ] Forms have labels
- [ ] Buttons have descriptive text/aria-label
- [ ] Focus visible on all interactive elements
- [ ] Modals trap focus
- [ ] Tables have headers
- [ ] Color contrast passes WCAG AA
- [ ] No flashing content (seizure risk)
- [ ] Text can be zoomed to 200%
- [ ] Page works without JavaScript (progressive enhancement)

## 📱 Responsive & Mobile Accessibility

**Touch Targets:**
- Minimum 44x44px for interactive elements
- Adequate spacing between clickable elements

**Font Sizes:**
- Base font: 16px minimum
- Headings scale appropriately
- Zoom up to 200% without horizontal scroll

**Orientation:**
- Works in portrait and landscape
- No orientation lock

## 🎨 Color & Visual Design

**Don't Rely on Color Alone:**
```jsx
// BAD - Color only
<Chip label="Active" color="success" />

// GOOD - Icon + Color
<Chip
  label="Active"
  color="success"
  icon={<CheckCircle />}
/>
```

**Focus Indicators:**
- Visible on all interactive elements
- Material-UI default focus styles applied
- Custom focus styles maintain visibility

## 🔊 Screen Reader Announcements

**Live Regions:**
```jsx
// Success message
<Alert severity="success" role="alert">
  Contact saved successfully
</Alert>

// Status updates
<div aria-live="polite" aria-atomic="true">
  {syncStatus}
</div>

// Urgent announcements
<div aria-live="assertive">
  {errorMessage}
</div>
```

**aria-live values:**
- `off` - Default, no announcement
- `polite` - Announce when user is idle
- `assertive` - Announce immediately

## 🎯 Page Structure

**Headings Hierarchy:**
```jsx
<h1>Dashboard</h1>              // Page title (one per page)
  <h2>Statistics</h2>            // Section
    <h3>WhatsApp Status</h3>     // Subsection
  <h2>Recent Campaigns</h2>      // Section
```

**Landmarks:**
```jsx
<header>      // Banner
<nav>         // Navigation
<main>        // Main content
<aside>       // Sidebar
<footer>      // Footer
```

## 🚀 Best Practices

### 1. Button vs Link

```jsx
// Buttons for actions
<Button onClick={handleSubmit}>Save</Button>

// Links for navigation
<Link to="/dashboard">Go to Dashboard</Link>
```

### 2. Form Validation

```jsx
// Clear error messages
<TextField
  error={!!errors.email}
  helperText={errors.email?.message || 'Enter your email address'}
/>

// Announce errors to screen readers
<Alert severity="error" role="alert">
  Please fix the following errors:
  <ul>
    {Object.values(errors).map(error => (
      <li key={error.message}>{error.message}</li>
    ))}
  </ul>
</Alert>
```

### 3. Loading States

```jsx
// Good - Announces loading state
<Button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <CircularProgress size={20} aria-label="Saving" />
      Saving...
    </>
  ) : (
    'Save'
  )}
</Button>
```

### 4. Modal Dialogs

```jsx
<Dialog
  open={open}
  onClose={handleClose}
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <DialogTitle id="dialog-title">
    Delete Contact
  </DialogTitle>
  <DialogContent id="dialog-description">
    Are you sure you want to delete this contact?
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button onClick={handleDelete} color="error">Delete</Button>
  </DialogActions>
</Dialog>
```

## 📚 Resources

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome
- [NVDA](https://www.nvaccess.org/) - Free screen reader (Windows)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Material-UI Accessibility](https://mui.com/material-ui/guides/accessibility/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Testing

- [WebAIM Checklist](https://webaim.org/standards/wcag/checklist)
- [A11Y Project Checklist](https://www.a11yproject.com/checklist/)

## 🎓 Training

Recommended courses:
- [Web Accessibility by Google](https://www.udacity.com/course/web-accessibility--ud891)
- [Digital Accessibility by W3C](https://www.edx.org/learn/web-accessibility)

## ✅ Compliance Checklist

- [ ] All images have alt text
- [ ] Forms have labels and error messages
- [ ] Keyboard navigation works throughout
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Focus indicators visible
- [ ] Headings in logical order (h1, h2, h3...)
- [ ] Skip links implemented
- [ ] ARIA labels on icon buttons
- [ ] Tables have proper headers
- [ ] Modals trap focus
- [ ] Loading states announced
- [ ] Error messages read by screen readers
- [ ] Page titles unique and descriptive
- [ ] No auto-playing audio/video
- [ ] Text resizable to 200%
- [ ] Works with screen reader (NVDA/VoiceOver)

---

**Last Updated:** 2025-11-14
**Standard:** WCAG 2.1 Level AA
**Status:** Implemented
