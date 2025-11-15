# WhatsApp Campaign Management System

Professional WhatsApp bulk messaging platform with Evolution API integration, warmup system, and comprehensive campaign management.

## 🎯 Overview

Full-stack WhatsApp marketing solution featuring:
- Multi-user system (Admin & Consultants)
- Evolution API WhatsApp integration
- Intelligent warmup to prevent blocks
- Template & campaign management
- Contact management with CSV import/export
- Real-time monitoring & statistics
- Modern React dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- PostgreSQL >= 14.x
- Evolution API instance (optional)

### Setup

```bash
# 1. Environment setup
cp .env.example .env
# Edit .env with your credentials

# 2. Database
createdb whatsapp_campaign
psql -d whatsapp_campaign -f database/schema.sql

# 3. Backend
cd backend
npm install
npm start
# Runs on http://localhost:3000

# 4. Frontend
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Docker Setup (Recommended)

```bash
docker-compose up -d
```

Services:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- API Docs: http://localhost:3000/api-docs
- PostgreSQL: localhost:5432

## 📚 Documentation

- **[Frontend README](frontend/README.md)** - React app documentation
- **[Deployment Guide](frontend/DEPLOYMENT.md)** - Production deployment
- **[Accessibility Guide](frontend/ACCESSIBILITY.md)** - WCAG 2.1 AA compliance
- **[Progress Tracker](PROGRESS.md)** - Development phases
- **[API Docs](http://localhost:3000/api-docs)** - Swagger/OpenAPI

## 🛠️ Tech Stack

**Backend:**
- Node.js 18+ + Express 4.21
- PostgreSQL 14+ with pg
- JWT authentication
- Joi validation
- Swagger/OpenAPI docs

**Frontend:**
- React 18.3 + Vite 6.4
- Material-UI v6.3
- React Router v6.28
- Zustand + TanStack Query
- React Hook Form + Zod

**Integrations:**
- Evolution API (WhatsApp)
- OpenAI GPT-4 (optional)

## 📁 Project Structure

```
whatsapp-campaign-system/
├── backend/          # Node.js API
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   └── server.js
│
├── frontend/         # React UI
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── store/
│   └── vite.config.js
│
└── database/         # PostgreSQL schema
    └── schema.sql
```

## 🎨 Features

✅ **Authentication** - JWT with role-based access (admin, consultant)
✅ **WhatsApp Integration** - QR code connection, status monitoring
✅ **Contact Management** - CRUD, CSV import/export, WhatsApp sync
✅ **Campaign Management** - Create, schedule, start/stop, progress tracking
✅ **Template System** - Variables, media attachments, AI generation
✅ **Warmup System** - Intelligent limits to prevent blocks
✅ **Admin Panel** - System stats, consultant management
✅ **Dashboard** - Real-time stats, charts, recent campaigns
✅ **Notifications** - In-app notification center with badges
✅ **Real-Time Updates** - Dynamic polling, optimistic UI

## 📊 API Endpoints

**Core APIs:**
- `POST /api/auth/login` - Authenticate user
- `GET /api/whatsapp/status` - Check WhatsApp connection
- `POST /api/campaigns` - Create campaign
- `GET /api/contacts` - List contacts
- `POST /api/templates` - Create template
- `GET /api/admin/stats` - System statistics

Full API docs: http://localhost:3000/api-docs

## 🔐 Environment Variables

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=whatsapp_campaign
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password

# Backend
BACKEND_PORT=3000
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your_api_key

# Optional
OPENAI_API_KEY=sk-your-key
CORS_ORIGINS=http://localhost:5173
```

## 🧪 Testing

```bash
cd backend
npm test                # Run all tests
npm run test:coverage   # Coverage report
```

Test files include:
- Authentication flow
- WhatsApp connection
- Contact CRUD
- Campaign messaging
- Template system
- Admin endpoints

## 🚀 Deployment

**Frontend:** Supports Vercel, Netlify, AWS S3, DigitalOcean, GitHub Pages
See [frontend/DEPLOYMENT.md](frontend/DEPLOYMENT.md) for detailed guides.

**Backend:** Deploy to Heroku, Railway, DigitalOcean, AWS, or Google Cloud.

## 📈 Project Status

**Version:** 1.0.0
**Status:** ✅ Production Ready

**Completed:**
- ✅ Phase 1: Database Design
- ✅ Phase 2: User Authentication
- ✅ Phase 3: WhatsApp Integration & Campaigns
- ✅ Phase 4: Frontend Dashboard (100%)

**Frontend:** 11 pages, 15+ components, 6 API modules
**Backend:** 9 route modules, comprehensive test suite
**Documentation:** README, Deployment, Accessibility guides

## 🐛 Troubleshooting

**Backend won't start:**
- Check PostgreSQL is running
- Verify .env file exists
- Test database connection

**Frontend CORS errors:**
- Add frontend URL to CORS_ORIGINS in backend .env
- Restart backend server

**WhatsApp connection fails:**
- Verify Evolution API is running
- Check API URL and key in .env

## 📞 Support

- Review documentation in `/frontend`
- Check `/PROGRESS.md` for development details
- API docs at `/api-docs`
- Test files for usage examples

## 📄 License

Proprietary software. All rights reserved.

---

**Last Updated:** 2025-11-14
**Developed for efficient WhatsApp campaign management**
