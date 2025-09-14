@echo off
cd /d "d:\IT\SunfoodApp\admin"
call npm run build
xcopy /E /Y "dist\*" "..\dist\admin\"
cd /d "d:\IT\SunfoodApp"
call firebase deploy --only hosting
