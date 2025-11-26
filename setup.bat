@echo off
REM ============================================
REM WhatsApp Campaign System - Windows Setup
REM ============================================
REM Bu script sistemi otomatik olarak kurar
REM Gereksinimler: Docker Desktop, Node.js
REM ============================================

echo.
echo ========================================
echo WhatsApp Campaign System - Kurulum
echo ========================================
echo.

REM Renk kodları
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set RESET=[0m

REM 1. Node.js kontrolü
echo [1/9] Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%HATA: Node.js bulunamadi!%RESET%
    echo Lutfen Node.js yukleyin: https://nodejs.org
    pause
    exit /b 1
)
echo %GREEN%Node.js bulundu%RESET%
echo.

REM 2. Docker kontrolü
echo [2/9] Docker kontrol ediliyor...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%HATA: Docker bulunamadi!%RESET%
    echo Lutfen Docker Desktop yukleyin: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo %GREEN%Docker bulundu%RESET%
echo.

REM 3. Docker Desktop çalışıyor mu?
echo [3/9] Docker Desktop durumu kontrol ediliyor...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%UYARI: Docker Desktop calismyor!%RESET%
    echo Docker Desktop uygulamasini acin ve 30 saniye bekleyin...
    pause
    docker ps >nul 2>&1
    if %errorlevel% neq 0 (
        echo %RED%HATA: Docker Desktop hala calismyor!%RESET%
        pause
        exit /b 1
    )
)
echo %GREEN%Docker Desktop calisiyor%RESET%
echo.

REM 4. .env dosyalarını oluştur
echo [4/9] Ortam degiskenleri olusturuluyor...
if not exist .env (
    copy .env.example .env >nul 2>&1
    if %errorlevel% neq 0 (
        echo %YELLOW%UYARI: .env.example bulunamadi, varsayilan .env olusturuluyor...%RESET%
        call :create_env_file
    )
)
if not exist backend\.env (
    copy backend\.env backend\.env.backup >nul 2>&1
)
if not exist frontend\.env (
    echo VITE_API_URL=/api > frontend\.env
)
echo %GREEN%.env dosyalari hazir%RESET%
echo.

REM 5. Backend bağımlılıkları
echo [5/9] Backend bagimliliklari yukleniyor...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo %RED%HATA: Backend npm install basarisiz!%RESET%
    cd ..
    pause
    exit /b 1
)
cd ..
echo %GREEN%Backend hazir%RESET%
echo.

REM 6. Frontend bağımlılıkları
echo [6/9] Frontend bagimliliklari yukleniyor...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo %RED%HATA: Frontend npm install basarisiz!%RESET%
    cd ..
    pause
    exit /b 1
)
cd ..
echo %GREEN%Frontend hazir%RESET%
echo.

REM 7. Docker container'ları başlat
echo [7/9] Docker containerlari baslatiliyor...
docker-compose up -d
if %errorlevel% neq 0 (
    echo %RED%HATA: Docker containerlari baslatilamadi!%RESET%
    pause
    exit /b 1
)
echo %GREEN%Docker containerlari calisiyor%RESET%
echo.

REM 8. Database bekleme
echo [8/9] Veritabani hazirlaniyor (30 saniye)...
timeout /t 30 /nobreak >nul
echo %GREEN%Veritabani hazir%RESET%
echo.

REM 9. Health check
echo [9/9] Sistem kontrol ediliyor...
timeout /t 5 /nobreak >nul
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%UYARI: Backend henuz hazir degil, biraz daha bekleyin...%RESET%
    timeout /t 10 /nobreak >nul
)
echo %GREEN%Sistem hazir!%RESET%
echo.

REM Başarı mesajı
echo ========================================
echo %GREEN%KURULUM TAMAMLANDI!%RESET%
echo ========================================
echo.
echo Sistemin calistigini dogrulamak icin:
echo.
echo 1. Backend API:  http://localhost:3000/health
echo 2. Frontend:     http://localhost:5173
echo 3. Swagger Docs: http://localhost:3000/api-docs
echo.
echo Sistemi baslatmak icin: npm run start
echo Sistemi durdurmak icin: npm run stop
echo.
pause
exit /b 0

REM .env dosyası oluştur
:create_env_file
(
echo # Evolution API
echo EVOLUTION_API_KEY=WhatsApp_Campaign_2025_SecretKey_xyz789ABC
echo EVOLUTION_API_URL=http://localhost:8080
echo.
echo # PostgreSQL
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_USER=campaign_user
echo DB_PASSWORD=CampaignDBPass2025
echo DB_NAME=whatsapp_campaign
echo.
echo # Redis
echo REDIS_HOST=localhost
echo REDIS_PORT=6379
echo.
echo # Backend
echo BACKEND_PORT=3000
echo NODE_ENV=development
echo LOG_LEVEL=info
echo.
echo # JWT
echo JWT_SECRET=JWTSecretKey2025VeryStrong
echo JWT_EXPIRES_IN=7d
echo BCRYPT_ROUNDS=10
echo.
echo # OpenAI
echo OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
echo OPENAI_MODEL=gpt-3.5-turbo
echo OPENAI_MAX_TOKENS=500
echo OPENAI_TEMPERATURE=0.7
echo.
echo # Anti-Spam
echo DAILY_MESSAGE_LIMIT=200
echo MIN_MESSAGE_DELAY=20000
echo MAX_MESSAGE_DELAY=40000
echo WORKING_HOURS_START=0
echo WORKING_HOURS_END=23
echo MESSAGE_COOLDOWN_HOURS=24
echo.
echo # Security
echo CORS_ORIGINS=http://localhost:3000,http://localhost:5173
echo RATE_LIMIT_MAX=100
echo RATE_LIMIT_WINDOW=15
echo.
echo # Other
echo TZ=Europe/Istanbul
echo DEBUG=false
) > .env
exit /b 0
