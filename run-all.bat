@echo off
title D-Vault Launcher
echo ========================================================
echo   Launching D-Vault Local Development Stack
echo ========================================================
echo.

echo [1/3] Starting Local Blockchain Node (Hardhat)...
start "D-Vault Blockchain Node" cmd /k "cd /d %~dp0blockchain && npm run node"

echo Waiting for Blockchain node to initialize...
timeout /t 4 /nobreak >nul

echo Deploying Smart Contracts to Local Node...
call cd /d %~dp0blockchain && npx hardhat run scripts/deploy.ts --network localhost

echo.
echo [2/3] Starting Backend API (Express on port 5000)...
start "D-Vault Backend API" cmd /k "cd /d %~dp0backend && npm run dev"

echo.
echo [3/3] Starting Frontend (Next.js on port 3000)...
start "D-Vault Frontend UI" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo   All services have been launched in separate windows!
echo.
echo   Frontend UI:     http://localhost:3000
echo   Backend API:     http://localhost:5000/health
echo   Blockchain RPC:  http://127.0.0.1:8545
echo ========================================================
echo.
pause
