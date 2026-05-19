@echo off
cd /d d:\API-One

REM Create directories
mkdir src 2>nul
mkdir src\routes 2>nul
mkdir src\services 2>nul
mkdir src\services\providers 2>nul
mkdir src\middleware 2>nul
mkdir src\utils 2>nul
mkdir src\models 2>nul
mkdir logs 2>nul

echo Directories created successfully!
