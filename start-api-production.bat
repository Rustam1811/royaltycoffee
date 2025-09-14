@echo off
echo Starting Production API Server...
cd /d "d:\IT\SunfoodApp\api-server"
set NODE_ENV=production
call npm start
pause
