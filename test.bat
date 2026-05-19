@echo off
REM Test script for API-One (Windows)

set BASE_URL=http://localhost:3000

echo 🧪 Testing API-One...
echo.

echo 1️⃣  Testing health endpoint...
curl -s %BASE_URL%/health
echo.
echo.

echo 2️⃣  Testing providers list...
curl -s %BASE_URL%/api/providers
echo.
echo.

echo 3️⃣  Testing stats endpoint...
curl -s %BASE_URL%/api/stats
echo.
echo.

echo ✅ Tests completed!
