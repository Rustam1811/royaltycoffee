import React, { useState } from 'react';
import { useCart, CartItem } from '../../../src/contexts/CartContext';
import { drinkCategories, Product } from '../../../src/pages/menu/data/drinksData';
import { ShoppingCartIcon, QrCodeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * POS-меню для баристы
 * Логика:
 * 1. Клик по напитку → сразу добавляется в корзину (размер M по умолчанию)
 * 2. Корзина справа (на десктопе) или внизу (на мобилке)
 * 3. В корзине можно отсканировать QR/баркод клиента для бонусов
 * 4. Оформить заказ → отправка в Orders
 */

export default function PosMenuPage() {
  const { items: cartItems, dispatch } = useCart();
  const [activeCategory, setActiveCategory] = useState(drinkCategories[0]?.id || 1);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedUser, setScannedUser] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Плоский список всех напитков
  const allDrinks = drinkCategories.flatMap(cat => 
    cat.products.map(drink => ({ ...drink, categoryId: cat.id, categoryTitle: cat.title }))
  );

  // Фильтр по категории
  const visibleDrinks = allDrinks.filter(d => d.categoryId === activeCategory);

  // Словарь переводов категорий
  const categoryTranslations: Record<string, string> = {
    'menu.categories.black_coffee': 'Черный кофе',
    'menu.categories.seasonal': 'Сезонное',
    'menu.categories.milk_coffee': 'Кофе с молоком',
    'menu.categories.alternative_drinks': 'Альтернативные напитки',
  };

  // Словарь переводов напитков
  const drinkTranslations: Record<string, string> = {
    'espresso': 'Эспрессо',
    'americano': 'Американо',
    'batch_brew': 'Бэтч брю',
    'batch brew': 'Бэтч брю',
    'lungo_aeropress': 'Лунго Аэропресс',
    'lungo aeropress': 'Лунго Аэропресс',
    'barista_set': 'Бариста сет',
    'barista set': 'Бариста сет',
    'cappuccino': 'Капучино',
    'latte': 'Латте',
    'flat_white': 'Флэт уайт',
    'flat white': 'Флэт уайт',
    'raf': 'Раф',
    'matcha': 'Матча',
    'cocoa': 'Какао',
  };

  // Получить перевод категории
  const getCategoryName = (key: string) => {
    return categoryTranslations[key] || key;
  };

  // Получить читаемое название напитка (убираем ключи переводов)
  const getDrinkDisplayName = (name: string) => {
    // Если это ключ перевода (например, menu.espresso.name)
    if (name.includes('.')) {
      const parts = name.split('.');
      const drinkKey = parts[parts.length - 2]; // берем предпоследнюю часть
      
      // Проверяем в словаре переводов
      const lowerKey = drinkKey.toLowerCase();
      if (drinkTranslations[lowerKey]) {
        return drinkTranslations[lowerKey];
      }
      
      // Если нет в словаре, делаем первую букву заглавной
      return drinkKey
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return name;
  };

  // Добавить напиток в корзину (размер M по умолчанию)
  const addDrinkToCart = (drink: typeof allDrinks[0]) => {
    const cartItem: CartItem = {
      id: drink.id,
      name: getDrinkDisplayName(drink.name), // Используем читаемое название
      price: drink.price,
      quantity: 1,
      image: drink.image,
      sizeKey: 'm', // размер M по умолчанию
    };
    
    dispatch({ type: 'ADD_ITEM', payload: cartItem });
  };

  // Удалить из корзины
  const removeFromCart = (itemId: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id: itemId } });
  };

  // Изменить количество
  const updateQuantity = (itemId: number, delta: number) => {
    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;
    
    if (delta > 0) {
      dispatch({ type: 'INCREASE_QUANTITY', payload: itemId });
    } else {
      dispatch({ type: 'DECREASE_QUANTITY', payload: itemId });
    }
  };

  // Итого
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Свайп для переключения категорий
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = drinkCategories.findIndex(cat => cat.id === activeCategory);
      
      if (isLeftSwipe && currentIndex < drinkCategories.length - 1) {
        setActiveCategory(drinkCategories[currentIndex + 1].id);
      } else if (isRightSwipe && currentIndex > 0) {
        setActiveCategory(drinkCategories[currentIndex - 1].id);
      }
    }
  };

  // Оформить заказ
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    try {
      const response = await fetch('/api/orders?action=create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            sizeKey: item.sizeKey,
          })),
          total,
          userPhone: scannedUser,
          useBonuses: !!scannedUser,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.ok) {
        setOrderNumber(result.orderNumber);
        setShowSuccessModal(true);
        dispatch({ type: 'CLEAR_CART' });
        setScannedUser(null);
      } else {
        throw new Error(result.error || 'Ошибка создания заказа');
      }
    } catch (error) {
      alert('Ошибка создания заказа: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-slate-100 via-slate-100 to-white">
      {/* Левая часть - Меню */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Хедер с категориями */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold mb-4">Меню POS</h1>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {drinkCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getCategoryName(cat.title)}
              </button>
            ))}
          </div>
        </div>

        {/* Сетка напитков */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleDrinks.map(drink => (
              <motion.button
                key={drink.id}
                onClick={() => addDrinkToCart(drink)}
                whileTap={{ scale: 0.95 }}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left"
              >
                <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={drink.image}
                    alt={drink.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{getDrinkDisplayName(drink.name)}</h3>
                <p className="text-lg font-bold">{drink.price} ₸</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Правая часть - Корзина */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        {/* Хедер корзины */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCartIcon className="w-6 h-6" />
              Корзина
            </h2>
            <span className="text-sm text-gray-500">{cartItems.length} товаров</span>
          </div>

          {/* Кнопка сканирования QR */}
          {!scannedUser ? (
            <button
              onClick={() => setShowScanner(true)}
              className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
            >
              <QrCodeIcon className="w-5 h-5" />
              <span className="font-medium">Добавить номер клиента</span>
            </button>
          ) : (
            <div className="px-4 py-3 bg-green-50 text-green-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCodeIcon className="w-5 h-5" />
                <span className="font-medium text-sm">📱 {scannedUser}</span>
              </div>
              <button
                onClick={() => setScannedUser(null)}
                className="text-green-700 hover:text-green-900"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Список товаров в корзине */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <ShoppingCartIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Корзина пуста</p>
              <p className="text-sm mt-2">Выберите напитки из меню</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {cartItems.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2">{item.name}</h3>
                        <p className="text-gray-600 text-sm">{item.price} ₸</p>
                        
                        {/* Счетчик количества */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Итого и оформление */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Итого:</span>
              <span className="text-2xl font-bold">{total} ₸</span>
            </div>
            
            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Оформить заказ
            </button>
            
            {scannedUser && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Бонусы будут списаны автоматически
              </p>
            )}
          </div>
        )}
      </div>

      {/* Модалка ввода номера телефона */}
      <AnimatePresence>
        {showScanner && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowScanner(false);
                setPhoneInput('');
              }}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 m-auto w-[420px] h-fit bg-white rounded-2xl shadow-2xl z-50 flex flex-col items-center p-8"
            >
              <QrCodeIcon className="w-20 h-20 text-blue-500 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Поиск клиента</h3>
              <p className="text-gray-500 text-center mb-6">
                Отсканируйте QR или введите номер телефона
              </p>
              
              {/* Ввод номера телефона */}
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+7 (___) ___-__-__"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg mb-6 text-center text-xl focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && phoneInput.trim()) {
                    setScannedUser(phoneInput.trim());
                    setShowScanner(false);
                    setPhoneInput('');
                  }
                }}
              />
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    setShowScanner(false);
                    setPhoneInput('');
                  }}
                  className="flex-1 px-6 py-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-base font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (phoneInput.trim()) {
                      setScannedUser(phoneInput.trim());
                      setShowScanner(false);
                      setPhoneInput('');
                    }
                  }}
                  disabled={!phoneInput.trim()}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold text-base hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Готово
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Модалка успешного создания заказа */}
      <AnimatePresence>
        {showSuccessModal && orderNumber && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-2xl shadow-2xl z-50 flex flex-col items-center p-6"
            >
              {/* Иконка успеха */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold mb-3">Заказ создан!</h3>
              
              {/* Номер заказа */}
              <div className="bg-slate-100 rounded-xl px-6 py-4 mb-4 text-center">
                <p className="text-xs text-gray-600 mb-1">Номер заказа</p>
                <p className="text-4xl font-bold text-black">#{orderNumber}</p>
              </div>
              
              <p className="text-gray-500 text-center text-sm mb-4">
                Заказ передан на кухню
              </p>
              
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                Готово
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
