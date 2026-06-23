@echo off
cd /d "%~dp0"
echo.
echo ===== Smartphone URL =====
echo Use the IPv4 address of your Wi-Fi adapter.
echo Example: http://192.168.1.23:5174/
echo.
ipconfig | findstr /R /C:"IPv4"
echo.
npm run dev:mobile
