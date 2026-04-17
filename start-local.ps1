# Healthcare Appointment System - Local Startup Script
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Healthcare Appointment System - Local Mode" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
$mongoRunning = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue

if (-not $mongoRunning) {
    Write-Host "WARNING: MongoDB doesn't appear to be running on port 27017" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start MongoDB first. Options:" -ForegroundColor Yellow
    Write-Host "  1. Install MongoDB locally: https://www.mongodb.com/try/download/community"
    Write-Host "  2. Or use Docker: docker run -d -p 27017:27017 --name mongo mongo"
    Write-Host "  3. Or use: choco install mongodb (if you have Chocolatey)"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "MongoDB is running!" -ForegroundColor Green
Write-Host ""

# Set environment variables for local MongoDB
$env:MONGO_HOST = "localhost"
$env:MONGO_PORT = "27017"

# Install dependencies
echo "[1/3] Installing Auth Service dependencies..."
Set-Location auth-service
& npm install
Set-Location ..

echo "[2/3] Installing Appointment Service dependencies..."
cd appointment-service
pip install -r requirements.txt
cd ..

echo "[3/3] Starting services..."
echo ""

# Start Auth Service
echo "Starting Auth Service on port 5000..."
$authJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\auth-service
    $env:MONGO_HOST = "localhost"
    node index.js
}

# Start Appointment Service
echo "Starting Appointment Service on port 5001..."
$aptJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\appointment-service
    $env:MONGO_HOST = "localhost"
    python app.py
}

# Start Frontend
echo "Starting Frontend on port 8080..."
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npx serve . -p 8080
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "All services starting..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:    http://localhost:8080" -ForegroundColor Cyan
Write-Host "Auth API:    http://localhost:5000" -ForegroundColor Cyan
Write-Host "Booking API: http://localhost:5001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# Keep running and show output
try {
    while ($true) {
        Receive-Job -Job $authJob -Keep
        Receive-Job -Job $aptJob -Keep
        Receive-Job -Job $frontendJob -Keep
        Start-Sleep -Seconds 2
    }
} finally {
    # Cleanup
    Stop-Job $authJob, $aptJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $authJob, $aptJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "Services stopped." -ForegroundColor Green
}
