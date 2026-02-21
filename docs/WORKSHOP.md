# Модуль Цеха (Workshop) 🏭

## Обзор

Модуль цеха позволяет управлять заказами продукции (круассаны, выпечка, сэндвичи и т.д.) от клиентов (кофейни, рестораны) к производству.

## Структура ролей

| Роль | Описание | Доступ |
|------|----------|--------|
| `workshop_client` | Клиент цеха | Заказы, история, аналитика по своим точкам |
| `workshop_admin` | Админ цеха | Все заказы, управление меню и клиентами |
| `workshop_owner` | Владелец цеха | Полный доступ + настройки |
| `superowner` | Супервладелец | Доступ и к кофейне и к цеху |

## Функционал

### Для клиента (`workshop_client`)

1. **Мои точки** — список всех кофеен/точек клиента
2. **Меню** — каталог продукции цеха с возможностью добавить в корзину
3. **Корзина** — оформление заказа с комментарием
4. **Быстрый заказ** — повтор последнего заказа одним нажатием
5. **Заказы** — история заказов с фильтрами
6. **Аналитика** — статистика заказов по дням/месяцам

### Для админа (`workshop_admin`)

1. **Дашборд** — обзор новых заявок и статистика
2. **Заказы** — управление заявками (подтверждение, в работу, готово, доставлено)
3. **Меню** — добавление/редактирование/скрытие продукции
4. **Клиенты** — список клиентов и их точек

### Для владельца (`workshop_owner`)

Все функции админа + аналитика + настройки

## Запуск

```bash
# Установка зависимостей
cd workshop && npm install

# Запуск отдельно
npm run dev:workshop

# Или вместе со всем проектом
npm run dev:all
```

## URL приложения

- Development: `http://localhost:5175/workshop/`
- Production: `https://your-domain.com/workshop/`

## Firestore коллекции

```
workshop_products       # Продукция цеха
workshop_categories     # Категории продукции
workshop_orders         # Заказы
workshop_clients        # Клиенты (компании)
workshop_quick_orders   # Шаблоны быстрых заказов
workshop_settings       # Настройки цеха
```

## Seed данные

Для заполнения начальных данных:

```bash
node scripts/seed-workshop.js
```

## Структура папок

```
workshop/
├── src/
│   ├── components/
│   │   ├── ui/           # UI компоненты (Button, Card, Input...)
│   │   └── BottomNavBar.tsx
│   ├── config/
│   │   ├── api.ts        # API конфигурация
│   │   └── rbac.ts       # Права доступа по ролям
│   ├── contexts/
│   │   ├── UserContext.tsx
│   │   └── CartContext.tsx
│   ├── lib/
│   │   └── firebase.ts   # Firebase инициализация
│   ├── pages/
│   │   ├── admin/        # Страницы для админа
│   │   ├── client/       # Страницы для клиента
│   │   └── LoginPage.tsx
│   ├── routes/
│   │   └── RoleBasedRouter.tsx
│   ├── services/
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── clients.ts
│   │   └── analytics.ts
│   └── types/
│       └── workshop.ts   # TypeScript типы
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## API Endpoints

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/api/workshop?action=products` | GET | Список продуктов |
| `/api/workshop?action=products` | POST | Добавить продукт |
| `/api/workshop?action=categories` | GET | Список категорий |
| `/api/workshop?action=orders` | GET | Список заказов |
| `/api/workshop?action=orders` | POST | Создать заказ |
| `/api/workshop?action=order-status` | PUT | Обновить статус заказа |
| `/api/workshop?action=clients` | GET | Список клиентов |
| `/api/workshop?action=clients` | POST | Создать клиента |
| `/api/workshop?action=analytics` | GET | Аналитика |

## Хранение данных

- Данные хранятся **1 год**
- После года старые заказы могут быть удалены автоматически
- Для очистки можно создать Cloud Function

## Интеграция с основным приложением

Супервладелец (`superowner`) в админке кофейни имеет доступ к:
- Аналитике цеха
- Управлению цехом

## TODO

- [ ] Push-уведомления о новых заказах для админа
- [ ] Export аналитики в Excel
- [ ] Печать заказов
- [ ] Интеграция с WhatsApp для уведомлений клиентов
- [ ] Автоматическое удаление старых данных (> 1 года)
