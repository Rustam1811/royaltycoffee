import * as functions from 'firebase-functions';
import { sendToAllSubscribed, sendToUser, logNotification } from './fcm';
import { shouldSuppress, markAsSent } from './guard';
import { getFirestore } from './admin';

/**
 * Trigger when a new order is created (admin notification)
 * Sends notification to all admin users
 */
export const onNewOrderForAdmin = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    const order = snapshot.data();
    const orderId = context.params.orderId;
    const db = getFirestore();

    const adminsSnapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .where('pushOptIn', '==', true)
      .get();

    if (adminsSnapshot.empty) {
      return;
    }

    const shortId = order.shortId || orderId.substring(0, 8);
    const payload = {
      title: 'Новый заказ! 🔔',
      body: `Заказ №${shortId} от ${order.userName || 'клиента'}`,
      type: 'newOrderAdmin',
      orderId,
      deeplink: `/admin/orders/${orderId}`
    };

    let totalSuccess = 0;
    let totalFailure = 0;

    for (const adminDoc of adminsSnapshot.docs) {
      const result = await sendToUser(adminDoc.id, payload);
      totalSuccess += result.successCount;
      totalFailure += result.failureCount;
    }

    await logNotification('new_order_admin', {
      successCount: totalSuccess,
      failureCount: totalFailure,
      invalidTokens: []
    });
  });

/**
 * Trigger when a new achievement is unlocked for a user
 * Sends notification to that specific user
 */
export const onAchievementUnlocked = functions.firestore
  .document('users/{userId}/achievements/{achievementId}')
  .onCreate(async (snapshot, context) => {
    const achievement = snapshot.data();
    const userId = context.params.userId;
    const achievementId = context.params.achievementId;

    const suppress = await shouldSuppress(userId, `achievement_${achievementId}`, 168);
    if (suppress) {
      return;
    }

    const payload = {
      title: 'Достижение разблокировано! 🏆',
      body: achievement.title || 'Вы получили новое достижение',
      type: 'achievement',
      achievementId,
      deeplink: `/profile/achievements`
    };

    const result = await sendToUser(userId, payload);
    
    await markAsSent(userId, `achievement_${achievementId}`, 168);
    await logNotification('achievement_unlocked', result, userId);
  });

/**
 * Trigger when a new promotion is created
 * Sends notification to all users subscribed to promotions
 */
export const onPromotionCreated = functions.firestore
  .document('promotions/{promotionId}')
  .onCreate(async (snapshot, context) => {
    const promotion = snapshot.data();
    const promotionId = context.params.promotionId;

    const payload = {
      title: 'Новая акция! 🎉',
      body: promotion.title || 'Ознакомьтесь с нашим новым предложением',
      type: 'promotion',
      promotionId,
      deeplink: promotion.deeplink || `/promotions/${promotionId}`
    };

    const result = await sendToAllSubscribed('promotions', payload);
    
    await logNotification('promotion_created', result);
  });

/**
 * Trigger when a new story is created
 * Sends notification to all users subscribed to stories
 * Respects closeFriendsOnly flag for targeted notifications
 */
export const onStoryCreated = functions.firestore
  .document('stories/{storyId}')
  .onCreate(async (snapshot, context) => {
    const story = snapshot.data();
    const storyId = context.params.storyId;

    // Check if story is for close friends only
    const isCloseFriendsOnly = story.closeFriendsOnly === true || story.visibility === 'closeFriends';

    const payload = {
      title: isCloseFriendsOnly ? 'Новая история для близких друзей! 💚' : 'Новая история! ✨',
      body: story.title || 'Посмотрите нашу новую историю',
      type: 'story',
      storyId,
      deeplink: story.deeplink || `/stories/${storyId}`
    };

    // Send only to close friends if flag is set
    const result = await sendToAllSubscribed('stories', payload, isCloseFriendsOnly);
    
    await logNotification(
      isCloseFriendsOnly ? 'story_created_close_friends' : 'story_created',
      result
    );
  });

/**
 * Trigger when an order is updated
 * Sends notification when order status changes to "accepted"
 */
export const onOrderUpdated = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Check if status changed to "accepted"
    if (before.status !== 'accepted' && after.status === 'accepted') {
      const userId = after.userId;
      
      if (!userId) {
        return;
      }

      // Check for duplicate notification suppression
      const suppress = await shouldSuppress(userId, 'orderAccepted', 1); // 1 hour TTL
      if (suppress) {
        return;
      }

      const shortId = after.shortId || orderId.substring(0, 8);
      
      const payload = {
        title: 'Заказ принят! ☕',
        body: `Бариста подтвердил ваш заказ №${shortId}`,
        type: 'orderAccepted',
        orderId,
        deeplink: `/orders/${orderId}`
      };

      const result = await sendToUser(userId, payload);
      
      // Mark as sent to prevent duplicates
      await markAsSent(userId, 'orderAccepted', 1);
      
      await logNotification('order_accepted', result, userId);
    }
  });

/**
 * Alternative trigger for news collection (if used instead of promotions)
 */
export const onNewsCreated = functions.firestore
  .document('news/{newsId}')
  .onCreate(async (snapshot, context) => {
    const news = snapshot.data();
    const newsId = context.params.newsId;

    const payload = {
      title: 'Новости! 📰',
      body: news.title || 'Новое объявление доступно',
      type: 'promotion',
      promotionId: newsId,
      deeplink: news.deeplink || `/promotions/${newsId}`
    };

    const result = await sendToAllSubscribed('promotions', payload);
    
    await logNotification('news_created', result);
  });
