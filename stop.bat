@echo off
echo ================================================
echo WhatsApp Campaign System - Durdurma
echo ================================================
echo.

echo [1/2] Docker konteynerlerini durduruyor...
cd "%~dp0"
docker-compose down
echo [TAMAM] Konteynerler durduruldu!

echo.
echo [2/2] Backend ve Frontend processleri durduruluyor...
echo.
echo Backend ve Frontend pencerelerini manuel olarak kapatabilirsiniz.
echo Veya Ctrl+C ile durdurabilirsiniz.
echo.
echo [TAMAM] Sistem durduruldu!
echo.
pause
