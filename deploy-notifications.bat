@echo off
REM Push Notifications Deployment Script for SunfoodApp (Windows)
REM Run this script to deploy all notification-related components

echo.
echo ============================================
echo  Push Notifications Deployment - SunfoodApp
echo ============================================
echo.

REM Check if .env exists
if not exist .env (
    echo WARNING: .env file not found!
    echo Make sure VITE_FCM_VAPID_KEY is configured
    echo.
    pause
)

REM Step 1: Build Functions
echo [1/4] Building Cloud Functions...
cd functions
call npm install
call npm run build
cd ..
echo [OK] Functions built successfully
echo.

REM Step 2: Deploy Firestore Rules
echo [2/4] Deploying Firestore Security Rules...
call firebase deploy --only firestore:rules
echo [OK] Firestore rules deployed
echo.

REM Step 3: Deploy Functions
echo [3/4] Deploying Cloud Functions...
call firebase deploy --only functions:onPromotionCreated,functions:onStoryCreated,functions:onOrderUpdated,functions:onNewsCreated,functions:reengageInactiveUsers,functions:testReengage
echo [OK] Functions deployed
echo.

REM Step 4: Build Client (optional)
echo [4/4] Building Client App...
call npm run build
echo [OK] Client built
echo.

echo ============================================
echo  Deployment Complete!
echo ============================================
echo.
echo Next Steps:
echo 1. Test notification flow: test-push-notifications-flow.html
echo 2. Monitor logs: Firebase Console - Functions
echo 3. Check notifications_log in Firestore
echo.
echo CRON Schedule:
echo - Re-engagement runs daily at 10:00 AM Asia/Almaty
echo - Check GCP Console - Cloud Scheduler
echo.

pause
