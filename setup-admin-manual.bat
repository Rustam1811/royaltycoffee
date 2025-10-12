@echo off
echo.
echo ================================================
echo   AUTO SETUP ADMIN - SUNFOODAPP
echo ================================================
echo.

set ADMIN_UID=MswmRmPTBzegI9aex6esxSomUL92
set PROJECT_ID=coffeeaddict-c9d70

echo [1/2] Получаю Firebase ID Token...
echo.
echo ВАЖНО: Запусти эту команду в браузере:
echo.
echo 1. Открой http://localhost:5173
echo 2. Открой DevTools (F12) -^> Console
echo 3. Вставь и запусти:
echo.
echo import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
echo const token = await getAuth().currentUser.getIdToken();
echo console.log(token);
echo.
echo 4. Скопируй токен
echo 5. Затем запусти этот PowerShell скрипт:
echo.
echo $token = "ВСТАВЬ_ТОКЕН_СЮДА"
echo $body = @{ fields = @{ role = @{ stringValue = "admin" }; pushOptIn = @{ booleanValue = $true } } } ^| ConvertTo-Json -Depth 10
echo $headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
echo Invoke-RestMethod -Uri "https://firestore.googleapis.com/v1/projects/%PROJECT_ID%/databases/(default)/documents/users/%ADMIN_UID%?updateMask.fieldPaths=role&updateMask.fieldPaths=pushOptIn" -Method PATCH -Body $body -Headers $headers
echo.
echo ================================================
echo.

pause
