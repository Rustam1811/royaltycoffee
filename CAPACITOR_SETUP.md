# 📱 Capacitor — Публикация в App Store & Google Play

## ✅ Что уже сделано

1. **Capacitor установлен** и настроен (`capacitor.config.json`)
2. **Android проект** сгенерирован (`android/`)
3. **iOS проект** сгенерирован (`ios/`)
4. **Push-уведомления** работают кроссплатформенно (`capacitor-push.ts`)
5. **Нативные плагины** подключены: StatusBar, Keyboard, App, Haptics, PushNotifications
6. **Firebase Cloud Functions** триггеры для уведомлений уже задеплоены

## 🤖 Android — Google Play

### Предварительные требования
- Android Studio установлен
- Google Play Developer аккаунт ($25 разовая оплата)

### Шаги

#### 1. Скачать `google-services.json` из Firebase Console
```
Firebase Console → Project Settings → General → 
→ Нажать "Add app" → Android → Package: com.royalcoffee.app
→ Скачать google-services.json
→ Заменить файл: android/app/google-services.json
```

#### 2. Настроить иконки и splash screen
```bash
# Установить утилиту для генерации иконок
npm install -g @nicklucas/capacitor-assets

# Положить исходники:
# - resources/icon.png (1024x1024, без закруглений)
# - resources/splash.png (2732x2732, центрированный логотип)

npx capacitor-assets generate --android
```

#### 3. Собрать и открыть в Android Studio
```bash
npm run cap:build:android   # build web + sync
npm run cap:open:android    # открыть Android Studio
```

#### 4. В Android Studio
- Build → Generate Signed Bundle / APK → Android App Bundle (.aab)
- Создать keystore (хранить надёжно!)
- Подписать релизный билд

#### 5. Загрузить в Google Play Console
- Создать приложение на https://play.google.com/console
- Заполнить описание, скриншоты, иконку
- Загрузить .aab файл
- Пройти review (~1-7 дней)

---

## 🍎 iOS — App Store

### Предварительные требования
- macOS с Xcode установленным
- Apple Developer аккаунт ($99/год)
- CocoaPods (`sudo gem install cocoapods`)

### Шаги

#### 1. Скачать `GoogleService-Info.plist` из Firebase Console
```
Firebase Console → Project Settings → General →
→ Нажать "Add app" → iOS → Bundle ID: com.royalcoffee.app
→ Скачать GoogleService-Info.plist
→ Положить в: ios/App/App/GoogleService-Info.plist
```

#### 2. Установить CocoaPods зависимости
```bash
cd ios/App
pod install
cd ../..
```

#### 3. Настроить Push Notifications в Xcode
```
Xcode → Targets → App → Signing & Capabilities →
→ "+ Capability" → Push Notifications
→ "+ Capability" → Background Modes → Remote notifications ✓
```

#### 4. Настроить Apple Push Notification Service (APNs)
```
Apple Developer Portal → Certificates, Identifiers & Profiles →
→ Keys → Создать APNs Key
→ Скачать .p8 файл
→ Firebase Console → Project Settings → Cloud Messaging →
→ iOS → Upload APNs Key (.p8)
```

#### 5. Собрать и открыть в Xcode
```bash
npm run cap:build:ios   # build web + sync
npm run cap:open:ios    # открыть Xcode
```

#### 6. В Xcode
- Product → Archive
- Distribute → App Store Connect
- Заполнить описание, скриншоты в App Store Connect
- Пройти review (~1-3 дня)

---

## 🔧 Полезные команды

```bash
# Пересобрать веб и синхронизировать с нативными проектами
npm run cap:sync

# Синхронизировать только (без пересборки веба)
npx cap sync

# Запустить на подключённом устройстве
npm run cap:run:android
npm run cap:run:ios

# Live reload во время разработки
# 1. Запустить vite dev server
npm run dev:web
# 2. Раскомментировать url в capacitor.config.json:
#    "url": "http://YOUR_LOCAL_IP:5173/app/"
# 3. npx cap sync && npx cap run android
```

## 📋 Чек-лист перед публикацией

### Обязательно
- [ ] Заменить `google-services.json` на скачанный из Firebase Console
- [ ] Для iOS: добавить `GoogleService-Info.plist`
- [ ] Для iOS: настроить APNs key в Firebase Console
- [ ] Настроить иконки (1024x1024 png)
- [ ] Настроить splash screen
- [ ] Изменить `versionCode` / `versionName` в `android/app/build.gradle`
- [ ] Заполнить описание, скриншоты для Store
- [ ] Тест на реальном устройстве

### Рекомендуется
- [ ] Privacy Policy URL (требуется для обоих Store)
- [ ] Terms of Service URL
- [ ] Подготовить скриншоты (6.5" и 5.5" для iOS, разные размеры для Android)
- [ ] Подготовить promotional text / short description
