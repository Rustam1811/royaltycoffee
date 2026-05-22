import React from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { WorkshopProduct, LocalizedString } from '@/types';

const getLocalizedName = (name: LocalizedString): string => name.ru || name.en || name.kz || '';

/**
 * Shared bottom-sheet modal for product detail.
 * Used in MenuPage (cart quantity control) and OrdersPage (add to edit order).
 */
const ProductDetailModal: React.FC<{
  product: WorkshopProduct;
  /** Current quantity in cart/order (0 = not added) */
  quantity: number;
  /** Called when "Добавить" button pressed (quantity was 0) */
  onAddToCart: () => void;
  /** Called when +/- pressed, delta is ±step */
  onDelta: (delta: number) => void;
  onClose: () => void;
}> = ({ product, quantity, onAddToCart, onDelta, onClose }) => {
  const step = product.minOrder || 1;
  const { nutrition } = product;
  const hasNutrition = nutrition && (nutrition.calories || nutrition.protein || nutrition.fat || nutrition.carbs);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div style={{ position: 'relative', width: '100%', flexShrink: 0, background: '#f5f0eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          {product.image ? (
            <img
              src={product.image}
              alt={getLocalizedName(product.name)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: !product.isAvailable ? 'grayscale(1) opacity(0.7)' : 'none' }}
            />
          ) : (
            <div style={{ fontSize: 72, color: '#cbd5e1' }}>🥐</div>
          )}
          {!product.isAvailable && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 12 }}>
              Нет в наличии
            </div>
          )}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, background: 'rgba(0,0,0,0.45)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <XMarkIcon style={{ width: 20, height: 20, display: 'block' }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 20px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, margin: 0, flex: 1 }}>
              {getLocalizedName(product.name)}
            </h2>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#92400e' }}>{product.price.toLocaleString()} ₸</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>за {product.unit}</div>
            </div>
          </div>

          {product.minOrder && product.minOrder > 1 && (
            <p style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', display: 'inline-block', padding: '3px 10px', borderRadius: 8, marginBottom: 12 }}>
              Мин. заказ: {product.minOrder} {product.unit}
            </p>
          )}

          {product.description && (
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 16, marginTop: 8 }}>
              {getLocalizedName(product.description as LocalizedString)}
            </p>
          )}

          {/* КБЖУ */}
          {hasNutrition && (
            <div style={{ background: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, margin: '0 0 12px' }}>
                КБЖУ · на {nutrition!.per || 'порцию'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
                {nutrition!.calories != null && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '10px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{nutrition!.calories}</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>ккал</p>
                  </div>
                )}
                {nutrition!.protein != null && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '10px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', margin: 0 }}>{nutrition!.protein}г</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>белки</p>
                  </div>
                )}
                {nutrition!.fat != null && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '10px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', margin: 0 }}>{nutrition!.fat}г</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>жиры</p>
                  </div>
                )}
                {nutrition!.carbs != null && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '10px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', margin: 0 }}>{nutrition!.carbs}г</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>углев.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cart controls */}
          {product.isAvailable && (
            <div style={{ marginTop: 8 }}>
              {quantity > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 16, padding: 8 }}>
                  <button onClick={() => onDelta(-step)} style={{ width: 48, height: 48, borderRadius: 12, background: '#e2e8f0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <MinusIcon style={{ width: 20, height: 20, display: 'block' }} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>{quantity} {product.unit}</span>
                  <button onClick={() => onDelta(step)} style={{ width: 48, height: 48, borderRadius: 12, background: '#92400e', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <PlusIcon style={{ width: 20, height: 20, display: 'block' }} />
                  </button>
                </div>
              ) : (
                <button onClick={onAddToCart} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3D0A11, #5A0D17)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em' }}>
                  Добавить в заказ
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProductDetailModal;
