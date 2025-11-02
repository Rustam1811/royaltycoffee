# QR-код для оплаты бонусами - Офлайн использование

## ✅ Реализовано

### 1. **Страница с QR-кодом для клиента** (`/my-qr`)

**Файл:** `src/pages/MyQRCode.tsx`

**Функционал:**
- ✅ Генерация QR-кода с `userId` клиента
- ✅ Отображение баланса бонусов
- ✅ Инструкции по использованию
- ✅ Адаптивный дизайн для мобильных устройств

**Данные в QR-коде:**
```
userId (например: "user_salvator_846")
```

### 2. **Кнопка доступа в профиле**

**Файл:** `src/pages/Profile.tsx`

- ✅ Добавлена кнопка с иконкой QR-кода рядом с кнопкой редактирования
- ✅ Навигация на страницу `/my-qr`
- ✅ Зеленый цвет для узнаваемости

### 3. **API endpoint для поиска пользователя**

**Файл:** `functions/src/index.ts`

**Endpoint:** `GET /api/users?action=getByPhone&phone={phone}`

**Функционал:**
- ✅ Нормализация номера телефона (8xxx → +7xxx)
- ✅ Поиск в Firestore по полю `phone`
- ✅ Возврат данных пользователя (id, phone, displayName, email)

## 📱 Сценарий использования

### Для клиента:
1. Открыть приложение
2. Перейти в **Профиль**
3. Нажать зеленую кнопку с QR-кодом
4. Показать QR-код бариста

### Для бариста (POS-система):
1. Открыть POS-интерфейс
2. Нажать кнопку **"Сканировать QR-код"**
3. Отсканировать QR клиента
4. Система автоматически:
   - Загружает данные клиента (имя, телефон)
   - Показывает баланс бонусов
   - Позволяет списать бонусы при оплате

## 🔧 Технические детали

### Компонент QR-кода
**Файл:** `src/components/QRCode.tsx`

Использует внешний API для генерации:
```typescript
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/
  ?size=${size}x${size}
  &data=${encodeURIComponent(value)}
  &bgcolor=000000
  &color=ffffff`;
```

### Структура данных

**В Firestore:**
```
users/{userId}
  ├── phone: "+77053096206"
  ├── name: "Али"
  ├── displayName: "Али (Salvator)"
  └── email: "salvator846@gmail.com"

bonuses/{userId}
  ├── balance: 33080
  ├── totalEarned: 50000
  └── totalUsed: 16920
```

## 🎯 Следующие шаги

### TODO #3: QR-сканер в POS-интерфейсе

**Необходимо добавить:**

1. **Кнопка сканирования QR**
   - В `admin/src/pages/PosMenuPage.tsx`
   - Рядом с полем ввода номера телефона

2. **HTML5 камера доступ**
   ```typescript
   navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
   ```

3. **Библиотека для декодирования QR**
   - Установить: `npm install @zxing/library`
   - Или использовать: `jsQR`

4. **Логика сканирования**
   ```typescript
   // Получить userId из QR
   const userId = decodeQRCode(imageData);
   
   // Загрузить данные через API
   const response = await fetch(`/api/users?userId=${userId}`);
   const userData = await response.json();
   
   // Загрузить бонусы
   const bonusResponse = await fetch(`/api/bonus?userId=${userId}`);
   const bonusData = await bonusResponse.json();
   
   // Отобразить в интерфейсе
   setCustomerName(userData.name);
   setCustomerBonus(bonusData.balance);
   setCustomerLinked(true);
   ```

## 🚀 Деплой

### Обновить production:
```bash
# Собрать клиентское приложение
npm run build

# Собрать админку
cd admin && npm run build

# Задеплоить Firebase Functions
cd ../functions && npm run build

# Деплой всего
firebase deploy
```

## 📊 Тестирование

### Локально:
1. Запустить dev сервер: `npm run dev`
2. Открыть: `http://localhost:5173/my-qr`
3. Проверить генерацию QR-кода

### Production:
1. Открыть: `https://coffeeaddict-c9d70.web.app/my-qr`
2. Попросить бариста отсканировать
3. Проверить корректность данных

## 💡 Советы

- **Яркость экрана:** Рекомендовать клиентам увеличить яркость для лучшего сканирования
- **Формат QR:** Содержит только `userId` (простой текст)
- **Безопасность:** userId публичный, критичные операции требуют дополнительной авторизации
- **Оффлайн:** QR-код работает без интернета на телефоне клиента (генерируется через внешний API при загрузке страницы)

## 🔐 Безопасность

**Текущая реализация:**
- QR содержит только `userId` (публичный идентификатор)
- Списание бонусов требует подтверждения через POS-систему
- Бариста может списать только доступный баланс

**Рекомендации для будущего:**
- Добавить одноразовые токены для списания
- Ограничить частоту использования QR-кода
- Логировать все транзакции с QR-кодами
