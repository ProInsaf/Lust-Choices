@echo off
title Lust Choices — Backend
color 0C
cd /d "%~dp0backend"

if not exist "venv" (
    echo [*] Создание виртуального окружения Python...
    python -m venv venv
)

echo [*] Активация venv...
call venv\Scripts\activate.bat

echo [*] Установка зависимостей...
pip install -r requirements.txt -q

echo [*] Инициализация базы данных...
python init_db.py

echo.
echo ==========================================
echo   Backend запущен: http://localhost:8000
echo   Docs:            http://localhost:8000/docs
echo ==========================================
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
