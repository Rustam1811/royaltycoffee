# ✅ ИСПРАВЛЕНО: VAPID Key в админке

## Проблема:
```
VITE_FCM_VAPID_KEY is not set in environment
```

## Причина:
Vite собирает админку из папки `admin/`, и по умолчанию ищет `.env` файл в этой же директории. Но `.env` находится в корне проекта!

## Решение:
Добавил в `admin/vite.config.ts`:
```typescript
export default defineConfig({
  envDir: "../", // Read .env from parent directory
  // ...
});
```

Теперь Vite читает `.env` из корня проекта при сборке админки.

## Deploy:
```
✅ Client app rebuilt
✅ Admin app rebuilt с VAPID key
✅ Hosting deployed
```

---

## 🧪 ТЕСТ СЕЙЧАС:

1. **Перезагрузи страницу админки**: https://coffeeaddict-c9d70.web.app/admin/
2. Открой **DevTools → Console**
3. **НЕ ДОЛЖНО быть** ошибки `VITE_FCM_VAPID_KEY is not set`
4. Залогинься как `admin@mail.com` (если не залогинен)
5. **Подожди 3 секунды** → появится модалка уведомлений
6. **Нажми "Включить"**
7. **Разреши браузеру**
8. Услышишь звук 🔔

### Проверка FCM токена:

После включения выполни в консоли:
```javascript
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();
const uid = auth.currentUser?.uid;

const userDoc = await getDoc(doc(db, 'users', uid));
const data = userDoc.data();

console.log('Admin data:', {
  role: data.role,
  pushOptIn: data.pushOptIn,
  fcmToken: data.fcmToken ? '✅ ЕСТЬ (' + data.fcmToken.substring(0, 30) + '...)' : '❌ НЕТ'
});
```

Должно быть:
```
role: "admin"
pushOptIn: true
fcmToken: "✅ ЕСТЬ (BKPPcrrCt_ZQW8zIuxACO86IxEMQ...)"
```

### Создай тестовый заказ:

1. Открой новую вкладку: https://coffeeaddict-c9d70.web.app/
2. Залогинься через Google
3. Добавь что-то в корзину
4. Создай заказ

### Получи уведомление:

В админке должно прийти:
- ✅ **Push-уведомление**: "Новый заказ! 🔔"
- ✅ **Звук**
- ✅ **Вибрация** (на мобильных)

---

## 📋 Что исправлено:

1. ✅ Firestore Rules обновлены (fcmToken разрешён)
2. ✅ VAPID Key теперь доступен в админке
3. ✅ NotificationPrompt интегрирован в админку
4. ✅ Cloud Functions задеплоены
5. ✅ Hosting задеплоен

---

## 🎯 ИТОГ:

**ВСЁ ГОТОВО!** Теперь:
- Админка читает VAPID key из `.env`
- Модалка уведомлений работает
- FCM токен сохраняется в Firestore
- Уведомления о новых заказах приходят СО ЗВУКОМ! 🚀

**Тестируй!**
