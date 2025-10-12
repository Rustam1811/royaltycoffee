# 🔍 ДЕБАГ СКРИПТ: Проверка админа в Firestore

Скопируй и выполни в консоли **АДМИНКИ** (https://coffeeaddict-c9d70.web.app/admin/):

```javascript
(async () => {
  console.log('=== ПРОВЕРКА АДМИНА ===');
  
  // 1. Импортируем Firebase модули
  const { auth, db } = await import('/admin/src/lib/firebase.ts');
  const { getDoc, doc, getDocs, collection, query, where } = await import('firebase/firestore');
  
  // 2. Текущий пользователь
  const user = auth.currentUser;
  console.log('1. Current user:', user?.email, 'UID:', user?.uid);
  
  if (!user) {
    console.error('❌ НЕ ЗАЛОГИНЕН!');
    return;
  }
  
  // 3. Получаем данные пользователя из Firestore
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  
  if (!userDoc.exists()) {
    console.error('❌ Документ пользователя НЕ СУЩЕСТВУЕТ в Firestore!');
    return;
  }
  
  const data = userDoc.data();
  
  console.log('2. User Firestore data:', {
    role: data?.role || '❌ НЕТ',
    pushOptIn: data?.pushOptIn || false,
    fcmToken: data?.fcmToken ? '✅ ЕСТЬ (' + data.fcmToken.substring(0, 20) + '...)' : '❌ НЕТ',
    notificationsEnabled: data?.notificationsEnabled !== false,
    email: data?.email || '❌ НЕТ'
  });
  
  // 4. Проверяем коллекцию tokens
  const tokensSnapshot = await getDocs(collection(db, 'users', user.uid, 'tokens'));
  console.log('3. Tokens collection:', tokensSnapshot.size, 'токенов');
  tokensSnapshot.forEach(tokenDoc => {
    const tokenData = tokenDoc.data();
    console.log('   - Token:', tokenDoc.id.substring(0, 20) + '...', tokenData);
  });
  
  // 5. Проверяем что видит Cloud Function (query)
  console.log('4. Проверка Query (как Cloud Function):', {
    hasRole: data?.role === 'admin',
    hasPushOptIn: data?.pushOptIn === true,
    result: (data?.role === 'admin' && data?.pushOptIn === true) ? '✅ ПРОЙДЁТ QUERY' : '❌ НЕ ПРОЙДЁТ QUERY'
  });
  
  console.log('=== КОНЕЦ ПРОВЕРКИ ===');
  
  // Итог
  if (!data?.role) {
    console.error('🔥 ПРОБЛЕМА 1: НЕТ ПОЛЯ role!');
    console.log('РЕШЕНИЕ: Запусти production-setup-once.html чтобы добавить role');
  }
  if (!data?.pushOptIn) {
    console.error('🔥 ПРОБЛЕМА 2: НЕТ ПОЛЯ pushOptIn или оно false!');
    console.log('РЕШЕНИЕ: Включи уведомления через модалку в админке');
  }
  if (!data?.fcmToken && tokensSnapshot.size === 0) {
    console.error('🔥 ПРОБЛЕМА 3: НЕТ FCM токена!');
    console.log('РЕШЕНИЕ: Включи уведомления через модалку в админке');
  }
})();
```

---

## Что должно быть:

```javascript
{
  role: 'admin',              // ← ОБЯЗАТЕЛЬНО
  pushOptIn: true,            // ← ОБЯЗАТЕЛЬНО
  fcmToken: 'xxx...',         // ← ОБЯЗАТЕЛЬНО (или в tokens subcollection)
  email: 'admin@mail.com'
}
```

## Cloud Function query:

```typescript
where('role', '==', 'admin')
  .where('pushOptIn', '==', true)
```

Если **хотя бы одно** из этих полей отсутствует → Query вернёт пустой массив → "No admins with notifications enabled"

---

## Скопируй скрипт выше в консоль админки и пришли результат!
