# WhatsApp OTP Authentication Setup

## Обзор

Система авторизации через WhatsApp OTP для Sunfood App. Пользователи вводят номер телефона, получают 6-значный код в WhatsApp и входят в систему.

## Архитектура

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   React App     │ ──── │  Vercel API     │ ──── │   Twilio        │
│   (Frontend)    │      │  (Backend)      │      │   WhatsApp API  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
        │ POST /api/auth/        │                        │
        │ request-code           │                        │
        │ ──────────────────────▶│ Generate OTP           │
        │                        │ Store in Redis/FS      │
        │                        │ ──────────────────────▶│ Send WhatsApp
        │                        │                        │ Template Message
        │                        │                        │
        │ POST /api/auth/        │                        │
        │ verify-code            │                        │
        │ ──────────────────────▶│ Verify OTP             │
        │◀────────────────────── │ Return JWT             │
        │                        │                        │
```

## Компоненты

### Backend (Vercel Functions)

| Файл | Описание |
|------|----------|
| `admin/api/auth/request-code.js` | Эндпоинт запроса OTP кода |
| `admin/api/auth/verify-code.js` | Эндпоинт верификации кода |
| `admin/api/auth/lib/config.js` | Конфигурация из ENV |
| `admin/api/auth/lib/otp-store.js` | Хранилище OTP (Redis/Firestore) |
| `admin/api/auth/lib/rate-limit.js` | Rate limiting |
| `admin/api/auth/lib/twilio.js` | Отправка WhatsApp сообщений |
| `admin/api/auth/lib/jwt.js` | Генерация JWT токенов |

### Frontend (React)

| Файл | Описание |
|------|----------|
| `src/components/PhoneAuth.tsx` | UI компонент авторизации |
| `src/services/whatsapp-auth.ts` | API клиент |
| `src/auth/AuthContext.tsx` | Интеграция с auth state |
| `src/pages/Login.tsx` | Страница входа |

## Настройка Twilio

### 1. Создать Twilio аккаунт
1. Зайти на https://www.twilio.com/
2. Создать аккаунт или войти
3. Перейти в **Console** → **Account Info**
4. Записать **Account SID** и **Auth Token**

### 2. Настроить WhatsApp Sandbox (для разработки)
1. **Console** → **Messaging** → **Try it Out** → **Send a WhatsApp message**
2. Отправить указанный код на WhatsApp номер Twilio
3. Sandbox активируется для вашего номера

### 3. Создать Content Template (обязательно для продакшена)
1. **Console** → **Content Editor** → **Create New**
2. Настройки шаблона:
   - **Name**: `auth_otp_code`
   - **Category**: `AUTHENTICATION`
   - **Language**: Russian
   - **Body**: `Ваш код подтверждения: {{1}}`
3. Отправить на модерацию Meta
4. После одобрения записать **Content SID** (начинается с `HX...`)

> ⚠️ **ВАЖНО**: Без одобренного Meta шаблона WhatsApp сообщения не будут доставляться!

## Настройка Environment Variables

### Vercel Dashboard → Settings → Environment Variables

```env
# Twilio (обязательно)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_CONTENT_SID_AUTH_OTP=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# JWT (обязательно)
JWT_SECRET=your_super_secret_key_at_least_32_characters

# Redis (опционально, рекомендуется)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

## Rate Limiting

| Действие | Лимит | Окно | Блокировка |
|----------|-------|------|------------|
| Отправка кода | 3 раза | 15 мин | 15 мин |
| Верификация | 5 попыток | 15 мин | 15 мин |
| Неверный код | 5 попыток | - | блокирует номер |

## API Reference

### POST /api/auth/request-code

Запрос OTP кода.

**Request:**
```json
{
  "phone": "+77053096206"
}
```

**Response (200):**
```json
{
  "ok": true
}
```

**Response (429):**
```json
{
  "error": "Слишком много попыток",
  "retryAfter": 300
}
```

### POST /api/auth/verify-code

Верификация кода.

**Request:**
```json
{
  "phone": "+77053096206",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (400):**
```json
{
  "error": "Неверный или истекший код"
}
```

## Тестирование

### Локально
```bash
# Запустить API
cd admin
vercel dev

# Тест запроса кода
curl -X POST http://localhost:3000/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "+77053096206"}'

# Тест верификации (подставить полученный код)
curl -X POST http://localhost:3000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "+77053096206", "code": "123456"}'
```

### Sandbox режим
В Twilio Sandbox можно отправлять сообщения только на номера, которые отправили join-код.

## Troubleshooting

### Сообщения не доходят
1. Проверить что номер подключен к Sandbox
2. Проверить логи в Twilio Console → Monitor → Logs → Messaging
3. Проверить что Template одобрен Meta

### Rate limit ошибки
1. Подождать 15 минут
2. Или очистить Redis/Firestore данные вручную

### JWT ошибки
1. Проверить что JWT_SECRET одинаковый на всех окружениях
2. Проверить срок действия токена (по умолчанию 7 дней)

## Стоимость

- Twilio WhatsApp: ~$0.005-0.01 за сообщение (зависит от страны)
- Upstash Redis: бесплатный план до 10k команд/день
- Сравнение с Firebase SMS: ~$0.026 за SMS в Казахстане

## Security Considerations

1. OTP хэшируется bcrypt перед сохранением
2. JWT подписывается secret key
3. Rate limiting предотвращает брутфорс
4. Коды действительны 5 минут
5. После 5 неудачных попыток номер блокируется
