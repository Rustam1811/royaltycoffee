import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, MinusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { getUserBonus, useUserBonus } from '../services/bonusService';
import { normalizePhoneNumber } from '../utils/phone';

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [bonusBalance, setBonusBalance] = useState<number | null>(null);
  const [bonusToUse, setBonusToUse] = useState(0);

  const totalPrice = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );
  const bonusAvailable = typeof bonusBalance === 'number' ? bonusBalance : 0;
  const maxBonusUsable = Math.max(0, Math.min(bonusAvailable, totalPrice));
  const appliedBonusPreview = Math.min(bonusToUse, maxBonusUsable);
  const finalAmountPreview = Math.max(0, totalPrice - appliedBonusPreview);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Ð˜ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐµÐ¼ Ñ‚Ðµ Ð¶Ðµ Ð´Ð°Ð½Ð½Ñ‹Ðµ, Ñ‡Ñ‚Ð¾ Ð¸ Ð² ÐºÐ»Ð¸ÐµÐ½Ñ‚ÑÐºÐ¾Ð¼ Ð¼ÐµÐ½ÑŽ
      const mockProducts: Product[] = [
        { id: 101, name: 'Ð­ÑÐ¿Ñ€ÐµÑÑÐ¾', price: 1188, category: 'coffee' },
        { id: 102, name: 'ÐÐ¼ÐµÑ€Ð¸ÐºÐ°Ð½Ð¾', price: 1308, category: 'coffee' },
        { id: 103, name: 'Ð‘Ð°Ñ‚Ñ‡ Ð±Ñ€ÑŽ', price: 1308, category: 'coffee' },
        { id: 104, name: 'Ð›ÑƒÐ½Ð³Ð¾/ÐÑÑ€Ð¾Ð¿Ñ€ÐµÑÑ', price: 2268, category: 'coffee' },
        { id: 105, name: 'Ð‘Ð°Ñ€Ð¸ÑÑ‚Ð° ÑÐµÑ‚', price: 3588, category: 'coffee' },
        { id: 301, name: 'ÐšÐ°Ð¿ÑƒÑ‡Ð¸Ð½Ð¾', price: 1788, category: 'milk' },
        { id: 302, name: 'Ð›Ð°Ñ‚Ñ‚Ðµ', price: 1908, category: 'milk' },
        { id: 201, name: 'ÐšÐ¾Ð»Ð° Ð±Ñ€Ð¾ ÐºÐ»ÑƒÐ±Ð½Ð¸ÐºÐ°/Ñ‡ÐµÑ€Ð½Ð¸ÐºÐ°', price: 1788, category: 'drinks' },
        { id: 202, name: 'ÐšÐ°Ñ€Ð´Ð°Ð¼Ð¾Ð½Ð¾Ð²Ñ‹Ð¹ ÑÐ¸Ñ€Ð¾Ð¿', price: 1548, category: 'additives' },
      ];
      setProducts(mockProducts);
    } catch (error) {
      console.error('ÐžÑˆÐ¸Ð±ÐºÐ° Ð·Ð°Ð³Ñ€ÑƒÐ·ÐºÐ¸ Ð¿Ñ€Ð¾Ð´ÑƒÐºÑ‚Ð¾Ð²:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const trimmed = customerPhone.trim();
    const digits = trimmed.replace(/\D/g, '');

    if (!trimmed || digits.length < 10) {
      setBonusLoading(false);
      setBonusError(null);
      setBonusBalance(null);
      setBonusToUse(0);
      return;
    }

    setBonusLoading(true);
    setBonusError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const bonus = await getUserBonus(trimmed);
        if (cancelled) return;
        setBonusBalance(bonus);
      } catch (error) {
        if (cancelled) return;
        console.error('ÐžÑˆÐ¸Ð±ÐºÐ° Ð¿Ð¾Ð»ÑƒÑ‡ÐµÐ½Ð¸Ñ Ð±Ð¾Ð½ÑƒÑÐ¾Ð²:', error);
        setBonusError('ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð¿Ð¾Ð»ÑƒÑ‡Ð¸Ñ‚ÑŒ Ð±Ð¾Ð½ÑƒÑÑ‹');
        setBonusBalance(null);
        setBonusToUse(0);
      } finally {
        if (!cancelled) {
          setBonusLoading(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [customerPhone]);

  useEffect(() => {
    setBonusToUse((prev) => {
      if (prev <= 0) return 0;
      if (maxBonusUsable <= 0) return 0;
      return Math.min(prev, maxBonusUsable);
    });
  }, [maxBonusUsable]);

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prevCart.filter(item => item.id !== productId);
      }
    });
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      alert('Ð”Ð¾Ð±Ð°Ð²ÑŒÑ‚Ðµ Ñ‚Ð¾Ð²Ð°Ñ€Ñ‹ Ð² Ð·Ð°ÐºÐ°Ð·');
      return;
    }

    if (!customerPhone.trim()) {
      alert('Ð’Ð²ÐµÐ´Ð¸Ñ‚Ðµ Ð½Ð¾Ð¼ÐµÑ€ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ð° ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð°');
      return;
    }

    if (bonusLoading) {
      alert('Ð”Ð¾Ð¶Ð´Ð¸Ñ‚ÐµÑÑŒ Ð·Ð°Ð³Ñ€ÑƒÐ·ÐºÐ¸ Ð±Ð¾Ð½ÑƒÑÐ¾Ð² Ð´Ð»Ñ ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð°');
      return;
    }

    if (submitting) return;

    const normalizedPhone = normalizePhoneNumber(customerPhone);
    const userId = normalizedPhone || customerPhone.trim();
    const appliedBonusAmount = Math.floor(appliedBonusPreview);
    const finalAmount = Math.max(0, totalPrice - appliedBonusAmount);

    setSubmitting(true);
    try {
      const orderData = {
        userId,
        customerPhone: customerPhone.trim(),
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        amount: finalAmount,
        totalAmount: totalPrice,
        bonusUsed: appliedBonusAmount,
        bonusEarned: Math.floor(totalPrice * 0.05), // 5% Ð±Ð¾Ð½ÑƒÑÐ¾Ð²
        status: 'pending'
      };

      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        let bonusDeducted = true;
        if (appliedBonusAmount > 0) {
          try {
            const bonusResponse = await useUserBonus(customerPhone, appliedBonusAmount);
            if (typeof bonusResponse?.bonus === 'number') {
              setBonusBalance(bonusResponse.bonus);
            }
            if (!bonusResponse?.success) {
              bonusDeducted = false;
            }
          } catch (error) {
            console.error('ÐžÑˆÐ¸Ð±ÐºÐ° ÑÐ¿Ð¸ÑÐ°Ð½Ð¸Ñ Ð±Ð¾Ð½ÑƒÑÐ¾Ð²:', error);
            bonusDeducted = false;
          }
        }

        alert(bonusDeducted ? 'Ð—Ð°ÐºÐ°Ð· ÑÐ¾Ð·Ð´Ð°Ð½ ÑƒÑÐ¿ÐµÑˆÐ½Ð¾!' : 'Ð—Ð°ÐºÐ°Ð· ÑÐ¾Ð·Ð´Ð°Ð½, Ð½Ð¾ Ð±Ð¾Ð½ÑƒÑÑ‹ Ð½Ðµ ÑÐ¿Ð¸ÑÐ°Ð»Ð¸ÑÑŒ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸. ÐŸÑ€Ð¾Ð²ÐµÑ€ÑŒÑ‚Ðµ Ð±Ð°Ð»Ð°Ð½Ñ ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð°.');
        setCart([]);
        setCustomerPhone('');
        setBonusToUse(0);
        setBonusBalance(null);
        onClose();
      } else {
        const details = await response.text().catch(() => '');
        console.error('ÐžÑˆÐ¸Ð±ÐºÐ° Ð¾Ñ‚Ð²ÐµÑ‚Ð° ÑÐµÑ€Ð²ÐµÑ€Ð° Ð¿Ñ€Ð¸ ÑÐ¾Ð·Ð´Ð°Ð½Ð¸Ð¸ Ð·Ð°ÐºÐ°Ð·Ð°:', details);
        alert('ÐžÑˆÐ¸Ð±ÐºÐ° ÑÐ¾Ð·Ð´Ð°Ð½Ð¸Ñ Ð·Ð°ÐºÐ°Ð·Ð°');
      }
    } catch (error) {
      console.error('ÐžÑˆÐ¸Ð±ÐºÐ° ÑÐ¾Ð·Ð´Ð°Ð½Ð¸Ñ Ð·Ð°ÐºÐ°Ð·Ð°:', error);
      alert('ÐžÑˆÐ¸Ð±ÐºÐ° ÑÐ¾Ð·Ð´Ð°Ð½Ð¸Ñ Ð·Ð°ÐºÐ°Ð·Ð°');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedProducts = products.reduce((groups, product) => {
    const category = product.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(product);
    return groups;
  }, {} as Record<string, Product[]>);

  const categoryNames: Record<string, string> = {
    coffee: 'ÐšÐ¾Ñ„Ðµ',
    milk: 'ÐœÐ¾Ð»Ð¾Ñ‡Ð½Ñ‹Ðµ Ð½Ð°Ð¿Ð¸Ñ‚ÐºÐ¸',
    drinks: 'ÐÐ°Ð¿Ð¸Ñ‚ÐºÐ¸',
    additives: 'Ð”Ð¾Ð±Ð°Ð²ÐºÐ¸',
    other: 'Ð”Ñ€ÑƒÐ³Ð¾Ðµ'
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ð›ÐµÐ²Ð°Ñ Ð¿Ð°Ð½ÐµÐ»ÑŒ - ÐœÐµÐ½ÑŽ */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">ÐœÐµÐ½ÑŽ</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {categoryNames[category]}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categoryProducts.map((product) => (
                        <div
                          key={product.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            <span className="text-lg font-bold text-blue-600">
                              {product.price}â‚½
                            </span>
                          </div>
                          {product.description && (
                            <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                          )}
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <PlusIcon className="h-4 w-4" />
                            Ð”Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ÐŸÑ€Ð°Ð²Ð°Ñ Ð¿Ð°Ð½ÐµÐ»ÑŒ - ÐšÐ¾Ñ€Ð·Ð¸Ð½Ð° */}
          <div className="w-80 bg-gray-50 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingCartIcon className="h-6 w-6 text-gray-600" />
              <h3 className="text-lg font-semibold">Ð—Ð°ÐºÐ°Ð·</h3>
            </div>

            {/* ÐÐ¾Ð¼ÐµÑ€ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ð° ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð° */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ÐÐ¾Ð¼ÐµÑ€ Ñ‚ÐµÐ»ÐµÑ„Ð¾Ð½Ð° ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð°
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+7 (___) ___-__-__"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {customerPhone.trim() && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Ð‘Ð¾Ð½ÑƒÑÑ‹ ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð°</span>
                    <span className="font-semibold text-gray-900">
                      {bonusLoading ? 'ÐŸÑ€Ð¾Ð²ÐµÑ€ÑÐµÐ¼...' : bonusError ? 'â€”' : `${bonusAvailable}â‚¸`}
                    </span>
                  </div>
                  {bonusError && (
                    <div className="mt-2 text-xs text-red-600">{bonusError}</div>
                  )}
                  {!bonusError && !bonusLoading && (
                    <>
                      {bonusAvailable > 0 ? (
                        <div className="mt-3 space-y-2">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Ð¡Ð¿Ð¸ÑÐ°Ñ‚ÑŒ Ð±Ð¾Ð½ÑƒÑÑ‹
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <input
                              type="number"
                              min={0}
                              max={maxBonusUsable}
                              value={bonusToUse}
                              onChange={(e) => {
                                const raw = Number(e.target.value);
                                if (!raw || raw <= 0) {
                                  setBonusToUse(0);
                                  return;
                                }
                                const clamped = Math.min(Math.floor(raw), Math.floor(maxBonusUsable));
                                setBonusToUse(clamped);
                              }}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                            />
                            <button
                              type="button"
                              onClick={() => setBonusToUse(Math.floor(maxBonusUsable))}
                              className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-40"
                              disabled={maxBonusUsable <= 0}
                            >
                              Ð’ÑÑ‘
                            </button>
                            <button
                              type="button"
                              onClick={() => setBonusToUse(0)}
                              className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40"
                              disabled={bonusToUse === 0}
                            >
                              ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚ÑŒ
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">
                            Ð”Ð¾ÑÑ‚ÑƒÐ¿Ð½Ð¾: {bonusAvailable}â‚¸ | ÐœÐ°ÐºÑÐ¸Ð¼ÑƒÐ¼ Ðº ÑÐ¿Ð¸ÑÐ°Ð½Ð¸ÑŽ: {maxBonusUsable}â‚¸
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-500">Ð£ ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð° Ð¿Ð¾ÐºÐ° Ð½ÐµÑ‚ Ð±Ð¾Ð½ÑƒÑÐ¾Ð².</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ÐšÐ¾Ñ€Ð·Ð¸Ð½Ð° */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">ÐšÐ¾Ñ€Ð·Ð¸Ð½Ð° Ð¿ÑƒÑÑ‚Ð°</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg p-3 border">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <span className="text-sm font-semibold">{item.price}â‚½</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold">
                          {item.price * item.quantity}â‚½
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ð˜Ñ‚Ð¾Ð³Ð¾ Ð¸ ÐºÐ½Ð¾Ð¿ÐºÐ° Ð·Ð°ÐºÐ°Ð·Ð° */}
            {cart.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Ð¡ÑƒÐ¼Ð¼Ð° Ð·Ð°ÐºÐ°Ð·Ð°</span>
                    <span className="font-semibold text-gray-900">{totalPrice}â‚¸</span>
                  </div>
                  {appliedBonusPreview > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ð¡Ð¿Ð¸ÑÐ°Ð½Ð¸Ðµ Ð±Ð¾Ð½ÑƒÑÐ¾Ð²</span>
                      <span className="font-semibold text-red-600">- {appliedBonusPreview}â‚¸</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-lg font-semibold">Ðš Ð¾Ð¿Ð»Ð°Ñ‚Ðµ</span>
                    <span className="text-xl font-bold text-blue-600">{finalAmountPreview}â‚¸</span>
                  </div>
                </div>
                <button
                  onClick={handleCreateOrder}
                  disabled={submitting || bonusLoading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? 'Ð¡Ð¾Ð·Ð´Ð°ÐµÐ¼...' : 'Ð¡Ð¾Ð·Ð´Ð°Ñ‚ÑŒ Ð·Ð°ÐºÐ°Ð·'}
                </button>
              </div>
            
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

