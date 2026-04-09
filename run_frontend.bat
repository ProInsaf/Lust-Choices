@echo off
title Lust Choices — Frontend
color 0B
cd /d "%~dp0frontend"

echo [*] Установка npm зависимостей...
call npm install

echo.
echo ==========================================
echo   Frontend: http://localhost:5173
echo ==========================================
echo.

call npm run dev

pause
