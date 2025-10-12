# ========================================
# 🗑️ SunfoodApp Cleanup Script
# Удаление неиспользуемых файлов
# ========================================

Write-Host "🧹 Начинаю очистку проекта SunfoodApp..." -ForegroundColor Cyan
Write-Host ""

# Проверка что мы в правильной директории
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json не найден! Запусти скрипт из корня проекта." -ForegroundColor Red
    exit 1
}

Write-Host "⚠️  ВНИМАНИЕ: Перед продолжением сделай git commit!" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Продолжить? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "❌ Отменено" -ForegroundColor Red
    exit 0
}

Write-Host ""

# ========================================
# 1. Vercel (не используется)
# ========================================
Write-Host "🗑️  Удаление Vercel файлов..." -ForegroundColor Yellow
Remove-Item -Path "vercel.json" -ErrorAction SilentlyContinue
Remove-Item -Path ".vercelignore" -ErrorAction SilentlyContinue
Remove-Item -Path ".vercel" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "vercel-api" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "vite-api-plugin.ts" -ErrorAction SilentlyContinue
Write-Host "✅ Vercel удален" -ForegroundColor Green

# ========================================
# 2. Неиспользуемые API серверы
# ========================================
Write-Host "🗑️  Удаление локальных API серверов..." -ForegroundColor Yellow
Remove-Item -Path "api-server" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "api-desable" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "apps" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "api-server.js" -ErrorAction SilentlyContinue
Remove-Item -Path "simple-api.js" -ErrorAction SilentlyContinue
Write-Host "✅ API серверы удалены" -ForegroundColor Green

# ========================================
# 3. Старые bat/sh скрипты
# ========================================
Write-Host "🗑️  Удаление старых скриптов..." -ForegroundColor Yellow
Remove-Item -Path "start-api-server.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "start-api-server.sh" -ErrorAction SilentlyContinue
Remove-Item -Path "start-api-development.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "start-api-production.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "start-all.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "start-dev.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "setup-admin-auto.js" -ErrorAction SilentlyContinue
Remove-Item -Path "setup-admin-manual.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "setup-client-notifications.js" -ErrorAction SilentlyContinue
Remove-Item -Path "auto-setup-admin.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "deploy-admin.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "deploy-notifications.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "deploy-notifications.sh" -ErrorAction SilentlyContinue
Remove-Item -Path "deploy-push.bat" -ErrorAction SilentlyContinue
Write-Host "✅ Скрипты удалены" -ForegroundColor Green

# ========================================
# 4. Тестовые HTML/JS файлы
# ========================================
Write-Host "🗑️  Удаление тестовых файлов..." -ForegroundColor Yellow
Remove-Item -Path "test-*.html" -ErrorAction SilentlyContinue
Remove-Item -Path "test-*.js" -ErrorAction SilentlyContinue
Remove-Item -Path "diagnostic-*.html" -ErrorAction SilentlyContinue
Remove-Item -Path "quick-check.html" -ErrorAction SilentlyContinue
Remove-Item -Path "sw-reset.html" -ErrorAction SilentlyContinue
Remove-Item -Path "production-setup-once.html" -ErrorAction SilentlyContinue
# Оставляем setup-push.html - полезен для debugging
Write-Host "✅ Тестовые файлы удалены (setup-push.html оставлен)" -ForegroundColor Green

# ========================================
# 5. Вспомогательные скрипты
# ========================================
Write-Host "🗑️  Удаление вспомогательных скриптов..." -ForegroundColor Yellow
Remove-Item -Path "check-user-*.js" -ErrorAction SilentlyContinue
Remove-Item -Path "check-fcm-tokens.js" -ErrorAction SilentlyContinue
Remove-Item -Path "create-test-orders.js" -ErrorAction SilentlyContinue
Write-Host "✅ Вспомогательные скрипты удалены" -ForegroundColor Green

# ========================================
# 6. Устаревшая документация
# ========================================
Write-Host "🗑️  Удаление устаревшей документации..." -ForegroundColor Yellow
$docsToRemove = @(
    "ADMIN_NOTIFICATIONS_FIX.md",
    "APPLE_SIGNIN_GUIDE.md",
    "APPLE_SIGNIN_REMOVED.md",
    "AUTO_SETUP_COMPLETE.md",
    "CHECK_ADMIN_QUICK.md",
    "DEBUG_ADMIN_FIRESTORE.md",
    "DEBUG_NOTIFICATIONS.md",
    "DEBUG_ORDER_NOTIFICATION.md",
    "DEPLOY_SUCCESS.md",
    "DO_THIS_NOW.md",
    "FINAL_FIX_NOTIFICATIONS.md",
    "FIREBASE_CONFIG_FIX.md",
    "FIRESTORE_RULES_FIX.md",
    "FOR_CLIENT_READY.md",
    "FULL_DIAGNOSTICS.md",
    "NOTIFICATIONS_FIX_APPLIED.md",
    "PRODUCTION_CHECKLIST.md",
    "PUSH_CHEATSHEET.md",
    "PUSH_IMPLEMENTATION_SUMMARY.md",
    "PUSH_NOTIFICATIONS_ARCHITECTURE.md",
    "PUSH_NOTIFICATIONS_MANIFEST.md",
    "PUSH_NOTIFICATIONS_PRODUCTION.md",
    "PUSH_NOTIFICATIONS_QUICKSTART.md",
    "PUSH_NOTIFICATIONS_README.md",
    "PUSH_QUICKSTART.md",
    "QUICK_DIAGNOSTIC.md",
    "README_PUSH.md",
    "STORIESPLAYER_ERROR_FIX.md",
    "VAPID_KEY_FIX.md"
)

foreach ($doc in $docsToRemove) {
    Remove-Item -Path $doc -ErrorAction SilentlyContinue
}

Write-Host "✅ Устаревшая документация удалена" -ForegroundColor Green
Write-Host "   Оставлены: NOTIFICATIONS_SYSTEM.md, NOTIFICATIONS_TESTING.md, NOTIFICATIONS_CRITICAL_FIX.md" -ForegroundColor Gray

# ========================================
# 7. Временные файлы
# ========================================
Write-Host "🗑️  Удаление временных файлов..." -ForegroundColor Yellow
Remove-Item -Path "temp_*.txt" -ErrorAction SilentlyContinue
Remove-Item -Path "tmp_*.txt" -ErrorAction SilentlyContinue
Remove-Item -Path "replacements.txt" -ErrorAction SilentlyContinue
Remove-Item -Path "admin-data.json" -ErrorAction SilentlyContinue
Remove-Item -Path "users.json" -ErrorAction SilentlyContinue
Remove-Item -Path "cors.json" -ErrorAction SilentlyContinue
Write-Host "✅ Временные файлы удалены" -ForegroundColor Green

# ========================================
# 8. Trash папка
# ========================================
Write-Host "🗑️  Удаление _trash..." -ForegroundColor Yellow
Remove-Item -Path "_trash" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ _trash удалена" -ForegroundColor Green

# ========================================
# 9. Неиспользуемая api/ директория (НЕ functions/!)
# ========================================
Write-Host "🗑️  Удаление api/ (не functions/)..." -ForegroundColor Yellow
if (Test-Path "api") {
    # Убедимся что это не functions
    if (Test-Path "api/vercel.json") {
        Remove-Item -Path "api" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ api/ (Vercel) удалена" -ForegroundColor Green
    } else {
        Write-Host "⚠️  api/ пропущена (не похожа на Vercel структуру)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   api/ не найдена" -ForegroundColor Gray
}

# ========================================
# Итоги
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Очистка завершена!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Что было удалено:" -ForegroundColor Yellow
Write-Host "   • Vercel конфигурация и API handlers" -ForegroundColor Gray
Write-Host "   • Локальные dev API серверы (api-server.js, simple-api.js)" -ForegroundColor Gray
Write-Host "   • Устаревшие bat/sh скрипты запуска" -ForegroundColor Gray
Write-Host "   • Тестовые HTML/JS файлы (кроме setup-push.html)" -ForegroundColor Gray
Write-Host "   • Вспомогательные скрипты проверки" -ForegroundColor Gray
Write-Host "   • 30+ markdown документов (устаревших)" -ForegroundColor Gray
Write-Host "   • Временные файлы (temp_*, tmp_*)" -ForegroundColor Gray
Write-Host "   • _trash/ директория" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Что осталось:" -ForegroundColor Green
Write-Host "   • functions/ - Cloud Functions (ИСПОЛЬЗУЕТСЯ!)" -ForegroundColor Gray
Write-Host "   • src/ - клиентское приложение" -ForegroundColor Gray
Write-Host "   • admin/ - админ-панель" -ForegroundColor Gray
Write-Host "   • public/ - статика и Service Workers" -ForegroundColor Gray
Write-Host "   • NOTIFICATIONS_*.md - актуальная документация" -ForegroundColor Gray
Write-Host "   • CLEANUP_ANALYSIS.md - отчет о очистке" -ForegroundColor Gray
Write-Host ""
Write-Host "🔥 Следующие шаги:" -ForegroundColor Cyan
Write-Host "   1. Проверь что проект собирается: npm run build" -ForegroundColor Gray
Write-Host "   2. Сделай git commit: git add . && git commit -m 'chore: cleanup unused files'" -ForegroundColor Gray
Write-Host "   3. Задеплой: firebase deploy" -ForegroundColor Gray
Write-Host ""
