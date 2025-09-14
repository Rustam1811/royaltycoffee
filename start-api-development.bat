@echo off
echo Starting Development API Server...
cd /d "%~dp0"
set NODE_ENV=development
node api-server.js
pause
