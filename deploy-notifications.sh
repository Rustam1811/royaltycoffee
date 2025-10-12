#!/bin/bash

# Push Notifications Deployment Script for SunfoodApp
# Run this script to deploy all notification-related components

set -e  # Exit on error

echo "🔔 SunfoodApp Push Notifications Deployment"
echo "==========================================="
echo ""

# Check if VAPID key is set
if [ -z "$VITE_FCM_VAPID_KEY" ]; then
    echo "⚠️  WARNING: VITE_FCM_VAPID_KEY not found in environment!"
    echo "   Make sure it's set in your .env file"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Build Functions
echo "📦 Step 1/4: Building Cloud Functions..."
cd functions
npm install
npm run build
cd ..
echo "✅ Functions built successfully"
echo ""

# Step 2: Deploy Firestore Rules
echo "🔐 Step 2/4: Deploying Firestore Security Rules..."
firebase deploy --only firestore:rules
echo "✅ Firestore rules deployed"
echo ""

# Step 3: Deploy Functions
echo "☁️  Step 3/4: Deploying Cloud Functions..."
firebase deploy --only functions:onPromotionCreated,functions:onStoryCreated,functions:onOrderUpdated,functions:onNewsCreated,functions:reengageInactiveUsers,functions:testReengage
echo "✅ Functions deployed"
echo ""

# Step 4: Build Client
echo "🌐 Step 4/4: Building Client App..."
npm run build
echo "✅ Client built"
echo ""

echo "🎉 Deployment Complete!"
echo ""
echo "Next Steps:"
echo "1. Test notification flow: Open test-push-notifications-flow.html"
echo "2. Monitor function logs: Firebase Console → Functions"
echo "3. Check notifications_log collection in Firestore"
echo ""
echo "CRON Schedule:"
echo "- Re-engagement runs daily at 10:00 AM Asia/Almaty"
echo "- Check GCP Console → Cloud Scheduler for status"
echo ""
