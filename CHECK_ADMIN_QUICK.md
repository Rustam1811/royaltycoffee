# 🔍 БЫСТРАЯ ПРОВЕРКА АДМИНА

Скопируй в консоль **АДМИНКИ** (https://coffeeaddict-c9d70.web.app/admin/):

```javascript
// Используем Firebase SDK напрямую
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();
const uid = auth.currentUser?.uid || 'MswmRmPTBzegI9aex6esxSomUL92';

console.log('Checking user:', uid);

const userDoc = await getDoc(doc(db, 'users', uid));

if (!userDoc.exists()) {
  console.error('❌ Документ НЕ существует!');
} else {
  const data = userDoc.data();
  console.log('✅ Документ найден:', {
    role: data.role || '❌ НЕТ',
    pushOptIn: data.pushOptIn || false,
    fcmToken: data.fcmToken ? '✅ ЕСТЬ' : '❌ НЕТ',
    email: data.email,
    notificationsEnabled: data.notificationsEnabled
  });
  
  // Полные данные
  console.log('Все поля:', data);
}
```

---

## ИЛИ ПРОЩЕ:

Просто открой **Firestore Console**:

1. Открой: https://console.firebase.google.com/project/coffeeaddict-c9d70/firestore
2. Перейди в коллекцию `users`
3. Найди документ с ID: `MswmRmPTBzegI9aex6esxSomUL92`
4. Посмотри какие поля есть

---

## Что должно быть:

```
role: "admin"
pushOptIn: true
fcmToken: "xxx..." (или в subcollection tokens)
email: "admin@mail.com"
```

---

## Если полей НЕТ:

Запусти скрипт для настройки админа:

```javascript
// В консоли админки
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();
const uid = auth.currentUser?.uid;

if (uid) {
  await setDoc(doc(db, 'users', uid), {
    role: 'admin',
    email: 'admin@mail.com',
    updatedAt: new Date()
  }, { merge: true });
  
  console.log('✅ Role установлена!');
} else {
  console.error('❌ Не залогинен!');
}
```

Пришли что покажет Firestore Console! 👀
