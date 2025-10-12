@echo off
cls
echo.
echo ========================================================
echo   АВТОМАТИЧЕСКАЯ НАСТРОЙКА АДМИНА - SUNFOODAPP
echo ========================================================
echo.
echo [Шаг 1] Запускаю dev server...
echo.

REM Проверяем, запущен ли уже dev server
curl -s http://localhost:5173 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Dev server не запущен. Запускаю...
    start "SunfoodApp Dev Server" cmd /k "npm run dev"
    echo Жду 10 секунд пока сервер запустится...
    timeout /t 10 /nobreak >nul
) else (
    echo Dev server уже запущен!
)

echo.
echo [Шаг 2] Открываю приложение...
start http://localhost:5173

echo.
echo [Шаг 3] Открываю страницу автонастройки...
timeout /t 2 /nobreak >nul
start setup-admin-notifications.html

echo.
echo ========================================================
echo   ИНСТРУКЦИЯ:
echo ========================================================
echo.
echo 1. В первой вкладке (localhost:5173):
echo    - Залогинься как admin@mail.com
echo    - Закрой вкладку
echo.
echo 2. Во второй вкладке (setup-admin-notifications.html):
echo    - Страница АВТОМАТИЧЕСКИ запустит настройку через 1 сек
echo    - Или нажми кнопку "Настроить админа"
echo    - Разреши уведомления когда браузер попросит
echo    - Дождись "НАСТРОЙКА ЗАВЕРШЕНА!"
echo.
echo 3. Тестирование:
echo    - Открой приложение снова
echo    - Создай тестовый заказ
echo    - Проверь уведомление!
echo.
echo ========================================================
echo.
pause
