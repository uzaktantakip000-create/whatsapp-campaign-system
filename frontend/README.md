# WhatsApp Campaign System - Frontend

Modern, responsive React frontend for the WhatsApp Campaign Management System.

## 🚀 Tech Stack

- **React 18.3.1** - UI library
- **Vite 6.4.1** - Build tool and dev server
- **Material-UI (MUI) v6.3.1** - UI component library
- **React Router DOM v6.28.0** - Client-side routing
- **TanStack Query v5.62.11** - Server state management
- **Zustand v5.0.3** - Global state management
- **React Hook Form v7.54.2** - Form handling
- **Zod v3.24.1** - Schema validation
- **Axios v1.7.9** - HTTP client
- **Recharts v2.15.0** - Data visualization
- **date-fns v4.1.0** - Date utilities
- **react-hot-toast v2.4.1** - Toast notifications

## 📋 Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Backend server running on http://localhost:3000

## 🛠️ Installation

1. **Navigate to frontend directory:**
   ```bash
   cd whatsapp-campaign-system/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

## 🎯 Running the Application

### Development Mode

```bash
npm run dev
```

- Opens on http://localhost:5173
- Hot Module Replacement (HMR) enabled
- Fast refresh on file changes

### Production Build

```bash
npm run build
```

- Builds optimized production bundle to `dist/`
- Minified and optimized assets
- Source maps generated

### Preview Production Build

```bash
npm run preview
```

- Serves production build locally
- Test production bundle before deployment

### Linting

```bash
npm run lint
```

- Runs ESLint on all source files
- Checks for code quality issues

## 📁 Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── api/            # API client modules
│   │   ├── client.js   # Axios instance with interceptors
│   │   ├── auth.js     # Authentication endpoints
│   │   ├── whatsapp.js # WhatsApp endpoints
│   │   ├── contacts.js # Contacts endpoints
│   │   ├── campaigns.js # Campaigns endpoints
│   │   ├── consultants.js # Consultants endpoints
│   │   └── admin.js    # Admin endpoints
│   ├── components/
│   │   ├── common/     # Reusable components
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── NotificationMenu.jsx
│   │   └── layout/     # Layout components
│   │       ├── MainLayout.jsx
│   │       ├── Navbar.jsx
│   │       └── Sidebar.jsx
│   ├── pages/          # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── WhatsApp.jsx
│   │   ├── Contacts.jsx
│   │   ├── Campaigns.jsx
│   │   ├── Messages.jsx
│   │   ├── Templates.jsx
│   │   ├── Settings.jsx
│   │   ├── Profile.jsx
│   │   └── Admin.jsx
│   ├── store/          # State management
│   │   ├── authStore.js
│   │   └── notificationStore.js
│   ├── App.jsx         # Root component
│   ├── main.jsx        # App entry point
│   └── index.css       # Global styles
├── .env                # Environment variables
├── .env.example        # Example environment file
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies
└── README.md           # This file
```

## 🎨 Features

### Authentication
- JWT-based authentication
- Login and registration forms
- Form validation with Zod
- Auto-logout on 401 responses
- Token persistence in localStorage
- Protected routes

### Dashboard
- System statistics cards
- Warmup status tracking
- Recent campaigns table
- Data visualization charts
- Auto-refresh every 10-30 seconds
- Manual refresh button

### WhatsApp Connection
- QR code scanning
- Connection status monitoring
- Auto-refresh QR codes (45s timer)
- Dynamic polling (3s when pending, 10s otherwise)
- Disconnect functionality
- Status indicators

### Contact Management
- CRUD operations
- Server-side pagination
- Search and filters
- Sync from WhatsApp
- Bulk delete and CSV export
- Form validation
- Sortable columns

### Campaign Management
- Create, edit, delete campaigns
- Status-based filtering
- Start/Stop campaign controls
- Real-time progress tracking
- Dynamic polling (5s for running campaigns)
- Campaign details modal
- Simplified campaign creation

### Admin Panel
- System-wide statistics
- Consultants management
- Activate/deactivate consultants
- Consultant details modal
- Search and status filters
- Role-based access control

### Notifications
- In-app notification center
- Bell icon with badge count
- Notification types: success, error, warning, info
- Mark as read/unread
- Clear all notifications
- LocalStorage persistence

### Real-Time Updates
- React Query with optimized caching
- Dynamic polling intervals
- Auto-refresh for running campaigns
- Optimistic UI updates
- Toast notifications

## 🔐 Authentication Flow

1. User visits application
2. Redirected to `/login` if not authenticated
3. Login/Register with credentials
4. JWT token stored in localStorage
5. Token sent in `Authorization: Bearer <token>` header
6. Auto-logout on token expiration (401)
7. Protected routes guard authenticated pages

## 🎯 User Roles

- **consultant** - Standard user role
  - Access to dashboard, contacts, campaigns, WhatsApp
  - Cannot access admin panel

- **admin** - Administrator role
  - All consultant permissions
  - Access to admin panel
  - Manage consultants
  - View system-wide statistics

## 📱 Responsive Design

- **Desktop (md and up)**: Permanent sidebar, full navigation
- **Tablet (sm to md)**: Collapsible sidebar
- **Mobile (below sm)**: Drawer-based navigation, hamburger menu

Breakpoints:
- xs: 0px
- sm: 600px
- md: 900px
- lg: 1200px
- xl: 1536px

## 🎨 Theme

WhatsApp-inspired color scheme:
- **Primary**: Green (#25D366) - WhatsApp brand color
- **Secondary**: Teal (#128C7E) - Accent color
- **Background**: Grey (#F5F5F5)
- **Error**: Red (#F44336)
- **Warning**: Orange (#FF9800)
- **Info**: Blue (#2196F3)
- **Success**: Green (#4CAF50)

## 🔌 API Integration

All API calls go through `src/api/client.js` which provides:

- Base URL configuration from environment
- Request/response interceptors
- Automatic token injection
- Error handling
- Auto-logout on 401

### Example API Call

```javascript
import apiClient from './client';

export const getContacts = async (params) => {
  const response = await apiClient.get('/contacts', { params });
  return response.data;
};
```

## 🚀 State Management

### Zustand Stores

**authStore** - Authentication state
- user (object)
- token (string)
- isAuthenticated (boolean)
- login(credentials)
- logout()
- checkAuth()

**notificationStore** - Notifications state
- notifications (array)
- addNotification(notification)
- markAsRead(id)
- markAllAsRead()
- clearAll()
- getUnreadCount()

### React Query

- Caching and synchronization
- Auto-refetch intervals
- Optimistic updates
- Error handling
- Loading states

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error handling)
- [ ] Register new account
- [ ] Auto-logout on token expiration
- [ ] Protected routes redirect to login
- [ ] Dashboard loads and displays stats
- [ ] WhatsApp QR code generation
- [ ] Contact CRUD operations
- [ ] Campaign creation and management
- [ ] Admin panel (admin role only)
- [ ] Notifications display and management
- [ ] Real-time updates for running campaigns
- [ ] Responsive design on mobile/tablet
- [ ] Form validation on all forms

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

1. Build production bundle:
   ```bash
   npm run build
   ```

2. Deploy `dist/` folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Any static hosting service

3. Configure environment variables on hosting platform

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_BASE_URL | Backend API base URL | http://localhost:3000/api |

## 🐛 Common Issues

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173
# Or specify different port
npm run dev -- --port 3001
```

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors
- Ensure backend CORS is configured to allow frontend origin
- Check `VITE_API_BASE_URL` in `.env`

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Material-UI Documentation](https://mui.com)
- [TanStack Query Documentation](https://tanstack.com/query)
- [React Router Documentation](https://reactrouter.com)
- [Zustand Documentation](https://zustand-demo.pmnd.rs)

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Contributors

- Development Team

## 📞 Support

For issues and questions:
- Check existing documentation
- Contact development team
- Review API documentation

---

**Last Updated:** 2025-11-14
**Version:** 0.3.0
**Status:** Production Ready
