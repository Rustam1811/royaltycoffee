# 🍎 Как настроить Apple Sign-In (опционально)

## ✅ Текущий статус
**Apple Sign-In ОТКЛЮЧЕН** - кнопка убрана из интерфейса логина.

Функция `loginWithApple` всё ещё есть в `src/auth/AuthContext.tsx`, но не используется.

---

## 🔧 Как включить Apple Sign-In (если понадобится)

### Требования:
1. **Apple Developer Account** ($99/год)
2. **Домен с HTTPS** (не работает на localhost)
3. **Service ID** из Apple Developer Console

### Шаг 1: Настройка в Apple Developer Console

1. Зайди на https://developer.apple.com/account/
2. Перейди в **Certificates, Identifiers & Profiles**
3. Создай **App ID**:
   - Bundle ID: `com.sunfood.coffeeaddict` (или свой)
   - Включи **Sign in with Apple**
4. Создай **Service ID**:
   - Identifier: `com.sunfood.coffeeaddict.web`
   - Return URLs: `https://coffeeaddict-c9d70.firebaseapp.com/__/auth/handler`
   - Domains: `coffeeaddict-c9d70.firebaseapp.com`

### Шаг 2: Настройка в Firebase Console

1. Открой https://console.firebase.google.com/project/coffeeaddict-c9d70/authentication/providers
2. Включи **Apple**
3. Введи **Service ID**: `com.sunfood.coffeeaddict.web`
4. Загрузи **Private Key** (.p8 файл из Apple Developer Console)
5. Введи **Key ID** и **Team ID**

### Шаг 3: Раскомментируй кнопку в Login.tsx

```tsx
// В src/pages/Login.tsx добавь обратно:

import { loginWithApple } from '../auth/AuthContext'; // В useAuth

const handleAppleLogin = async () => {
  setError('');
  try {
    await loginWithApple();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Ошибка входа через Apple');
  }
};

// В JSX добавь кнопку:
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  onClick={handleAppleLogin}
  disabled={loading}
  className="w-full bg-black text-white font-semibold py-4 px-6 rounded-xl hover:bg-gray-900 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
  {loading ? 'Вход...' : 'Войти через Apple'}
</motion.button>
```

### Шаг 4: Тестирование

⚠️ **ВАЖНО**: Apple Sign-In **НЕ работает на localhost**!

1. Deploy на Firebase Hosting: `firebase deploy --only hosting`
2. Открой продакшен URL: https://coffeeaddict-c9d70.web.app/login
3. Нажми "Войти через Apple"
4. Введи Apple ID
5. Разрешь доступ

---

## 🎯 Почему я убрал кнопку?

1. **Требует платный Apple Developer аккаунт** ($99/год)
2. **Не работает на localhost** - только на HTTPS доменах
3. **Сложная настройка** - нужны сертификаты, ключи, Service ID
4. **Google Sign-In достаточно** - работает сразу, бесплатно, на любых доменах

---

## ✅ Альтернатива: только Google Sign-In

**Преимущества текущей конфигурации**:
- ✅ Работает сразу
- ✅ Бесплатно
- ✅ Работает на localhost
- ✅ Простая настройка
- ✅ Поддержка всех устройств

**Google Sign-In покрывает**:
- Android устройства (90%+ пользователей имеют Google аккаунт)
- iOS устройства (Google аккаунт есть у большинства)
- Десктоп (Chrome, Firefox, Safari)

---

## 💡 Рекомендация

**Оставь только Google Sign-In**, если не планируешь:
1. Публиковать приложение в App Store
2. Таргетироваться специально на iOS пользователей
3. Платить $99/год за Apple Developer

Если всё-таки нужен Apple Sign-In для App Store - следуй инструкции выше.
