@echo off
echo ==========================================
echo Healthcare Appointment System - Local Mode
echo ==========================================
echo.

REM Check if MongoDB is running
echo Checking MongoDB...
netstat -an | findstr 27017 >nul
if %errorlevel% neq 0 (
    echo WARNING: MongoDB doesn't appear to be running on port 27017
    echo Please start MongoDB first, then run this script again.
    echo.
    echo To install MongoDB locally:
    echo   1. Download from https://www.mongodb.com/try/download/community
    echo   2. Or use: choco install mongodb
    echo.
    pause
    exit /b 1
)

echo MongoDB is running! Starting services...
echo.

REM Set environment variables for local MongoDB
set MONGO_HOST=localhost
set MONGO_PORT=27017

REM Install dependencies if needed
echo [1/3] Installing Auth Service dependencies...
cd auth-service
call npm install
cd ..

echo [2/3] Installing Appointment Service dependencies...
cd appointment-service
pip install -r requirements.txt
cd ..

echo [3/3] Starting services...
echo.

REM Start all services in separate windows
echo Starting Auth Service on port 5000...
start "Auth Service (5000)" cmd /k "cd auth-service && set MONGO_HOST=localhost&& node index.js"

echo Starting Appointment Service on port 5001...
start "Appointment Service (5001)" cmd /k "cd appointment-service && set MONGO_HOST=localhost&& python app.py"

echo Starting Frontend on port 8080...
start "Frontend (8080)" cmd /k "cd frontend && npx serve . -p 8080"

echo.
echo ==========================================
echo All services starting...
echo ==========================================
echo.
echo Frontend:    http://localhost:8080
echo Auth API:    http://localhost:5000
echo Booking API: http://localhost:5001
echo.
echo Close the command windows to stop services.
echo.
pause
