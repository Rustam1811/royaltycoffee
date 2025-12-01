# 🎯 Чек-лист для продажи кофейне

## ✅ Что УЖЕ ГОТОВО (сделано сегодня):

### 1. Безопасность - ГОТОВО ✅
- ✅ Firestore rules закрыты (role-based access)
- ✅ Storage rules с ограничениями (размер файлов, админ-доступ)
- ✅ Environment validation (Zod)
- ✅ Error boundaries
- ✅ Production logger вместо console.log

### 2. Код - ГОТОВО ✅
- ✅ Чистый код (убраны все console.log)
- ✅ Модульная архитектура (App.tsx разделён)
- ✅ TypeScript для клиента работает
- ✅ Version 1.0.0

### 3. Инфраструктура - ГОТОВО ✅
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Multi-tenancy (поддержка нескольких кофеен)
- ✅ Документация (DEPLOYMENT.md, PRODUCTION_CHECKLIST.md)

---

## 📋 Что нужно сделать ПЕРЕД ПРОДАЖЕЙ (5 шагов):

### Шаг 1: Задеплоить правила безопасности (5 минут)
```bash
# В терминале:
firebase deploy --only firestore:rules
firebase deploy --only storage
```
**Зачем:** Закрыть дыры безопасности в production

---

### Шаг 2: Настроить GitHub Secrets для CI/CD (10 минут)
1. Перейти: `GitHub.com → Ваш репозиторий → Settings → Secrets and variables → Actions`
2. Добавить secrets:
   ```
   VITE_FIREBASE_API_KEY (из .env)
   VITE_FIREBASE_AUTH_DOMAIN (из .env)
   VITE_FIREBASE_PROJECT_ID (из .env)
   VITE_FIREBASE_STORAGE_BUCKET (из .env)
   VITE_FIREBASE_MESSAGING_SENDER_ID (из .env)
   VITE_FIREBASE_APP_ID (из .env)
   VITE_FCM_VAPID_KEY (из .env)
   FIREBASE_TOKEN (получить: firebase login:ci)
   ```

**Зачем:** Автоматический деплой при коммитах

---

### Шаг 3: Создать конфиг первой кофейни в Firestore (5 минут)
1. Открыть Firebase Console → Firestore Database
2. Создать коллекцию `cafes`
3. Добавить документ:
   ```javascript
   ID: default (или любой slug)
   Поля:
   {
     "id": "default",
     "name": "Название кофейни",
     "slug": "default",
     "logo": "https://your-logo-url.com/logo.png",
     "primaryColor": "#3B82F6",
     "secondaryColor": "#1E40AF",
     "enabled": true,
     "settings": {
       "currency": "KZT",
       "timezone": "Asia/Almaty",
       "language": "ru"
     }
   }
   ```

**Зачем:** Multi-tenancy требует конфигурацию кофейни

---

### Шаг 4: Создать первого админа в Firestore (3 минуты)
1. Firebase Console → Firestore → Коллекция `users`
2. Найти или создать пользователя
3. Добавить поле:
   ```javascript
   {
     "role": "admin",
     "email": "admin@cafe.com",
     "cafeId": "default"
   }
   ```

**Зачем:** Админ сможет заходить в админ-панель

---

### Шаг 5: Задеплоить приложение (2 минуты)
```bash
npm run build
npm run deploy
```

**Зачем:** Запустить в production

---

## 🎨 Для КАЖДОЙ новой кофейни (white-label):

### 1. Меню и лого (15 минут)
В Firestore → коллекция вашей кофейни:
- Загрузить лого в Storage (`cafes/{cafeId}/logo.png`)
- Изменить `primaryColor`, `secondaryColor` в конфиге кофейни
- Импортировать меню (Firebase Console → Firestore → `menu` коллекция)

### 2. Домен (опционально)
- **Поддомен:** `cafe1.yourapp.com` → cafeId автоматически "cafe1"
- **Свой домен:** `cafe1.com` → добавить в customDomainMap

### 3. Настройки (5 минут)
```javascript
// Firestore: cafes/{cafeId}
{
  "bonusSettings": {
    "pointsPerRuble": 1,
    "minOrderForBonus": 200
  },
  "workingHours": {
    "monday": { "open": "08:00", "close": "22:00" },
    ...
  }
}
```

---

## ✅ Итого: МОЖНО ПРОДАВАТЬ!

### Что получает кофейня:
1. ✅ PWA приложение (работает как нативное на iOS/Android)
2. ✅ Админ-панель для управления заказами, меню, промо
3. ✅ Бонусная система
4. ✅ Push-уведомления
5. ✅ Stories (как в Instagram)
6. ✅ POS система для баристы
7. ✅ Аналитика (графики продаж, популярные товары)
8. ✅ Изоляция данных (каждая кофейня видит только свои заказы)

### Что НЕ входит (опционально):
- ❌ Оплата (Stripe/Kaspi) - нужно интегрировать
- ❌ SMS уведомления (Twilio) - нужно настроить
- ❌ Доставка курьером (2GIS/Яндекс) - TODO закончен частично

### Цена за онбординг кофейни:
**20-30 минут** на:
1. Создать cafe config в Firestore
2. Загрузить лого и меню
3. Создать админа
4. Настроить домен (если нужен свой)

---

## 🚀 Быстрый старт для клиента:

```bash
# 1. Клонировать репозиторий
git clone <repo>

# 2. Установить зависимости
npm install

# 3. Настроить .env (скопировать из .env.example)
cp .env.example .env

# 4. Добавить Firebase credentials в .env

# 5. Запустить локально
npm run dev

# 6. Задеплоить
npm run deploy
```

---

## 📞 Поддержка после продажи:

1. **Firebase квоты** - следить за лимитами (особенно reads/writes)
2. **Обновления** - раз в месяц (npm update, security patches)
3. **Бэкап** - экспорт Firestore раз в неделю
4. **Мониторинг** - Firebase Console → Functions logs

---

## 💰 Выгода для кофейни:

- ✅ Без найма разработчиков (всё готово)
- ✅ Масштабируемо (Firebase автоматом)
- ✅ Безопасно (enterprise-уровень)
- ✅ Кастомизация (лого, цвета, меню за 20 минут)
- ✅ Аналитика встроена
- ✅ Автообновления (CI/CD)

**Стоимость владения:** ~$50-100/месяц (Firebase + хостинг)  
**Время окупаемости:** 1-2 месяца

---

## ✨ ГОТОВО К ПРОДАЖЕ! ☕
