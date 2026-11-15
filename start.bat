@echo off
REM Lunar Landing Site Navigator - Quick Start Script for Windows

echo 🌙 Lunar Landing Site Navigator - Starting up...
echo.

REM Check prerequisites
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install it from https://nodejs.org/
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed.
    exit /b 1
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install it from https://python.org/
    exit /b 1
)

where pip >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip is not installed.
    exit /b 1
)

echo ✅ All prerequisites found
echo.

REM Setup backend
echo 🐍 Setting up backend...
cd backend

if not exist venv (
    echo   Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo   Installing dependencies...
pip install -q -r requirements.txt

echo   Downloading SPICE kernels...
python scripts\download_kernels.py

cd ..

REM Setup frontend
echo.
echo ⚛️  Setting up frontend...
cd frontend

if not exist node_modules (
    echo   Installing dependencies...
    npm install
)

cd ..

echo.
echo ✨ Setup complete! Starting servers...
echo.

REM Start backend in new window
start "Lunar Landing Site - Backend" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

REM Start frontend in new window
start "Lunar Landing Site - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo 🚀 Servers starting in separate windows...
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo Close the terminal windows to stop the servers.
pause