# 🔥 Web Push Cheat Sheet

## Quick Commands

```bash
# Deploy everything
./deploy-push.bat

# Deploy only functions
cd functions && npm run build && firebase deploy --only functions

# Check logs
firebase functions:log --only onNewOrderForAdmin

# List deployed functions
firebase functions:list

# Test re-engagement
curl "https://us-central1-coffeeaddict-c9d70.cloudfunctions.net/testReengage?userId=USER_ID"
```

## Key Files

| File | Purpose |
|------|---------|
| `functions/src/triggers.ts` | 5 Firestore triggers |
| `functions/src/cron.ts` | Re-engagement scheduler |
| `functions/src/fcm.ts` | FCM utilities |
| `src/features/notifications/subscribe.tsx` | Modal UI |
| `src/features/notifications/api.ts` | Frontend API |
| `public/firebase-messaging-sw.js` | Service Worker |

## Environment Variables

```env
# .env (required)
VITE_FCM_VAPID_KEY=BKPPcrrCt_ZQW8zIuxACO86IxEMQ8aOWKuJFeqONaI6eSyh8zVAdebf0TM_fGylIRjmnPDyiDwpuq5kC5bNNKmU
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=coffeeaddict-c9d70
# ... other Firebase config
```

## Admin Setup (Firestore)

```javascript
// users/{admin_uid}
{
  role: 'admin',
  pushOptIn: true,
  fcmToken: 'xxx...'  // Get from UI
}
```

## Test Scenarios

### 1. Admin Notification
```javascript
// Create order as client
await addDoc(collection(db, 'orders'), {
  userId: 'client_uid',
  userName: 'Test',
  status: 'pending',
  shortId: '12345',
  createdAt: new Date()
});
// Admin receives "Новый заказ! 🔔"
```

### 2. Order Accepted
```javascript
await updateDoc(doc(db, 'orders', 'ORDER_ID'), {
  status: 'accepted'
});
// Client receives "Заказ принят! ☕"
```

### 3. New Promotion
```javascript
await addDoc(collection(db, 'promotions'), {
  title: 'Test Promo',
  deeplink: '/promotions/test'
});
// All subscribed receive "Новая акция! 🎉"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No admins found" | Set `role: 'admin'` + `pushOptIn: true` |
| "No FCM token" | Click "Включить уведомления" in app |
| "Sound not playing" | Web: system sound only; Foreground: requires user gesture |
| "Modal not showing" | Check `Notification.permission` (should be 'default') |

## Sound Config

- **Web Background**: System sound (via `silent: false`)
- **Android**: `sound: 'default'`
- **iOS**: `sound: 'default'`
- **Foreground**: `notify.mp3` (after user click)

## Notification Types & TTL

| Type | TTL | Target |
|------|-----|--------|
| newOrderAdmin | None | Admins |
| orderAccepted | 1h | Client |
| promotion | None | Subscribers |
| story | None | Subscribers |
| achievement | 168h | Client |
| reengage7d | 48h | Inactive |

## CRON Schedule

```typescript
// Daily 10:00 AM Asia/Almaty
.schedule('0 10 * * *')
.timeZone('Asia/Almaty')
```

## Firestore Collections

- `notifications_log` — All sent notifications
- `users/{uid}/tokens/{token}` — FCM tokens
- `users/{uid}/notifications_suppress/{type}` — Deduplication

---

**Full Docs**: `README_PUSH.md`  
**Quick Start**: `PUSH_QUICKSTART.md`  
**Summary**: `PUSH_IMPLEMENTATION_SUMMARY.md`
