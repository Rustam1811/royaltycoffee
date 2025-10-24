# Исправление Firebase Functions API

## Проблема

При вводе номера телефона клиента в POS-системе:
- ❌ Клиент не находился (показывало "Клиент не найден")
- ❌ Бонусы не отображались (показывало 0)

**Причина:** Функция `ok()` в Firebase Functions возвращала просто `data` вместо `{ ok: true, ...data }`, а клиентский код проверял `data.ok`.

## Что исправлено

### 1. Firebase Functions (`functions/index.js`)

#### Функция-хелпер `ok()`
```javascript
// ДО
function ok(res, data) { 
  return res.status(200).json(data); 
}

// ПОСЛЕ
function ok(res, data) { 
  return res.status(200).json({ ok: true, ...data }); 
}
```

#### Endpoint `/api/bonus`
```javascript
// ДО
if (action === "user" && userId) {

// ПОСЛЕ (поддержка без action тоже)
if ((action === "user" || !action) && userId) {
```

Теперь `/api/bonus?userId=xxx` работает БЕЗ параметра `action`.

### 2. Admin клиент (`admin/src/pages/PosMenuPage.tsx`)

Добавлена проверка `bonusData.ok` перед использованием:

```typescript
const bonusData = await bonusResponse.json();
// Проверяем что ответ успешный и есть поле balance
if (bonusData.ok && bonusData.balance !== undefined) {
  setCustomerBonus(bonusData.balance);
  setCustomerName(data.user.displayName || data.user.name || '');
  setBonusError(null);
}
```

## Как работает сейчас

### Поиск клиента по телефону

**Request:**
```
GET /api/users?action=getByPhone&phone=%2B77053096206
```

**Response:**
```json
{
  "ok": true,
  "user": {
    "id": "user_salvator_846",
    "phone": "+77053096206",
    "displayName": "Али (Salvator)",
    "email": "salvator846@gmail.com"
  }
}
```

### Получение бонусов

**Request:**
```
GET /api/bonus?userId=user_salvator_846
```

**Response:**
```json
{
  "ok": true,
  "balance": 33080,
  "level": "VIP",
  "multiplier": 1.5,
  "totalOrders": 42,
  "nextLevel": "VIP",
  "ordersToNextLevel": 0,
  "totalEarned": 50000,
  "totalUsed": 16920
}
```

## Проверка работы

1. Откройте POS систему: `/admin` → POS Menu
2. Введите номер телефона: `+77053096206`
3. Должно показаться:
   - ✅ Имя клиента: "Али (Salvator)"
   - ✅ Бонусы: "33080 ₸"
   - ✅ Поле зелёное (без ошибок)

## Совместимость

Изменения обратно совместимы:
- ✅ Старые запросы `/api/bonus?action=user&userId=xxx` работают
- ✅ Новые запросы `/api/bonus?userId=xxx` работают
- ✅ Все ответы теперь содержат `{ ok: true, ... }`

## Deploy

```bash
firebase deploy --only functions:api
```

Функция успешно задеплоена в production: `europe-west1`
