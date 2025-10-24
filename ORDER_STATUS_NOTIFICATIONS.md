# Order Status Notifications - Cloud Function

## Overview

Cloud Function для автоматической отправки push-уведомлений клиентам при изменении статуса заказа.

## Architecture

```
Firestore Trigger (onDocumentUpdated)
        ↓
orders/{orderId} updated
        ↓
Check: status changed?
        ↓
Check: ORDER_STATUS_META.notifyCustomer === true?
        ↓
Get user FCM token from Firestore
        ↓
Generate notification content
        ↓
Send FCM push notification
        ↓
Save to notifications collection
```

## Features

✅ **Automatic Notifications**: Triggers on any order status change  
✅ **Smart Filtering**: Only sends when `ORDER_STATUS_META.notifyCustomer = true`  
✅ **Localized Messages**: Russian language, emoji icons  
✅ **Deep Links**: `sunfoodapp://order/{orderId}` for in-app navigation  
✅ **Token Validation**: Automatically removes invalid FCM tokens  
✅ **Error Handling**: Comprehensive logging and error recovery  
✅ **Notification History**: Saves to `notifications` collection  

## Notification Rules

Based on `ORDER_STATUS_META` from `admin/src/types/orderStatus.ts`:

| Status | Notify Customer | Message |
|--------|----------------|---------|
| `NEW` | ❌ No | Customer created it |
| `ACCEPTED` | ✅ Yes | "✅ Заказ принят" |
| `PREPARING` | ✅ Yes | "👨‍🍳 Готовим ваш заказ" |
| `READY` | ✅ Yes | "🎉 Заказ готов!" |
| `ASSIGNED` | ✅ Yes | "🚗 Назначен курьер" |
| `PICKED_UP` | ✅ Yes | "📦 Курьер забрал заказ" |
| `ON_THE_WAY` | ✅ Yes | "🛵 Курьер в пути" |
| `DELIVERED` | ✅ Yes | "✨ Заказ доставлен!" |
| `COMPLETED` | ✅ Yes | "✅ Заказ выполнен" |
| `CANCELLED` | ✅ Yes | "❌ Заказ отменён" |

## Data Flow

### Input (Firestore Trigger)
```javascript
// Before
{
  status: 'PREPARING',
  userId: 'user123',
  orderNumber: 'ORD-001',
  // ... other fields
}

// After
{
  status: 'READY', // Changed!
  userId: 'user123',
  orderNumber: 'ORD-001',
  type: 'delivery',
  // ... other fields
}
```

### Process
1. ✅ Status changed: `PREPARING` → `READY`
2. ✅ `ORDER_STATUS_META.READY.notifyCustomer = true`
3. ✅ Get user FCM token from Firestore
4. ✅ Generate notification: "🎉 Заказ готов!"
5. ✅ Send via Firebase Cloud Messaging

### Output (FCM Message)
```javascript
{
  notification: {
    title: "🎉 Заказ готов!",
    body: "Заказ №ORD-001 готов. Ожидаем курьера"
  },
  data: {
    type: "order_status",
    orderId: "abc123",
    status: "READY",
    orderNumber: "ORD-001",
    url: "/orders/abc123",
    deepLink: "sunfoodapp://order/abc123",
    timestamp: "2025-10-24T12:00:00.000Z"
  },
  token: "fcm_token_here"
}
```

## Firestore Collections

### Input: `orders/{orderId}`
```javascript
{
  status: 'READY',              // OrderStatus enum
  userId: 'user123',            // Customer ID
  orderNumber: 'ORD-001',       // Display number
  type: 'delivery' | 'pickup',  // Order type
  courier: {                    // Optional: for ASSIGNED status
    name: 'Иван',
    phone: '+7 777 123 4567'
  },
  eta: 1800,                    // Optional: seconds for ON_THE_WAY
  cancellationReason: '...',    // Optional: for CANCELLED
  // ... other order fields
}
```

### Output: `notifications/{notificationId}`
```javascript
{
  userId: 'user123',
  orderId: 'abc123',
  type: 'order_status',
  status: 'READY',
  title: '🎉 Заказ готов!',
  body: 'Заказ №ORD-001 готов. Ожидаем курьера',
  sentAt: Timestamp,
  read: false
}
```

### Required: `users/{userId}`
```javascript
{
  fcmToken: 'fcm_token_here',     // Required for notifications
  notificationsEnabled: true,      // Required to be true
  // ... other user fields
}
```

## Error Handling

### Invalid FCM Token
```javascript
// Error codes:
// - messaging/invalid-registration-token
// - messaging/registration-token-not-registered

// Action: Automatically removes token from user document
await db.collection('users').doc(userId).update({
  fcmToken: admin.firestore.FieldValue.delete()
});
```

### Missing User
```javascript
// User not found in Firestore
return { success: false, error: 'User not found' };
```

### Notifications Disabled
```javascript
// userData.notificationsEnabled === false
return { success: false, error: 'Notifications disabled' };
```

## Deployment

### Deploy Function
```bash
cd functions
firebase deploy --only functions:onOrderStatusChanged
```

### Deploy All Functions
```bash
firebase deploy --only functions
```

### View Logs
```bash
firebase functions:log --only onOrderStatusChanged
```

## Testing

### Test with Firestore Update
```javascript
// In Firebase Console or via SDK
db.collection('orders').doc('test-order-123').update({
  status: 'READY'
});

// Expected log output:
// 📝 Order test-order-123 updated
// Status: PREPARING → READY
// ✅ Successfully sent notification for order test-order-123
```

### Test Notification Content
```javascript
const { getNotificationContent } = require('./src/orderNotifications');

const content = getNotificationContent('READY', {
  orderNumber: 'ORD-001',
  type: 'delivery'
});

console.log(content);
// {
//   title: '🎉 Заказ готов!',
//   body: 'Заказ №ORD-001 готов. Ожидаем курьера'
// }
```

## Integration with Order Status Service

The Cloud Function uses the same `ORDER_STATUS_META` structure as the TypeScript service:

**TypeScript** (`admin/src/types/orderStatus.ts`):
```typescript
export const ORDER_STATUS_META: Record<OrderStatus, StatusMetadata> = {
  READY: {
    label: 'Готов',
    description: 'Заказ готов к выдаче/доставке',
    icon: '🎉',
    color: 'purple',
    notifyCustomer: true,  // ← Enables notification
    notifyStaff: false,
  },
  // ...
};
```

**JavaScript** (`functions/src/orderNotifications.js`):
```javascript
const ORDER_STATUS_META = {
  READY: {
    label: 'Готов',
    description: 'Заказ готов к выдаче/доставке',
    icon: '🎉',
    color: 'purple',
    notifyCustomer: true,  // ← Same flag
    notifyStaff: false,
  },
  // ...
};
```

## Performance

- **Region**: `europe-west1` (Frankfurt, близко к Алматы)
- **Memory**: `256MiB` (достаточно для FCM)
- **Timeout**: `60s` (max, но обычно ~1-2s)
- **Cold Start**: ~2-3s
- **Warm Execution**: ~500ms

## Security

### Firestore Rules (orders collection)
```javascript
match /orders/{orderId} {
  // Allow read for order owner or staff
  allow read: if request.auth != null && 
    (resource.data.userId == request.auth.uid || 
     hasRole(['admin', 'barista', 'courier']));
  
  // Allow write for staff only
  allow write: if request.auth != null && 
    hasRole(['admin', 'barista', 'courier']);
}
```

### Cloud Function Permissions
- Function automatically has Firestore read/write access
- Uses Firebase Admin SDK with elevated permissions
- No manual auth required (runs as service account)

## Monitoring

### Firebase Console
1. Go to **Functions** → **onOrderStatusChanged**
2. View **Metrics**: Invocations, Errors, Execution time
3. View **Logs**: Real-time function logs

### Expected Logs
```
✅ Success:
📝 Order abc123 updated
Status: PREPARING → READY
✅ Successfully sent notification for order abc123

❌ Error (invalid token):
📝 Order abc123 updated
Status: PREPARING → READY
❌ Error sending notification to user123: messaging/invalid-registration-token
Removed invalid FCM token for user user123

⚠️ Skip (no change):
📝 Order abc123 updated
Status unchanged, skipping notification
```

## Maintenance

### Syncing ORDER_STATUS_META
When updating `admin/src/types/orderStatus.ts`:

1. Update TypeScript definition
2. Update `functions/src/orderNotifications.js` (keep in sync!)
3. Update notification messages in `getNotificationContent()`
4. Test with `npm run test` (if tests exist)
5. Deploy: `firebase deploy --only functions:onOrderStatusChanged`

### Adding New Status
1. Add to `OrderStatus` enum (TypeScript)
2. Add to `ORDER_STATUS_META` (both TypeScript & JavaScript)
3. Add case in `getNotificationContent()` function
4. Test notification content
5. Deploy

## Troubleshooting

### Notifications Not Received

**Check 1**: FCM Token exists?
```javascript
const user = await db.collection('users').doc(userId).get();
console.log(user.data().fcmToken); // Should not be null
```

**Check 2**: Notifications enabled?
```javascript
console.log(user.data().notificationsEnabled); // Should be true
```

**Check 3**: Status changed?
```javascript
// In function logs
console.log(`Status: ${before.status} → ${after.status}`);
```

**Check 4**: Should notify for this status?
```javascript
console.log(ORDER_STATUS_META[newStatus].notifyCustomer); // Should be true
```

**Check 5**: Function deployed?
```bash
firebase functions:list | grep onOrderStatusChanged
```

### Invalid Token Errors

This is **normal** behavior when:
- User logged out
- User reinstalled app
- Token expired

The function **automatically removes** invalid tokens.

To fix:
1. User opens app
2. App requests new FCM token
3. App saves to Firestore (`users/{userId}.fcmToken`)
4. Notifications work again

## Cost Estimation

Firebase Functions **Free Tier**:
- 2M invocations/month
- 400,000 GB-seconds
- 200,000 CPU-seconds

**Typical Usage** (1000 orders/day):
- ~1000 function invocations/day = ~30K/month
- Well within free tier ✅

Firebase Cloud Messaging (FCM):
- **Free** unlimited notifications! ✅

## Related Files

- `functions/src/orderNotifications.js` - Cloud Function implementation
- `functions/index.js` - Function exports
- `admin/src/types/orderStatus.ts` - TypeScript definitions (source of truth)
- `admin/src/services/orderStatusService.ts` - Status update logic
- `src/pwa/notifications.ts` - Client-side FCM setup

## Next Steps

1. ✅ Deploy function: `firebase deploy --only functions:onOrderStatusChanged`
2. ✅ Test with real order status change
3. ✅ Verify notification received on mobile device
4. ✅ Check notification history in Firestore
5. ✅ Monitor logs for errors

## Support

For issues or questions:
- Check Firebase Console logs
- Review this documentation
- Test with manual Firestore update
- Verify FCM token in user document
