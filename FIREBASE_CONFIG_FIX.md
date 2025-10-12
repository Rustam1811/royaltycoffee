# ✅ ИСПРАВЛЕНО: Firebase конфигурация в админке

## Проблема:
```
Missing Firebase configuration: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
```

## Причина:
В `admin/src/lib/firebase.ts` использовались **неправильные имена** env переменных:

**БЫЛО** (неправильно):
```typescript
apiKey: env("VITE_API_KEY")  // ❌ Не существует в .env
```

**В .env**:
```
VITE_FIREBASE_API_KEY=xxx  // ✅ Правильное название
```

## Решение:
Исправил имена переменных в `admin/src/lib/firebase.ts`:

```typescript
const config = {
  apiKey: env("VITE_FIREBASE_API_KEY"),           // ✅ Исправлено
  authDomain: env("VITE_FIREBASE_AUTH_DOMAIN"),   // ✅ Исправлено
  projectId: env("VITE_FIREBASE_PROJECT_ID"),     // ✅ Исправлено
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),     // ✅ Исправлено
  messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),  // ✅ Исправлено
  appId: env("VITE_FIREBASE_APP_ID"),             // ✅ Исправлено
};
```

## Deploy:
```
✅ Admin пересобран с правильными env переменными
✅ Hosting задеплоен
```

---

## 🧪 ТЕСТИРУЙ СЕЙЧАС:

1. **Перезагрузи**: https://coffeeaddict-c9d70.web.app/admin/
2. **Ctrl+Shift+R** (hard reload + очистка кэша)
3. Открой DevTools → Console

### НЕ ДОЛЖНО БЫТЬ ошибок:
- ❌ ~~Missing Firebase configuration~~
- ❌ ~~VITE_FCM_VAPID_KEY is not set~~

### ДОЛЖНО быть:
- ✅ Страница логина загружается
- ✅ Можно залогиниться
- ✅ После логина появляется модалка уведомлений (через 3 секунды)

---

## 📋 Полный тест:

1. **Залогинься** как `admin@mail.com`
2. **Подожди 3 секунды** → модалка появится
3. **Нажми "Включить"**
4. **Разреши браузеру** показывать уведомления
5. Услышишь звук 🔔
6. Модалка закроется

### Проверка что всё сохранилось:

В консоли выполни:
```javascript
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();
const uid = auth.currentUser?.uid;

if (uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  const data = userDoc.data();
  
  console.log('✅ Admin configured:', {
    role: data.role,
    pushOptIn: data.pushOptIn,
    fcmToken: data.fcmToken ? 'ЕСТЬ (' + data.fcmToken.substring(0, 30) + '...)' : 'НЕТ'
  });
} else {
  console.error('❌ Не залогинен!');
}
```

Должно показать:
```javascript
{
  role: "admin",
  pushOptIn: true,
  fcmToken: "ЕСТЬ (BKPPcrrCt_ZQW8zIuxACO86IxEMQ...)"
}
```

### Создай тестовый заказ:

1. Открой новую вкладку: https://coffeeaddict-c9d70.web.app/
2. Залогинься через Google
3. Добавь что-то в корзину
4. Создай заказ

### Получи уведомление в админке:

- ✅ **Push-уведомление**: "Новый заказ! 🔔"
- ✅ **Звук**
- ✅ **Вибрация** (на мобильных)

---

## 🎯 ИТОГ:

Все проблемы исправлены:
1. ✅ Firestore Rules обновлены
2. ✅ VAPID Key передаётся в админку
3. ✅ Firebase конфигурация передаётся правильно
4. ✅ NotificationPrompt интегрирован
5. ✅ Cloud Functions задеплоены

**ТЕСТИРУЙ! Всё должно работать!** 🚀
