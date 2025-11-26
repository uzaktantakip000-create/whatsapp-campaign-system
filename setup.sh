#!/bin/bash

# ============================================
# WhatsApp Campaign System - Linux/Mac Setup
# ============================================
# Bu script sistemi otomatik olarak kurar
# Gereksinimler: Docker, Node.js
# ============================================

set -e  # Hata durumunda dur

# Renk kodları
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "WhatsApp Campaign System - Kurulum"
echo "========================================"
echo ""

# 1. Node.js kontrolü
echo "[1/9] Node.js kontrol ediliyor..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}HATA: Node.js bulunamadi!${NC}"
    echo "Lutfen Node.js yukleyin: https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}Node.js bulundu: $(node --version)${NC}"
echo ""

# 2. Docker kontrolü
echo "[2/9] Docker kontrol ediliyor..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}HATA: Docker bulunamadi!${NC}"
    echo "Lutfen Docker yukleyin: https://www.docker.com/get-started"
    exit 1
fi
echo -e "${GREEN}Docker bulundu: $(docker --version)${NC}"
echo ""

# 3. Docker daemon çalışıyor mu?
echo "[3/9] Docker daemon durumu kontrol ediliyor..."
if ! docker ps &> /dev/null; then
    echo -e "${YELLOW}UYARI: Docker daemon calismyor!${NC}"
    echo "Docker Desktop'i acin ve tekrar calistirin."
    exit 1
fi
echo -e "${GREEN}Docker daemon calisiyor${NC}"
echo ""

# 4. .env dosyalarını oluştur
echo "[4/9] Ortam degiskenleri olusturuluyor..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo -e "${YELLOW}UYARI: .env.example bulunamadi, varsayilan .env olusturuluyor...${NC}"
        cat > .env << 'EOF'
# Evolution API
EVOLUTION_API_KEY=WhatsApp_Campaign_2025_SecretKey_xyz789ABC
EVOLUTION_API_URL=http://localhost:8080

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=campaign_user
DB_PASSWORD=CampaignDBPass2025
DB_NAME=whatsapp_campaign

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Backend
BACKEND_PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# JWT
JWT_SECRET=JWTSecretKey2025VeryStrong
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Anti-Spam
DAILY_MESSAGE_LIMIT=200
MIN_MESSAGE_DELAY=20000
MAX_MESSAGE_DELAY=40000
WORKING_HOURS_START=0
WORKING_HOURS_END=23
MESSAGE_COOLDOWN_HOURS=24

# Security
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15

# Other
TZ=Europe/Istanbul
DEBUG=false
EOF
    fi
fi
[ ! -f backend/.env ] && cp backend/.env backend/.env 2>/dev/null || true
[ ! -f frontend/.env ] && echo "VITE_API_URL=/api" > frontend/.env
echo -e "${GREEN}.env dosyalari hazir${NC}"
echo ""

# 5. Backend bağımlılıkları
echo "[5/9] Backend bagimliliklari yukleniyor..."
cd backend
npm install
cd ..
echo -e "${GREEN}Backend hazir${NC}"
echo ""

# 6. Frontend bağımlılıkları
echo "[6/9] Frontend bagimliliklari yukleniyor..."
cd frontend
npm install
cd ..
echo -e "${GREEN}Frontend hazir${NC}"
echo ""

# 7. Docker container'ları başlat
echo "[7/9] Docker containerlari baslatiliyor..."
docker-compose up -d
echo -e "${GREEN}Docker containerlari calisiyor${NC}"
echo ""

# 8. Database bekleme
echo "[8/9] Veritabani hazirlaniyor (30 saniye)..."
sleep 30
echo -e "${GREEN}Veritabani hazir${NC}"
echo ""

# 9. Health check
echo "[9/9] Sistem kontrol ediliyor..."
sleep 5
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}Backend API calisiyor${NC}"
else
    echo -e "${YELLOW}UYARI: Backend henuz hazir degil, biraz daha bekleyin...${NC}"
    sleep 10
fi
echo ""

# Başarı mesajı
echo "========================================"
echo -e "${GREEN}KURULUM TAMAMLANDI!${NC}"
echo "========================================"
echo ""
echo "Sistemin calistigini dogrulamak icin:"
echo ""
echo "1. Backend API:  http://localhost:3000/health"
echo "2. Frontend:     http://localhost:5173"
echo "3. Swagger Docs: http://localhost:3000/api-docs"
echo ""
echo "Sistemi baslatmak icin: npm run start"
echo "Sistemi durdurmak icin: npm run stop"
echo ""
