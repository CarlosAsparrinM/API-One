@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║   API-One - Form 1: Auto-Fallback Implementation             ║
echo ║   Starting server and testing...                               ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo [1/3] Starting API server...
start "API-One Server" cmd /k "cd /d d:\API-One && node src/server.js"

timeout /t 3 /nobreak

echo [2/3] Running tests...
timeout /t 2 /nobreak

node d:\API-One\test-form1.js

echo.
echo [3/3] Done!
echo.
echo 📌 Notes:
echo   - Server window should remain open
echo   - Model endpoint returns: api-fallback
echo   - Chat endpoint internally uses: auto (for fallback)
echo   - Metadata shows which provider was actually used
echo.
pause
