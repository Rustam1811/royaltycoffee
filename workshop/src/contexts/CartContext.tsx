import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { OrderItem, WorkshopProduct } from '@/types';

interface CartContextType {
  items: OrderItem[];
  addItem: (product: WorkshopProduct, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
  loadFromTemplate: (items: OrderItem[]) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<OrderItem[]>([]);

  const addItem = useCallback((product: WorkshopProduct, quantity: number) => {
    setItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { 
                ...item, 
                quantity: item.quantity + quantity,
                subtotal: (item.quantity + quantity) * item.price 
              }
            : item
        );
      }
      
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price,
        unit: product.unit,
        subtotal: quantity * product.price,
      };
      
      return [...prev, newItem];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.productId !== productId));
      return;
    }
    
    setItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity, subtotal: quantity * item.price }
          : item
      )
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const loadFromTemplate = useCallback((templateItems: OrderItem[]) => {
    setItems(templateItems.map(item => ({
      ...item,
      subtotal: item.quantity * item.price,
    })));
  }, []);

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalAmount,
        totalItems,
        loadFromTemplate,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
