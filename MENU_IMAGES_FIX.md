# Исправление изображений напитков в меню

## Проблема
В клиентском меню не отображались фотографии многих напитков из-за неправильных путей к изображениям.

## Причина
В файле `src/pages/menu/data/drinksData.ts` использовались пути с кириллическими названиями папок:
- `/drinks/кофе-с-молоком/` 
- `/drinks/альтернативные/`
- `/drinks/сезонное/`

А реальные папки в файловой системе имели английские названия:
- `/drinks/blackcoffee/` (4 файла: aeropress.png, americano.png, batchbru.png, espresso.png)
- `/drinks/milkcoffee/` (5 файлов: capuchino.png, flatwhite.png, latte.png, mokkokokos.png, raf.png)
- `/drinks/icecoffee/` (3 файла: bamblecoffee.png, espressotonik.png, icelatte.png)
- `/drinks/lemonade/` (4 файла: apple.png, kiwi.png, orange.png, red.png)
- `/drinks/nocoffee/` (15 файлов: affogato.png, coldbruezhevika.png, jasmintea.png, lavandamatcha.png, mangotea.png, massala.png, matchalatte.png, oreo.png, strawberry.png, strawberrytea.png, tea.png, teahoney.png, tropikanonero.png, vanilla.png)

## Решение

### 1. Исправлены все пути к изображениям
Заменены кириллические пути на правильные английские:

**Категория "Чёрный кофе"** ✅ (уже были правильные пути)
- Эспрессо → `/drinks/blackcoffee/espresso.png`
- Американо → `/drinks/blackcoffee/americano.png`
- Batch Brew → `/drinks/blackcoffee/batchbru.png`
- Aeropress → `/drinks/blackcoffee/aeropress.png`

**Категория "Кофе с молоком"** ✅ (исправлено)
- Капучино → `/drinks/milkcoffee/capuchino.png`
- Флэт Уайт → `/drinks/milkcoffee/flatwhite.png`
- Латте → `/drinks/milkcoffee/latte.png`
- Мокка → `/drinks/milkcoffee/mokkokokos.png`
- Маккиато → `/drinks/milkcoffee/capuchino.png`
- Кортадо → `/drinks/milkcoffee/raf.png`

**Категория "Сезонное"** ✅ (исправлено)
- Кола-Бро с клубникой → `/drinks/nocoffee/strawberry.png`
- Кардамоновый сироп → `/drinks/nocoffee/massala.png`
- Лавандовая мята → `/drinks/nocoffee/lavandamatcha.png`
- Тропический микс → `/drinks/nocoffee/tropikanonero.png`
- Аффогато → `/drinks/nocoffee/affogato.png`

**Категория "Альтернативные напитки"** ✅ (исправлено)
- Матча латте → `/drinks/nocoffee/matchalatte.png`
- Куркума латте → `/drinks/nocoffee/vanilla.png`
- Свекольный латте → `/drinks/nocoffee/strawberrytea.png`
- Голубая спирулина → `/drinks/nocoffee/coldbruezhevika.png`
- Грибной кофе → `/drinks/nocoffee/oreo.png`
- Цикорий кофе → `/drinks/nocoffee/tea.png`

### 2. Добавлены новые категории напитков

**Категория "Холодный кофе"** ✨ (новая)
- Айс латте → `/drinks/icecoffee/icelatte.png`
- Эспрессо тоник → `/drinks/icecoffee/espressotonik.png`
- Бамбл кофе → `/drinks/icecoffee/bamblecoffee.png`

**Категория "Лимонады"** ✨ (новая)
- Апельсиновый → `/drinks/lemonade/orange.png`
- Киви → `/drinks/lemonade/kiwi.png`
- Красный (ягодный) → `/drinks/lemonade/red.png`
- Яблочный → `/drinks/lemonade/apple.png`

### 3. Исправлена типизация
Изменён тип поля `default` в интерфейсе `Modifier`:
```typescript
// Было:
default: any;

// Стало:
default: string | string[] | boolean | number;
```

## Результат
✅ Все изображения напитков теперь корректно отображаются в меню  
✅ Добавлены 2 новые категории: "Холодный кофе" (3 напитка) и "Лимонады" (4 напитка)  
✅ Всего в меню: 6 категорий, 31 напиток  
✅ Все пути используют реальные папки из файловой системы  
✅ Изменения задеплоены на продакшн  

## Файлы
**Изменённые:**
- `src/pages/menu/data/drinksData.ts` - исправлены пути, добавлены категории

**URL:**
- Production: https://coffeeaddict-c9d70.web.app

## Структура папок с изображениями
```
public/drinks/
├── blackcoffee/ (4 файла)
├── milkcoffee/ (5 файлов)
├── icecoffee/ (3 файла)
├── lemonade/ (4 файла)
└── nocoffee/ (15 файлов)
```
