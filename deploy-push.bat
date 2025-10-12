@echo off
echo.
echo ================================================
echo  SUNFOODAPP - WEB PUSH DEPLOYMENT
echo ================================================
echo.

echo [1/5] Building Cloud Functions...
cd functions
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: TypeScript compilation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [2/5] Deploying Cloud Functions...
call firebase deploy --only functions:onNewOrderForAdmin,functions:onAchievementUnlocked,functions:onPromotionCreated,functions:onOrderUpdated,functions:onStoryCreated,functions:reengageInactiveUsers
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Functions deployment failed!
    pause
    exit /b 1
)

echo.
echo [3/5] Deploying Firestore Rules...
call firebase deploy --only firestore:rules
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Firestore rules deployment failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Building Frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Deploying Hosting (Service Worker)...
call firebase deploy --only hosting
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Hosting deployment failed!
    pause
    exit /b 1
)

echo.
echo ================================================
echo  DEPLOYMENT COMPLETE!
echo ================================================
echo.
echo Next steps:
echo 1. Verify VAPID key in .env
echo 2. Setup admin user (role: 'admin', pushOptIn: true)
echo 3. Test notification flow
echo.
echo Check logs: firebase functions:log
echo.
pause
