import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from '@/contexts/UserContext';
import { CartProvider } from '@/contexts/CartContext';

type AppProvidersProps = {
  children: React.ReactNode;
};

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <BrowserRouter>
    <UserProvider>
      <CartProvider>{children}</CartProvider>
    </UserProvider>
  </BrowserRouter>
);

export default AppProviders;
