# WhatsApp Campaign System - Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring](#monitoring)
10. [Backup and Recovery](#backup-and-recovery)

---

## Prerequisites

### Required Software

- **Docker Desktop:** v28.5.1 or higher
- **Docker Compose:** v2.40.0 or higher
- **Git:** Latest version
- **Node.js:** 22+ (for local development only)

### System Requirements

- **CPU:** 2+ cores recommended
- **RAM:** 4GB minimum, 8GB recommended
- **Disk Space:** 10GB minimum
- **OS:** Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)

### Network Requirements

- **Ports:**
  - 3000 (Backend API)
  - 5432 (PostgreSQL)
  - 6379 (Redis)
  - 8080 (Evolution API)
- **Internet:** Required for WhatsApp connection and OpenAI API

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone [your-repository-url]
cd whatsapp-campaign-system
```

### 2. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 3. Configure Environment Variables

Edit the `.env` file with your settings:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
POSTGRES_DB=whatsapp_campaign_db
POSTGRES_USER=campaign_user
POSTGRES_PASSWORD=SecurePassword123!
DATABASE_HOST=postgres_db
DATABASE_PORT=5432

# ============================================
# REDIS CONFIGURATION
# ============================================
REDIS_HOST=redis_cache
REDIS_PORT=6379

# ============================================
# EVOLUTION API CONFIGURATION
# ============================================
EVOLUTION_API_URL=http://evolution_api:8080
EVOLUTION_API_KEY=your-evolution-api-key-here

# ============================================
# OPENAI CONFIGURATION
# ============================================
OPENAI_API_KEY=sk-your-openai-api-key-here

# ============================================
# JWT CONFIGURATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRES_IN=7d

# ============================================
# BACKEND CONFIGURATION
# ============================================
BACKEND_PORT=3000
NODE_ENV=production

# ============================================
# SECURITY
# ============================================
BCRYPT_ROUNDS=10
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

---

## Docker Deployment

### 1. Build Docker Images

Build all services:

```bash
docker-compose build --no-cache
```

Build specific service:

```bash
docker-compose build --no-cache backend
```

### 2. Start Services

Start all services in detached mode:

```bash
docker-compose up -d
```

Start specific service:

```bash
docker-compose up -d postgres_db redis_cache evolution_api backend
```

### 3. View Logs

View all logs:

```bash
docker-compose logs -f
```

View specific service logs:

```bash
docker-compose logs -f backend
```

### 4. Stop Services

Stop all services:

```bash
docker-compose down
```

Stop and remove volumes (WARNING: deletes data):

```bash
docker-compose down -v
```

---

## Configuration

### Database Configuration

The PostgreSQL database is automatically configured with:

- **Database:** whatsapp_campaign_db
- **User:** campaign_user
- **Password:** Set in .env file
- **Port:** 5432 (internal), mapped to host if needed

### Redis Configuration

Redis is used for caching and queuing:

- **Host:** redis_cache
- **Port:** 6379
- **Persistence:** Enabled (AOF + RDB)

### Evolution API Configuration

Evolution API handles WhatsApp connections:

- **URL:** http://evolution_api:8080 (internal)
- **External URL:** http://localhost:8080 (for QR code webhooks)
- **API Key:** Set in .env file
- **WebSocket:** Enabled for real-time events

---

## Database Setup

### 1. Run Migrations

Migrations are automatically run when the backend starts. To manually run migrations:

```bash
docker-compose exec backend npm run migrate
```

### 2. Seed Initial Data (Optional)

Create an admin user:

```bash
docker-compose exec backend npm run seed:admin
```

### 3. Verify Database

Check database connection:

```bash
docker-compose exec postgres_db psql -U campaign_user -d whatsapp_campaign_db -c "\dt"
```

---

## Running the Application

### 1. Start All Services

```bash
docker-compose up -d
```

### 2. Wait for Services to Be Ready

Monitor startup:

```bash
docker-compose logs -f backend
```

Wait for message: "🚀 WhatsApp Campaign System Backend"

### 3. Verify Health

Check backend health:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "OK",
  "timestamp": "2025-11-14T15:00:00.000Z",
  "uptime": 123.45,
  "database": "connected",
  "version": "1.0.0"
}
```

---

## Verification

### 1. Access Swagger API Documentation

Open browser to:

```
http://localhost:3000/api-docs
```

You should see the interactive Swagger UI with all API endpoints documented.

### 2. Test Authentication

Register a new consultant:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123",
    "phone": "+905551234567"
  }'
```

### 3. Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

Save the returned JWT token for authenticated requests.

### 4. Test WhatsApp Connection

Get QR code:

```bash
curl -X POST http://localhost:3000/api/whatsapp/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error:** "Bind for 0.0.0.0:3000 failed: port is already allocated"

**Solution:**

```bash
# Find process using port
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <PID> /F

# Kill process (Linux/Mac)
kill -9 <PID>
```

#### 2. Database Connection Failed

**Error:** "Database connection failed"

**Solution:**

1. Check PostgreSQL is running:

```bash
docker-compose ps postgres_db
```

2. Check logs:

```bash
docker-compose logs postgres_db
```

3. Verify credentials in .env file

#### 3. Evolution API Not Responding

**Error:** "Failed to connect to Evolution API"

**Solution:**

1. Check Evolution API is running:

```bash
docker-compose ps evolution_api
```

2. Check Evolution API logs:

```bash
docker-compose logs evolution_api
```

3. Verify EVOLUTION_API_URL in .env

#### 4. Backend Container Keeps Restarting

**Solution:**

1. Check backend logs:

```bash
docker-compose logs backend
```

2. Common causes:
   - Missing environment variables
   - Database not ready
   - Node modules not installed properly

3. Rebuild container:

```bash
docker-compose build --no-cache backend
docker-compose up -d backend
```

---

## Monitoring

### 1. Health Checks

All services have health checks configured:

```bash
docker-compose ps
```

Look for "healthy" status for all services.

### 2. Resource Usage

Monitor Docker resource usage:

```bash
docker stats
```

### 3. Logs

View real-time logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### 4. Database Monitoring

Check active connections:

```bash
docker-compose exec postgres_db psql -U campaign_user -d whatsapp_campaign_db -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Backup and Recovery

### 1. Database Backup

Create backup:

```bash
docker-compose exec postgres_db pg_dump -U campaign_user whatsapp_campaign_db > backup_$(date +%Y%m%d).sql
```

### 2. Database Restore

Restore from backup:

```bash
docker-compose exec -T postgres_db psql -U campaign_user whatsapp_campaign_db < backup_20251114.sql
```

### 3. Volume Backup

Backup Docker volumes:

```bash
docker run --rm -v whatsapp-campaign-system_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

---

## Production Considerations

### 1. Security

- [ ] Change all default passwords in .env
- [ ] Use strong JWT_SECRET (at least 32 characters)
- [ ] Enable HTTPS/SSL for production
- [ ] Restrict CORS_ORIGINS to production domain
- [ ] Use environment-specific .env files
- [ ] Never commit .env to version control

### 2. Performance

- [ ] Increase PostgreSQL shared_buffers for production
- [ ] Configure Redis maxmemory policy
- [ ] Set up reverse proxy (nginx) for backend
- [ ] Enable gzip compression
- [ ] Implement CDN for static assets

### 3. Scalability

- [ ] Use external PostgreSQL (managed service)
- [ ] Use external Redis (managed service)
- [ ] Implement load balancing
- [ ] Set up horizontal scaling for backend
- [ ] Configure auto-scaling policies

### 4. Monitoring

- [ ] Set up application monitoring (e.g., PM2, New Relic)
- [ ] Configure log aggregation (e.g., ELK stack)
- [ ] Set up alerting (e.g., PagerDuty, Slack)
- [ ] Monitor API performance metrics
- [ ] Track error rates and response times

---

## Support

For issues and questions:

1. Check [TESTING.md](TESTING.md) for test results
2. Review [PROGRESS.md](PROGRESS.md) for development status
3. Open an issue in the repository

---

**Last Updated:** 2025-11-14
**Version:** 0.3.0 (Beta)
