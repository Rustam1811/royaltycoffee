# Push Notifications (Web FCM) - SunfoodApp

Complete implementation of Web Push notifications using Firebase Cloud Messaging for the SunfoodApp.

## Features

1. **New Promotion Notifications** - Push to all subscribed users when a new promotion is created
2. **New Story Notifications** - Push to all subscribed users when a new story is published
3. **Order Accepted Notifications** - Push to user when barista accepts their order
4. **Re-engagement Notifications** - Daily CRON job to notify inactive users (7+ days without order)

## Architecture

### Client-Side (Web)
- `src/lib/firebase.ts` - Firebase Messaging initialization
- `public/firebase-messaging-sw.js` - Service Worker for background notifications
- `src/features/notifications/notification-permission.ts` - Permission request and token management
- `src/features/notifications/subscribe.ts` - Subscription preferences management

### Server-Side (Cloud Functions)
- `functions/src/admin.ts` - Firebase Admin SDK initialization
- `functions/src/fcm.ts` - FCM utilities (send, multicast, token cleanup)
- `functions/src/guard.ts` - Anti-duplicate notification logic
- `functions/src/triggers.ts` - Firestore triggers for promotions, stories, orders
- `functions/src/cron.ts` - Scheduled re-engagement function (daily 10:00 Asia/Almaty)

## Setup Instructions

### 1. Environment Variables

#### Client (.env)
```env
VITE_FCM_VAPID_KEY=your_vapid_key_here
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Functions
Firebase Functions use `FIREBASE_CONFIG` automatically in production. For local development with service account:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

### 2. Generate VAPID Key

1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Under "Web Push certificates", click "Generate key pair"
3. Copy the key and add it to your `.env` file as `VITE_FCM_VAPID_KEY`

### 3. Configure Authorized Domains

In Firebase Console → Project Settings → Cloud Messaging:
- Add your production domain (e.g., `sunfoodapp.com`)
- Add `localhost` for local development

### 4. Install Dependencies

#### Client
```bash
npm install
```

#### Functions
```bash
cd functions
npm install
```

### 5. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 6. Build and Deploy Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

## Client Integration

### Request Permission and Get Token

```typescript
import { requestNotificationPermission } from '@/features/notifications/notification-permission';

// In your app initialization or user profile page
const userId = 'user123';
const token = await requestNotificationPermission(userId);

if (token) {
  console.log('Notification permission granted');
} else {
  console.log('Notification permission denied');
}
```

### Subscribe to Topics

```typescript
import { subscribeToPromotions, subscribeToStories } from '@/features/notifications/subscribe';

// Subscribe to promotion notifications
await subscribeToPromotions(userId, true);

// Subscribe to story notifications
await subscribeToStories(userId, true);

// Unsubscribe
await subscribeToPromotions(userId, false);
```

### Handle Foreground Messages

```typescript
import { setupForegroundMessageHandler } from '@/features/notifications/notification-permission';

setupForegroundMessageHandler((payload) => {
  // Show in-app notification or toast
  console.log('Received foreground message:', payload);
  
  // Example: Show toast notification
  showToast(payload.title, payload.body);
});
```

## Data Model

### users/{uid}
```typescript
{
  pushOptIn: boolean;           // Master push notification toggle
  marketingOptIn: boolean;      // Marketing consent
  subscribePromotions: boolean; // Subscribe to promotion notifications
  subscribeStories: boolean;    // Subscribe to story notifications
  lastOrderAt: Timestamp;       // Last order timestamp (for re-engagement)
}
```

### users/{uid}/tokens/{token}
```typescript
{
  createdAt: Timestamp;
  platform: 'web';
  userAgent: string;
}
```

### users/{uid}/notifications_suppress/{type}
```typescript
{
  lastSentAt: Timestamp;
  ttlHours: number;             // Time-to-live in hours
}
```

### notifications_log/{logId}
```typescript
{
  uid: string | null;           // User ID (null for broadcast)
  type: string;                 // Notification type
  ts: Timestamp;                // Timestamp
  tokensCount: number;          // Total tokens targeted
  successCount: number;         // Successful deliveries
  failureCount: number;         // Failed deliveries
}
```

## Cloud Functions

### Deployed Functions

1. **onPromotionCreated** - Trigger on `promotions/{id}` create
2. **onNewsCreated** - Trigger on `news/{id}` create (alternative to promotions)
3. **onStoryCreated** - Trigger on `stories/{id}` create
4. **onOrderUpdated** - Trigger on `orders/{id}` update (status → "accepted")
5. **reengageInactiveUsers** - Scheduled daily at 10:00 Asia/Almaty
6. **testReengage** - HTTP endpoint for testing re-engagement

### Notification Payloads

#### New Promotion
```json
{
  "notification": {
    "title": "Новая акция! 🎉",
    "body": "{{promotion.title}}"
  },
  "data": {
    "type": "promotion",
    "promotionId": "abc123",
    "deeplink": "/promotions/abc123"
  }
}
```

#### New Story
```json
{
  "notification": {
    "title": "Новая история! ✨",
    "body": "{{story.title}}"
  },
  "data": {
    "type": "story",
    "storyId": "xyz789",
    "deeplink": "/stories/xyz789"
  }
}
```

#### Order Accepted
```json
{
  "notification": {
    "title": "Заказ принят! ☕",
    "body": "Бариста подтвердил ваш заказ №{{shortId}}"
  },
  "data": {
    "type": "orderAccepted",
    "orderId": "order123",
    "deeplink": "/orders/order123"
  }
}
```

#### Re-engagement
```json
{
  "notification": {
    "title": "Скучали? ☕",
    "body": "Вернитесь за любимым напитком — акция ждёт внутри."
  },
  "data": {
    "type": "reengage7d",
    "deeplink": "/promotions"
  }
}
```

## Anti-Spam & Deduplication

### Suppression Rules

- **Order Accepted**: 1 hour TTL (prevents multiple notifications for same order)
- **Re-engagement**: 72 hours TTL (max 1 notification every 3 days)

### Token Cleanup

Invalid tokens (404, registration-token-not-registered) are automatically removed from Firestore after failed send attempts.

### Retry Logic

- Up to 3 retry attempts with exponential backoff (1s, 2s, 4s)
- Batch sending in chunks of 500 tokens (FCM limit)

## Testing

### Local Development

1. Start Firebase Emulators:
```bash
firebase emulators:start
```

2. Start client dev server:
```bash
npm run dev
```

3. Test notification permission in browser console:
```javascript
// Request permission
const permission = await Notification.requestPermission();
console.log(permission); // "granted", "denied", or "default"
```

### Test Re-engagement Manually

```bash
curl -X GET "https://us-central1-your-project.cloudfunctions.net/testReengage?userId=USER_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test Notification Flow

1. **Create test promotion** (via Admin panel or Firestore Console)
2. **Check logs**: Firebase Console → Functions → Logs
3. **Verify delivery**: Check browser notification or `notifications_log` collection

### E2E Test Script

```typescript
// Create test promotion
const promotionRef = await db.collection('promotions').add({
  title: 'Test Promotion',
  body: 'This is a test',
  deeplink: '/promotions/test',
  createdAt: new Date()
});

// Wait for Cloud Function to process
await new Promise(resolve => setTimeout(resolve, 2000));

// Check logs
const logs = await db.collection('notifications_log')
  .where('type', '==', 'promotion_created')
  .orderBy('ts', 'desc')
  .limit(1)
  .get();

console.log(logs.docs[0].data());
```

## Security

### Firestore Rules

- Users can only write their own tokens (`users/{uid}/tokens/{token}`)
- `notifications_suppress` is write-protected (Cloud Functions only)
- `notifications_log` is write-protected (Cloud Functions only)
- Admin emails can read logs for debugging

### Service Worker

- Service Worker is served from `/public/firebase-messaging-sw.js`
- Must be at root level for proper scope
- Uses same Firebase config as client app

## Monitoring

### Logs

All notifications are logged to `notifications_log` collection with:
- User ID (or null for broadcast)
- Notification type
- Timestamp
- Success/failure counts

### Firebase Console

Monitor function executions:
1. Firebase Console → Functions
2. Click on function name
3. View Logs, Metrics, and Health tabs

### Error Tracking

Failed token deliveries are logged and invalid tokens are automatically cleaned up.

## Production Checklist

- [ ] Generate VAPID key in Firebase Console
- [ ] Add VAPID key to `.env` file
- [ ] Configure authorized domains in Firebase Console
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Build functions: `cd functions && npm run build`
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Test notification flow in production
- [ ] Monitor logs for errors
- [ ] Verify CRON job runs at 10:00 AM Asia/Almaty

## Troubleshooting

### "Permission denied" errors
- Check Firestore rules are deployed
- Verify user authentication
- Ensure user owns the token being written

### No notifications received
- Check VAPID key is correct in `.env`
- Verify service worker is registered
- Check browser notification permission
- Inspect Firebase Console → Cloud Messaging logs

### Service Worker not loading
- Ensure `firebase-messaging-sw.js` is in `/public` directory
- Clear browser cache and service worker
- Check browser console for errors
- Visit `/sw-reset.html` to clear SW cache

### CRON not running
- Verify function deployed: `firebase deploy --only functions:reengageInactiveUsers`
- Check Cloud Scheduler in GCP Console
- Ensure timezone is set to `Asia/Almaty`
- View function logs for execution history

### Duplicate notifications
- Check `notifications_suppress` TTL values
- Verify guard logic in `guard.ts`
- Review logs for multiple function invocations

## Performance

- **Batch size**: 500 tokens per multicast (FCM limit)
- **Retry attempts**: 3 with exponential backoff
- **Token cleanup**: Automatic on 404/invalid-token errors
- **CRON frequency**: Once daily at 10:00 AM

## Future Enhancements

- [ ] Add notification categories (info, warning, urgent)
- [ ] Implement user-specific notification preferences UI
- [ ] Add A/B testing for notification content
- [ ] Track notification click-through rates
- [ ] Add notification scheduling (send at optimal times)
- [ ] Implement notification templates
- [ ] Add image support for rich notifications

## References

- [Firebase Cloud Messaging Web Guide](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Firebase Functions Schedule](https://firebase.google.com/docs/functions/schedule-functions)
