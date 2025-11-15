# TODO - Phase 4: Frontend Dashboard

**Phase:** 4 - Frontend Dashboard and Monitoring
**Status:** 🚧 In Progress
**Started:** 2025-11-14
**Target Completion:** TBD

---

## Overview

Develop a comprehensive React-based frontend dashboard for consultants and administrators to manage WhatsApp campaigns, view statistics, and monitor system health.

### Goals

- ✅ User-friendly interface for consultants
- ✅ Real-time statistics and monitoring
- ✅ Mobile-responsive design
- ✅ Interactive charts and graphs
- ✅ Seamless API integration
- ✅ Role-based UI (Consultant vs Admin)

---

## Checkpoint 6.1: Frontend Project Setup

**Priority:** 🔴 Critical
**Status:** ⏳ Pending
**Estimated Time:** 2-3 hours

### Tasks

- [ ] **6.1.1** Initialize React project with Vite or Create React App
  - Choose build tool (Vite recommended for speed)
  - Configure TypeScript (optional but recommended)
  - Set up ESLint and Prettier
  - Configure path aliases (@components, @pages, etc.)

- [ ] **6.1.2** Install core dependencies
  - React Router DOM (v6+)
  - Axios or Fetch wrapper for API calls
  - TanStack Query (React Query) for data fetching
  - Zustand or Context API for state management
  - Material-UI (MUI) or Tailwind CSS for styling
  - Date-fns or Day.js for date handling
  - React Hook Form for form management
  - Zod or Yup for validation

- [ ] **6.1.3** Configure build and development environment
  - Set up environment variables (.env.local, .env.production)
  - Configure proxy for API calls (backend at :3000)
  - Set up hot module replacement
  - Configure build optimization

- [ ] **6.1.4** Create project structure
  ```
  frontend/
  ├── public/
  ├── src/
  │   ├── api/              # API client and endpoints
  │   ├── components/       # Reusable components
  │   │   ├── common/       # Buttons, Inputs, etc.
  │   │   ├── layout/       # Navbar, Sidebar, Footer
  │   │   └── dashboard/    # Dashboard-specific components
  │   ├── pages/            # Page components
  │   ├── hooks/            # Custom React hooks
  │   ├── utils/            # Helper functions
  │   ├── store/            # State management
  │   ├── types/            # TypeScript types
  │   ├── constants/        # Constants and config
  │   ├── App.tsx
  │   └── main.tsx
  ├── package.json
  └── vite.config.ts
  ```

- [ ] **6.1.5** Docker configuration for frontend
  - Create `frontend/Dockerfile`
  - Update `docker-compose.yml` with frontend service
  - Configure nginx for production serving
  - Set up volume mounts for development

### Acceptance Criteria

- [ ] React app runs successfully on http://localhost:5173 (or :3001)
- [ ] Hot reload working in development
- [ ] Production build succeeds without errors
- [ ] Docker container runs and serves the app
- [ ] All dependencies installed and configured

---

## Checkpoint 6.2: Authentication Pages

**Priority:** 🔴 Critical
**Status:** ⏳ Pending
**Estimated Time:** 4-5 hours

### Tasks

- [ ] **6.2.1** Create API client for authentication
  - Axios instance with base URL
  - Request/response interceptors
  - Token management (localStorage)
  - Auto-retry logic for failed requests
  - Error handling utilities

- [ ] **6.2.2** Build Login page
  - Email and password fields
  - Form validation (React Hook Form + Zod)
  - Loading state during API call
  - Error message display
  - "Remember me" checkbox
  - "Forgot password" link (placeholder)
  - Redirect to dashboard on success

- [ ] **6.2.3** Build Register page
  - Name, email, password, phone fields
  - Password strength indicator
  - Confirm password validation
  - Terms of service checkbox
  - Form validation
  - Success message and redirect to login
  - Link to login page

- [ ] **6.2.4** Implement authentication context/store
  - User state management
  - Login/logout functions
  - Token persistence
  - Auto-logout on token expiry
  - Protected route wrapper
  - Role-based access control

- [ ] **6.2.5** Create ProtectedRoute component
  - Check if user is authenticated
  - Redirect to login if not
  - Check user role for admin routes
  - Loading state while checking auth

### API Endpoints to Integrate

- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`
- POST `/api/auth/logout`

### Acceptance Criteria

- [ ] User can register a new account
- [ ] User can login with credentials
- [ ] JWT token stored in localStorage
- [ ] User redirected to dashboard after login
- [ ] User can logout
- [ ] Protected routes redirect to login if not authenticated
- [ ] Form validation works correctly
- [ ] Error messages displayed properly

---

## Checkpoint 6.3: Dashboard Layout & Navigation

**Priority:** 🔴 Critical
**Status:** ⏳ Pending
**Estimated Time:** 4-5 hours

### Tasks

- [ ] **6.3.1** Create main layout component
  - Sidebar navigation
  - Top navbar (user info, logout)
  - Main content area
  - Responsive design (mobile drawer)
  - Breadcrumbs
  - Notifications bell (placeholder)

- [ ] **6.3.2** Build navigation menu
  - Dashboard (home)
  - WhatsApp Connection
  - Contacts
  - Campaigns
  - Messages
  - Templates
  - Settings
  - Admin section (conditional, admin only)

- [ ] **6.3.3** Create user profile dropdown
  - Display user name and email
  - Logout button
  - Profile settings link (placeholder)
  - Theme toggle (light/dark mode - optional)

- [ ] **6.3.4** Implement routing structure
  - `/` - Redirect to `/dashboard`
  - `/login` - Login page
  - `/register` - Register page
  - `/dashboard` - Main dashboard (stats overview)
  - `/whatsapp` - WhatsApp connection
  - `/contacts` - Contact management
  - `/campaigns` - Campaign list
  - `/campaigns/new` - Create campaign
  - `/campaigns/:id` - Campaign details
  - `/messages` - Message history
  - `/templates` - Message templates
  - `/admin` - Admin panel (admin only)
  - `/admin/consultants` - Consultant management
  - `/admin/stats` - System statistics

- [ ] **6.3.5** Add loading states and skeleton screens
  - Page loading indicator
  - Skeleton loaders for data tables
  - Skeleton loaders for cards

### Acceptance Criteria

- [ ] Layout renders correctly on desktop and mobile
- [ ] Navigation menu highlights active route
- [ ] User can navigate between pages
- [ ] Sidebar collapses on mobile
- [ ] User profile dropdown works
- [ ] Logout functionality works
- [ ] Admin menu only visible to admin users
- [ ] Loading states show during navigation

---

## Checkpoint 6.4: Consultant Dashboard (Main Page)

**Priority:** 🟡 High
**Status:** ⏳ Pending
**Estimated Time:** 5-6 hours

### Tasks

- [ ] **6.4.1** Create dashboard stats cards
  - Total contacts card
  - Total campaigns card
  - Messages sent today card
  - Total messages sent card
  - Read rate percentage card
  - WhatsApp connection status card

- [ ] **6.4.2** Build warmup status section
  - Current warmup phase display
  - Daily limit progress bar
  - Messages sent today / remaining
  - Days in current phase
  - Next phase information

- [ ] **6.4.3** Create recent campaigns table
  - Campaign name
  - Status (draft, scheduled, running, completed)
  - Total recipients
  - Messages sent
  - Created date
  - Actions (view, edit, delete)
  - Pagination

- [ ] **6.4.4** Add charts and visualizations
  - Messages sent per day (line chart - last 7 days)
  - Read rate trend (line chart)
  - Campaign performance (bar chart)
  - Use Chart.js or Recharts library

- [ ] **6.4.5** Implement auto-refresh
  - Refresh stats every 30 seconds
  - Use React Query for automatic refetch
  - Show last updated timestamp
  - Manual refresh button

### API Endpoints to Integrate

- GET `/api/consultants/dashboard`

### Acceptance Criteria

- [ ] All stats display correctly
- [ ] Warmup status shows current phase
- [ ] Recent campaigns table populated
- [ ] Charts render with real data
- [ ] Data auto-refreshes every 30 seconds
- [ ] Loading states during data fetch
- [ ] Error states if API fails
- [ ] Responsive on mobile devices

---

## Checkpoint 6.5: WhatsApp Connection Page

**Priority:** 🔴 Critical
**Status:** ⏳ Pending
**Estimated Time:** 4-5 hours

### Tasks

- [ ] **6.5.1** Create connection status display
  - Current status badge (pending, active, offline)
  - Connected phone number (if connected)
  - Connection timestamp
  - Instance name

- [ ] **6.5.2** Build QR code display
  - "Connect" button to request QR code
  - QR code image display (base64)
  - Countdown timer (45 seconds)
  - Instructions text
  - Auto-refresh QR code on expiry

- [ ] **6.5.3** Implement disconnect functionality
  - "Disconnect" button (only when connected)
  - Confirmation modal
  - Success/error feedback

- [ ] **6.5.4** Add connection status polling
  - Poll `/api/whatsapp/status` every 3 seconds when pending
  - Stop polling when connected
  - Show "Connecting..." animation
  - Update UI when status changes

- [ ] **6.5.5** Create connection history (optional)
  - Show past connections
  - Disconnect/reconnect timestamps
  - Connection duration

### API Endpoints to Integrate

- POST `/api/whatsapp/connect`
- GET `/api/whatsapp/status`
- POST `/api/whatsapp/disconnect`

### Acceptance Criteria

- [ ] QR code displays correctly
- [ ] QR code countdown timer works
- [ ] User can scan QR code and connect
- [ ] Status updates automatically when connected
- [ ] Disconnect functionality works
- [ ] Confirmation modal shows before disconnect
- [ ] Connection status badge accurate
- [ ] Polling starts/stops appropriately

---

## Checkpoint 6.6: Contact Management Page

**Priority:** 🟡 High
**Status:** ⏳ Pending
**Estimated Time:** 6-8 hours

### Tasks

- [ ] **6.6.1** Create contacts table
  - Name column
  - Phone number column
  - WhatsApp number column
  - Last message date column
  - Actions column (edit, delete)
  - Sortable columns
  - Pagination (server-side or client-side)

- [ ] **6.6.2** Implement search and filters
  - Search by name or phone
  - Filter by last message date
  - Filter by campaign
  - Clear filters button

- [ ] **6.6.3** Build "Sync from WhatsApp" button
  - Trigger `/api/contacts/sync` endpoint
  - Loading state during sync
  - Progress indicator
  - Success message with sync stats (inserted, updated)
  - Error handling

- [ ] **6.6.4** Create contact details modal
  - View full contact information
  - Message history with this contact
  - Edit contact button
  - Delete contact button

- [ ] **6.6.5** Add/Edit contact form
  - Name field
  - Phone number field
  - WhatsApp number field (auto-populated)
  - Tags/labels (optional)
  - Form validation
  - Submit API call

- [ ] **6.6.6** Implement bulk actions
  - Select multiple contacts (checkboxes)
  - Bulk delete
  - Bulk add to campaign (future)
  - Export selected to CSV

### API Endpoints to Integrate

- GET `/api/contacts` (with query params for pagination, search, filters)
- POST `/api/contacts/sync`
- GET `/api/contacts/:id`
- POST `/api/contacts`
- PUT `/api/contacts/:id`
- DELETE `/api/contacts/:id`

### Acceptance Criteria

- [ ] Contacts table displays all contacts
- [ ] Pagination works correctly
- [ ] Search filters contacts in real-time
- [ ] Sync button fetches contacts from WhatsApp
- [ ] Sync progress and results shown
- [ ] User can add new contact manually
- [ ] User can edit existing contact
- [ ] User can delete contact with confirmation
- [ ] Bulk selection and actions work
- [ ] Table is responsive on mobile

---

## Checkpoint 6.7: Campaign Management Pages

**Priority:** 🟡 High
**Status:** ⏳ Pending
**Estimated Time:** 8-10 hours

### Tasks

- [ ] **6.7.1** Create campaigns list page
  - Campaign name
  - Status badge (draft, scheduled, running, completed)
  - Recipients count
  - Messages sent / total
  - Created date
  - Actions (view, edit, delete, start/stop)
  - Filter by status
  - Search by name

- [ ] **6.7.2** Build "Create Campaign" form
  - Campaign name field
  - Message template selection
  - Recipient selection (from contacts)
  - Schedule date/time picker
  - Preview section
  - Validation
  - Save as draft or schedule

- [ ] **6.7.3** Implement recipient selection
  - List of all contacts with checkboxes
  - Search contacts
  - "Select All" / "Deselect All"
  - Show selected count
  - Remove individual recipients

- [ ] **6.7.4** Create message template editor
  - Template name
  - Message content textarea
  - Variable placeholders ({{name}}, {{phone}})
  - Character counter
  - Preview with sample data
  - Save template

- [ ] **6.7.5** Build campaign details page
  - Campaign overview (name, status, dates)
  - Recipients list
  - Messages sent table (name, status, sent time, read time)
  - Statistics (sent, delivered, read, failed)
  - Start/stop/pause campaign buttons
  - Progress bar

- [ ] **6.7.6** Implement campaign actions
  - Start campaign (API call)
  - Stop campaign (with confirmation)
  - Delete campaign (with confirmation)
  - Duplicate campaign (optional)

### API Endpoints to Integrate

- GET `/api/campaigns`
- POST `/api/campaigns`
- GET `/api/campaigns/:id`
- PUT `/api/campaigns/:id`
- DELETE `/api/campaigns/:id`
- POST `/api/campaigns/:id/start`
- POST `/api/campaigns/:id/stop`
- GET `/api/campaigns/:id/messages`

### Acceptance Criteria

- [ ] Campaigns list displays all campaigns
- [ ] User can create a new campaign
- [ ] Recipient selection works
- [ ] Template editor functional
- [ ] Campaign can be scheduled for future
- [ ] Campaign details page shows full info
- [ ] Messages table shows all recipients
- [ ] User can start/stop campaign
- [ ] Delete confirmation works
- [ ] Form validation prevents errors
- [ ] Real-time progress updates during campaign

---

## Checkpoint 6.8: Admin Panel

**Priority:** 🟢 Medium
**Status:** ⏳ Pending
**Estimated Time:** 5-6 hours

### Tasks

- [ ] **6.8.1** Create admin dashboard page
  - System-wide statistics cards
  - Total consultants (active/inactive)
  - Total contacts across all consultants
  - Total campaigns
  - Total messages sent
  - Messages sent this week
  - Active WhatsApp connections

- [ ] **6.8.2** Build consultants management table
  - Consultant name
  - Email
  - Phone
  - WhatsApp status
  - Contacts count
  - Campaigns count
  - Messages sent
  - Active/inactive toggle
  - Actions (view details, edit, deactivate)

- [ ] **6.8.3** Create consultant details modal
  - Full consultant information
  - Recent campaigns
  - Contact list
  - Message history
  - Edit button

- [ ] **6.8.4** Implement consultant activation toggle
  - Toggle active/inactive status
  - API call to `/api/admin/consultants/:id/toggle-active`
  - Confirmation before deactivating
  - Success/error feedback

- [ ] **6.8.5** Add system charts
  - Messages sent per day (all consultants)
  - Top performing consultants
  - Campaign success rate
  - WhatsApp connection health

### API Endpoints to Integrate

- GET `/api/admin/consultants`
- GET `/api/admin/stats`
- PUT `/api/admin/consultants/:id`
- POST `/api/admin/consultants/:id/toggle-active`

### Acceptance Criteria

- [ ] Admin dashboard shows system-wide stats
- [ ] Consultants table populated
- [ ] Admin can view consultant details
- [ ] Admin can activate/deactivate consultants
- [ ] Charts display aggregated data
- [ ] Only admin role can access these pages
- [ ] Non-admin redirected if accessing admin URLs

---

## Checkpoint 6.9: Real-Time Updates & Notifications

**Priority:** 🟢 Medium
**Status:** ⏳ Pending
**Estimated Time:** 4-5 hours

### Tasks

- [ ] **6.9.1** Implement React Query for data fetching
  - Set up QueryClient
  - Configure cache and refetch policies
  - Add query keys for all endpoints
  - Implement auto-refetch intervals

- [ ] **6.9.2** Add toast notifications
  - Install react-toastify or similar
  - Success toasts (login, campaign created, etc.)
  - Error toasts (API failures)
  - Info toasts (sync started, etc.)
  - Warning toasts (low warmup limit)

- [ ] **6.9.3** Create notification center (optional)
  - Notification bell icon
  - Dropdown with recent notifications
  - Mark as read functionality
  - Clear all notifications

- [ ] **6.9.4** Implement polling for campaign progress
  - Poll campaign status during active campaigns
  - Update progress bar in real-time
  - Show "X messages sent" counter
  - Stop polling when campaign completes

- [ ] **6.9.5** Add WebSocket support (optional, future)
  - Connect to WebSocket server
  - Listen for campaign events
  - Listen for WhatsApp connection events
  - Update UI in real-time

### Acceptance Criteria

- [ ] Data auto-refreshes without page reload
- [ ] Toast notifications appear for all actions
- [ ] Campaign progress updates in real-time
- [ ] Dashboard stats refresh automatically
- [ ] No unnecessary API calls (proper caching)

---

## Checkpoint 6.10: Testing & Documentation

**Priority:** 🟢 Medium
**Status:** ⏳ Pending
**Estimated Time:** 3-4 hours

### Tasks

- [ ] **6.10.1** Write unit tests for components
  - Test authentication flow
  - Test form validation
  - Test API client
  - Test custom hooks

- [ ] **6.10.2** Write integration tests
  - Test user registration flow
  - Test login and redirect
  - Test campaign creation flow
  - Test contact sync

- [ ] **6.10.3** E2E tests with Playwright or Cypress (optional)
  - Login flow
  - Create campaign end-to-end
  - WhatsApp connection flow

- [ ] **6.10.4** Create frontend documentation
  - README.md with setup instructions
  - Component documentation
  - API client usage guide
  - Deployment guide

- [ ] **6.10.5** Accessibility improvements
  - Add ARIA labels
  - Keyboard navigation support
  - Focus management
  - Screen reader compatibility

### Acceptance Criteria

- [ ] All critical user flows tested
- [ ] Test coverage > 70%
- [ ] Documentation complete
- [ ] No console errors in production build
- [ ] Accessibility audit passed

---

## Dependencies & Prerequisites

### Backend APIs Required

All Phase 3 backend endpoints must be functional:

- ✅ Authentication endpoints
- ✅ WhatsApp connection endpoints
- ✅ Consultant dashboard endpoint
- ✅ Contact sync endpoint
- ✅ Admin endpoints

### Additional Backend Endpoints Needed

The following endpoints need to be implemented in Phase 4:

- [ ] `GET /api/campaigns` - List all campaigns
- [ ] `POST /api/campaigns` - Create new campaign
- [ ] `GET /api/campaigns/:id` - Get campaign details
- [ ] `PUT /api/campaigns/:id` - Update campaign
- [ ] `DELETE /api/campaigns/:id` - Delete campaign
- [ ] `POST /api/campaigns/:id/start` - Start campaign
- [ ] `POST /api/campaigns/:id/stop` - Stop campaign
- [ ] `GET /api/campaigns/:id/messages` - Get campaign messages

- [ ] `GET /api/contacts` - List contacts with pagination
- [ ] `GET /api/contacts/:id` - Get contact details
- [ ] `POST /api/contacts` - Create contact
- [ ] `PUT /api/contacts/:id` - Update contact
- [ ] `DELETE /api/contacts/:id` - Delete contact

- [ ] `GET /api/templates` - List message templates
- [ ] `POST /api/templates` - Create template
- [ ] `GET /api/templates/:id` - Get template
- [ ] `PUT /api/templates/:id` - Update template
- [ ] `DELETE /api/templates/:id` - Delete template

---

## Technical Stack

### Core

- **Framework:** React 18+
- **Build Tool:** Vite or Create React App
- **Language:** JavaScript (TypeScript optional)
- **Router:** React Router DOM v6

### State Management

- **Option 1:** Zustand (lightweight, recommended)
- **Option 2:** React Context API (for simple state)
- **Option 3:** Redux Toolkit (if complex state needed)

### Data Fetching

- **TanStack Query (React Query)** - Server state management, caching, auto-refetch

### UI Library

- **Option 1:** Material-UI (MUI) - Comprehensive, well-documented
- **Option 2:** Tailwind CSS - Utility-first, highly customizable
- **Option 3:** Ant Design - Enterprise-grade UI

### Forms

- **React Hook Form** - Performant form library
- **Zod or Yup** - Schema validation

### Charts

- **Option 1:** Recharts - React-specific, simple API
- **Option 2:** Chart.js with react-chartjs-2
- **Option 3:** Victory - Modular charting

### HTTP Client

- **Axios** - Feature-rich, interceptors support

### Notifications

- **react-toastify** - Toast notifications

### Date Handling

- **date-fns** or **Day.js** - Lightweight date utilities

### Utilities

- **clsx** - Conditional className joining
- **react-icons** - Icon library

---

## Timeline Estimate

| Checkpoint | Estimated Time | Priority |
|-----------|---------------|----------|
| 6.1 Frontend Setup | 2-3 hours | Critical |
| 6.2 Authentication Pages | 4-5 hours | Critical |
| 6.3 Dashboard Layout | 4-5 hours | Critical |
| 6.4 Consultant Dashboard | 5-6 hours | High |
| 6.5 WhatsApp Connection | 4-5 hours | Critical |
| 6.6 Contact Management | 6-8 hours | High |
| 6.7 Campaign Management | 8-10 hours | High |
| 6.8 Admin Panel | 5-6 hours | Medium |
| 6.9 Real-Time Updates | 4-5 hours | Medium |
| 6.10 Testing & Docs | 3-4 hours | Medium |
| **Total** | **45-57 hours** | **~1-2 weeks** |

---

## Success Criteria

### Functionality

- [ ] Users can register and login
- [ ] Consultants can view their dashboard
- [ ] Consultants can connect WhatsApp via QR code
- [ ] Consultants can sync and manage contacts
- [ ] Consultants can create and manage campaigns
- [ ] Admins can view system stats
- [ ] Admins can manage consultants

### Performance

- [ ] Initial page load < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] Lighthouse score > 85
- [ ] No console errors

### UX

- [ ] Mobile responsive (< 768px)
- [ ] Consistent design across pages
- [ ] Loading states for all async operations
- [ ] Error states with helpful messages
- [ ] Success feedback for all actions

### Security

- [ ] No sensitive data in localStorage (only JWT token)
- [ ] API calls use HTTPS in production
- [ ] CORS configured properly
- [ ] XSS protection

---

## Notes

- Focus on consultant features first (Checkpoints 6.1-6.7)
- Admin panel can be done in parallel or after
- Real-time features (6.9) can be added incrementally
- Prioritize functional MVP over perfect UI

---

**Created:** 2025-11-14
**Last Updated:** 2025-11-14
**Phase:** 4 - Frontend Dashboard
**Status:** 🚧 Ready to Start
