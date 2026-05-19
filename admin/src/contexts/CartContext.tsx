import React, { createContext, useReducer, useContext, ReactNode } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    paymentLink?: string;
    sizeKey?: string;
    milkKey?: string;
    syrupKey?: string;
}

type Action =
    | { type: 'ADD_ITEM'; payload: CartItem }
    | { type: 'REMOVE_ITEM'; payload: { id: string } }
    | { type: 'CLEAR_CART' }
    | { type: 'INCREASE_QUANTITY'; payload: string }
    | { type: 'DECREASE_QUANTITY'; payload: string };

function reducer(state: CartItem[], action: Action): CartItem[] {
    switch (action.type) {
        case 'ADD_ITEM': {

            const existing = state.find(i => i.id === action.payload.id);
            if (existing) {
                return state.map(i =>
                    i.id === existing.id
                        ? { ...i, quantity: i.quantity + action.payload.quantity }
                        : i
                );
            }
            return [...state, action.payload];
        }
        
        case 'INCREASE_QUANTITY': {
            return state.map(item =>
                item.id === action.payload
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            );
        }

        case 'DECREASE_QUANTITY': {
            return state.map(item =>
                item.id === action.payload && item.quantity > 1
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            );
        }

        case 'REMOVE_ITEM': {
            return state.filter(i => i.id !== action.payload.id);
        }

        case 'CLEAR_CART': {
            return [];
        }

        default:
            return state;
    }
}

interface CartContextType {
    items: CartItem[];
    dispatch: React.Dispatch<Action>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [items, dispatch] = useReducer(reducer, []);

    return (
        <CartContext.Provider value={{ items, dispatch }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
};
