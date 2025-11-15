@echo off
echo ================================================
echo WhatsApp Campaign System - Baslatici
echo ================================================
echo.

echo [1/4] Docker Desktop kontrol ediliyor...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Docker Desktop calismiyorya da baslamadi!
    echo.
    echo Lutfen Docker Desktop'i manuel olarak baslatin:
    echo 1. Windows'ta "Docker Desktop" uygulamasini arayip acin
    echo 2. Docker'in tamamen baslamasini bekleyin ^(whale simgesi sabit olmali^)
    echo 3. Bu scripti tekrar calistirin
    echo.
    pause
    exit /b 1
)
echo [TAMAM] Docker Desktop calisiyor!

echo.
echo [2/4] PostgreSQL ve Redis konteynerleri baslatiliyor...
cd "%~dp0"
docker-compose up -d postgres redis
if %errorlevel% neq 0 (
    echo [HATA] Konteynerler baslatilamadi!
    pause
    exit /b 1
)
echo [TAMAM] Veritabani konteynerleri baslatildi!

echo.
echo [3/4] Veritabaninin hazir olması bekleniyor...
timeout /t 5 /nobreak >nul
echo [TAMAM] Veritabani hazir!

echo.
echo [4/4] Backend ve Frontend baslatiliyor...
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo ================================================
echo HAZIR! Simdi giris yapabilirsiniz:
echo ================================================
echo.
echo ADMIN GIRIS:
echo   Email: admin@whatsapp-campaign.com
echo   Sifre: Admin123!
echo.
echo DANISMAN GIRIS:
echo   Email: consultant@whatsapp-campaign.com
echo   Sifre: Admin123!
echo.
echo ================================================
echo.

REM Backend'i yeni bir terminal penceresinde başlat
start "WhatsApp Campaign - Backend" cmd /k "cd backend && npm start"

REM Frontend'i yeni bir terminal penceresinde başlat
start "WhatsApp Campaign - Frontend" cmd /k "cd frontend && npm run dev"

echo Backend ve Frontend ayri pencereler acildi.
echo Bu pencereyi kapatabilirsiniz.
echo.
pause
