# Push Notifications Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Generate VAPID Key (2 minutes)

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`coffeeaddict-c9d70`)
3. Go to **Project Settings** (gear icon) → **Cloud Messaging** tab
4. Scroll to **Web Push certificates**
5. Click **Generate key pair**
6. Copy the generated key

### Step 2: Add to Environment (30 seconds)

Create or update `.env.local`:

```env
VITE_FCM_VAPID_KEY=BG1234567890... # Paste the key from Step 1
```

### Step 3: Build & Deploy Functions (2 minutes)

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### Step 4: Deploy Firestore Rules (30 seconds)

```bash
firebase deploy --only firestore:rules
```

### Step 5: Test (1 minute)

1. Start your dev server: `npm run dev`
2. Open browser console
3. Run:
```javascript
const permission = await Notification.requestPermission();
console.log(permission); // Should be "granted"
```

4. Create a test promotion in Firestore Console
5. Check if notification arrives!

---

## 📱 Client Integration

### Basic Usage

```typescript
import { useNotifications } from '@/features/notifications';

function MyComponent() {
  const { requestPermission, togglePromotions } = useNotifications(userId);
  
  return (
    <button onClick={requestPermission}>
      Enable Notifications
    </button>
  );
}
```

### Full Featured Component

```tsx
import { NotificationSettings } from '@/features/notifications';

function ProfilePage() {
  return (
    <NotificationSettings 
      userId={currentUser.id}
      initialPreferences={{
        subscribePromotions: true,
        subscribeStories: false
      }}
    />
  );
}
```

---

## 🧪 Testing

### Test in Browser

Open `test-push-notifications-flow.html` in your browser and use the UI to:
- Create test promotions
- Create test stories  
- Update order status
- Trigger re-engagement
- View logs

### Manual Test via Firestore Console

1. Go to Firestore Console
2. Create document in `promotions` collection:
```json
{
  "title": "Test Promotion",
  "body": "This is a test",
  "deeplink": "/promotions",
  "createdAt": "2025-01-10T10:00:00Z",
  "active": true
}
```
3. Wait 2-3 seconds
4. Notification should arrive!

### Check Logs

```javascript
// In browser console
const logs = await firebase.firestore()
  .collection('notifications_log')
  .orderBy('ts', 'desc')
  .limit(5)
  .get();

logs.forEach(doc => console.log(doc.data()));
```

---

## 🎯 Production Deployment

### Checklist

- [x] VAPID key generated and added to `.env`
- [x] Functions built: `cd functions && npm run build`
- [x] Functions deployed: `firebase deploy --only functions`
- [x] Firestore rules deployed: `firebase deploy --only firestore:rules`
- [ ] Test notification flow in production
- [ ] Verify CRON runs at 10:00 AM (check next day)
- [ ] Monitor logs for first 24 hours

### Deploy Command

```bash
# Build client
npm run build

# Build and deploy functions
cd functions
npm run build
cd ..

# Deploy everything
firebase deploy
```

---

## 🐛 Common Issues

### "Permission denied" when writing token

**Solution**: Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```

### Service Worker not loading

**Solution**: Clear browser cache
```javascript
// Visit /sw-reset.html or run:
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()));
```

### No notification received

**Checklist**:
1. ✓ VAPID key is correct in `.env`
2. ✓ Service worker registered (check DevTools → Application → Service Workers)
3. ✓ Browser permission granted (Notification.permission === "granted")
4. ✓ User has `pushOptIn: true` and topic subscription in Firestore
5. ✓ Check Firebase Console → Functions → Logs for errors

### CRON not running

**Check**:
1. Function deployed: `firebase deploy --only functions:reengageInactiveUsers`
2. Cloud Scheduler enabled in GCP Console
3. View logs: Firebase Console → Functions → `reengageInactiveUsers` → Logs

---

## 📊 Monitor

### View Recent Notifications

Firebase Console → Firestore → `notifications_log` collection

### Function Logs

Firebase Console → Functions → Select function → Logs tab

### User Tokens

Firebase Console → Firestore → `users/{userId}/tokens`

---

## 🎉 Success Criteria

- ✅ Browser notification permission granted
- ✅ Notification received when creating promotion
- ✅ Notification received when creating story
- ✅ Notification received when order accepted
- ✅ Re-engagement scheduled and running
- ✅ Logs showing successful deliveries
- ✅ Invalid tokens cleaned up automatically

---

## 📞 Need Help?

Check full documentation: `PUSH_NOTIFICATIONS_README.md`

Common patterns:
- Request permission: `src/features/notifications/notification-permission.ts`
- Subscribe to topics: `src/features/notifications/subscribe.ts`
- React hook: `src/features/notifications/useNotifications.ts`
- Component: `src/features/notifications/NotificationSettings.tsx`
