@echo off
setlocal enabledelayedexpansion

title MongoDB & Compass Installer and Configurator

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with Administrator privileges.
) else (
    echo [INFO] Relaunching with Administrator privileges...
    powershell -Command "Start-Process -FilePath '%~dpnx0' -Verb RunAs"
    exit /b
)

echo ==========================================================
echo  MongoDB Server & Compass Auto Setup Script
echo ==========================================================
echo.

:: 1. Check & Install MongoDB Community Server
echo [1/4] Checking MongoDB Database Service...
sc query MongoDB >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] MongoDB Service already exists.
) else (
    echo [INFO] MongoDB Service not found. Downloading MongoDB Community Server 7.0.6...
    powershell -Command "Write-Host 'Downloading MongoDB Server MSI...'; Invoke-WebRequest -Uri 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.6-signed.msi' -OutFile '%TEMP%\mongodb_server.msi'"
    if exist "%TEMP%\mongodb_server.msi" (
        echo [INFO] Installing MongoDB Server silently (this may take a minute)...
        msiexec.exe /i "%TEMP%\mongodb_server.msi" /quiet /qn /norestart ADDLOCAL="ServerService,Client"
        echo [OK] MongoDB Server installed successfully.
    ) else (
        echo [ERROR] Failed to download MongoDB Server MSI.
    )
)

:: 2. Ensure MongoDB Service is Running
echo.
echo [2/4] Verifying MongoDB Service Status...
sc query MongoDB | findstr /i "RUNNING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] MongoDB Service is already running.
) else (
    echo [INFO] Starting MongoDB Service...
    net start MongoDB
    if !errorLevel! == 0 (
        echo [OK] MongoDB Service started successfully.
    ) else (
        echo [WARNING] Could not start MongoDB Service. Please check Event Viewer.
    )
)

:: 3. Check & Install MongoDB Compass
echo.
echo [3/4] Checking MongoDB Compass...
if exist "%LOCALAPPDATA%\MongoDBCompass\MongoDBCompass.exe" (
    echo [OK] MongoDB Compass is already installed.
) else if exist "%ProgramFiles%\MongoDB\Compass\MongoDBCompass.exe" (
    echo [OK] MongoDB Compass is already installed.
) else (
    echo [INFO] MongoDB Compass not found. Downloading MongoDB Compass (v1.43.0)...
    powershell -Command "Write-Host 'Downloading MongoDB Compass MSI...'; Invoke-WebRequest -Uri 'https://downloads.mongodb.com/compass/mongodb-compass-1.43.0-win32-x64.msi' -OutFile '%TEMP%\mongodb_compass.msi'"
    if exist "%TEMP%\mongodb_compass.msi" (
        echo [INFO] Installing MongoDB Compass silently...
        msiexec.exe /i "%TEMP%\mongodb_compass.msi" /quiet /qn /norestart
        echo [OK] MongoDB Compass installed successfully.
    ) else (
        echo [ERROR] Failed to download MongoDB Compass MSI.
    )
)

:: 4. Auto-Configure .env File MongoDB URI
echo.
echo [4/4] Configuring .env Environment Settings...
set "ENV_FILE=%~dp0.env"
set "DEFAULT_URI=MONOGDB_URI = "mongodb://localhost:27017/IOT_Monitor_System""

if not exist "!ENV_FILE!" (
    echo [INFO] Creating new .env file with default connection URI...
    echo # Browser PORT> "!ENV_FILE!"
    echo BROWSER = none>> "!ENV_FILE!"
    echo Port = 3000>> "!ENV_FILE!"
    echo MONITORING_INTERVAL = 5000>> "!ENV_FILE!"
    echo.>> "!ENV_FILE!"
    echo # MongoDB Connection>> "!ENV_FILE!"
    echo !DEFAULT_URI!>> "!ENV_FILE!"
    echo SESSION_SECRET = "0hLN9GS3oVIOIjr63bcb9FkGrA41gtMI">> "!ENV_FILE!"
    echo.>> "!ENV_FILE!"
    echo # JWT Secret>> "!ENV_FILE!"
    echo JWT_SECRET = "6zbCLiRanshrJ0ckpjWNc2m5C4fjZTkZT4EEFZ8zpT5xgRineZEg2o6uIq33vbmy">> "!ENV_FILE!"
    echo JWT_EXPIRATION = "1h">> "!ENV_FILE!"
    echo [OK] Default .env file created successfully.
) else (
    echo [INFO] Verifying existing .env configuration...
    findstr /r "^[ ]*MONOGDB_URI[ ]*=" "!ENV_FILE!" >nul 2>&1
    if !errorLevel! == 0 (
        echo [OK] MONOGDB_URI already configured in .env.
    ) else (
        echo [INFO] Appending default MONOGDB_URI to .env...
        echo.>> "!ENV_FILE!"
        echo # MongoDB Connection>> "!ENV_FILE!"
        echo !DEFAULT_URI!>> "!ENV_FILE!"
        echo [OK] MONOGDB_URI appended to .env.
    )
)

echo.
echo ==========================================================
echo  Database Setup & Verification Complete!
echo ==========================================================
echo  Default URI: mongodb://localhost:27017/IOT_Monitor_System
echo ==========================================================
echo.
pause
