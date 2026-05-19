# Архитектура Multi-Location System

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADMIN PANEL                              │
│                    (admin/src/App.tsx)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ├─ UserProvider (auth)
                         └─ LocationProvider ✨ NEW
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌──────────────────┐
│  OWNER ROLE   │         │   ADMIN ROLE    │         │  BARISTA ROLE    │
│               │         │                 │         │                  │
│ ✅ All access │         │ ❌ No location  │         │ ❌ No location   │
│ ✅ See all    │         │    management   │         │    management    │
│    locations  │         │ ✅ See own      │         │ ✅ See own       │
│ ✅ Dashboard  │         │    location     │         │    location      │
│    analytics  │         │    orders       │         │    orders        │
└───────┬───────┘         └────────┬────────┘         └────────┬─────────┘
        │                          │                           │
        │                          │                           │
        └──────────────────────────┴───────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
           ┌────────▼────────┐         ┌─────────▼──────────┐
           │ LocationSelector│         │  OrderManagement   │
           │    Component    │         │    Component       │
           │   (owner only)  │         │  (filtered by      │
           └────────┬────────┘         │   locationId)      │
                    │                  └─────────┬──────────┘
                    │                            │
                    │                            │
        ┌───────────▼────────────────────────────▼─────────┐
        │                                                   │
        │            FIRESTORE COLLECTIONS                  │
        │                                                   │
        │  ┌──────────────┐      ┌──────────────────────┐ │
        │  │  locations/  │      │      orders/         │ │
        │  │              │      │                      │ │
        │  │ • main       │      │ • order1             │ │
        │  │ • abaya      │◄─────┤   locationId: main   │ │
        │  │ • satpaev    │      │ • order2             │ │
        │  │ • nazarbaev  │◄─────┤   locationId: abaya  │ │
        │  │ • ...        │      │ • ...                │ │
        │  └──────────────┘      └──────────────────────┘ │
        │                                                   │
        └───────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                       UI COMPONENTS                              │
└─────────────────────────────────────────────────────────────────┘

Owner Dashboard:
┌──────────────────────────────────────────────────────┐
│  📊 ОБЩАЯ АНАЛИТИКА СЕТИ                             │
│                                                      │
│  💰 Общая выручка    🛍️ Всего заказов   📈 Ср.чек  │
│     1,245,000₸          342              3,640₸     │
│                                                      │
│  🏆 РЕЙТИНГ ТОЧЕК:                                   │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🥇 1. Абая, 150         750,000₸  ↗️ +12%     │ │
│  │ 🥈 2. Сатпаева, 89      495,000₸  ↗️ +8%      │ │
│  │ 🥉 3. Назарбаева, 45    340,000₸  ↘️ -3%      │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘

Location Management (Owner only):
┌──────────────────────────────────────────────────────┐
│  📍 УПРАВЛЕНИЕ ТОЧКАМИ               [+ Добавить]   │
│  3 из 10 точек                                       │
│                                                      │
│  ┌─────────────────┐  ┌─────────────────┐           │
│  │ 📍 SunFood Абая │  │ 📍 SunFood      │           │
│  │ ул. Абая, 150   │  │    Сатпаева     │           │
│  │ +7 777 123 45 67│  │ пр. Сатпаева, 89│           │
│  │ [Ред.] [❌]     │  │ [Ред.] [❌]     │           │
│  └─────────────────┘  └─────────────────┘           │
└──────────────────────────────────────────────────────┘

Location Selector (Header):
┌──────────────────────────────────────┐
│ 📍 SunFood Абая ▼                    │
│                                      │
│ Dropdown:                            │
│ ┌──────────────────────────────────┐ │
│ │ ✓ 📍 SunFood Абая                │ │
│ │   ул. Абая, 150                  │ │
│ │                                  │ │
│ │   📍 SunFood Сатпаева            │ │
│ │   пр. Сатпаева, 89               │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS                               │
└─────────────────────────────────────────────────────────────────┘

/admin/api/locations.js
│
├─ GET    ?action=list        → List all locations
├─ GET    ?action=get&id=X    → Get location by ID
├─ POST   ?action=create      → Create location (max 10)
├─ PUT    ?action=update&id=X → Update location
├─ DELETE ?action=delete&id=X → Delete location
├─ GET    ?action=stats&id=X  → Get location stats
└─ GET    ?action=analytics   → Get all locations analytics

/admin/api/orders.js
│
├─ GET    ?action=get                    → All orders
└─ GET    ?action=get&locationId=X       → Filtered by location ✨


┌─────────────────────────────────────────────────────────────────┐
│                    DATA FLOW EXAMPLE                             │
└─────────────────────────────────────────────────────────────────┘

1. Owner logs in
   └─> UserContext sets role='owner'
   
2. LocationProvider fetches locations
   └─> locationService.getLocations()
       └─> API: GET /api/locations?action=list
           └─> Returns: [{id:'main',...}, {id:'abaya',...}]
   
3. Owner navigates to /admin/dashboard
   └─> DashboardPage fetches analytics
       └─> locationService.getAllLocationsAnalytics()
           └─> API: GET /api/locations?action=analytics
               └─> Returns aggregated stats for all 10 locations
   
4. Owner selects "Абая" location via LocationSelector
   └─> selectedLocation updated in context
       └─> localStorage saves preference
           └─> OrderManagement re-filters orders
               └─> Firestore query: where('locationId','==','abaya')
   
5. Barista logs in (location pre-assigned)
   └─> No LocationSelector shown
       └─> OrderManagement auto-filters by their location
           └─> Only sees orders from their assigned point


┌─────────────────────────────────────────────────────────────────┐
│                   SECURITY & PERMISSIONS                         │
└─────────────────────────────────────────────────────────────────┘

Firebase Functions (Backend):
  ┌─────────────────────────────────────────┐
  │ admin.auth().verifyIdToken(token)       │
  │         ↓                               │
  │ Check customClaims.role === 'owner'     │
  │         ↓                               │
  │ if (not owner) → 403 Forbidden          │
  │ if (owner) → Allow CRUD on locations    │
  └─────────────────────────────────────────┘

Firestore Rules:
  match /locations/{locationId} {
    allow read: if isStaff();
    allow write: if isOwner();
  }
  
  match /orders/{orderId} {
    allow read, write: if isStaff();
    // Additional filters applied in app code
  }


┌─────────────────────────────────────────────────────────────────┐
│                    TECH STACK SUMMARY                            │
└─────────────────────────────────────────────────────────────────┘

Frontend:
  • React 18 + TypeScript
  • React Router v5
  • Context API (UserContext, LocationContext)
  • Framer Motion (animations)
  • Tailwind CSS (styling)
  • Headless UI (dropdowns)
  • Heroicons (icons)

Backend:
  • Firebase Admin SDK
  • Cloud Firestore
  • Cloud Functions
  • Node.js

State Management:
  • React Context API
  • localStorage (persistence)
  • Real-time Firestore listeners

Build Tools:
  • Vite
  • TypeScript compiler
  • PostCSS + Tailwind
```
