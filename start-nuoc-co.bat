@echo off
title Nuoc Co - Chien Truong Co Vua
cd /d "%~dp0"

:: Kiem tra neu web server co vua dang chay o port 3000
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start http://localhost:3000
    exit
)

:: Neu chua chay, khoi dong server trong che do chay nen va mo trinh duyet
start /b cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
start http://localhost:3000
exit
