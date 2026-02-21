import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCartIcon, 
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';
import { Card, CardBody, Button, PageLoader } from '@/components/ui';
import { getProducts, getCategories } from '@/services';
import { WorkshopProduct, WorkshopCategory, LocalizedString } from '@/types';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const getLocalizedName = (name: LocalizedString): string => {
  return name.ru || name.en || name.kz || '';
};

/**
 * Страница меню цеха для клиента
 */
const MenuPage: React.FC = () => {
  const query = useQuery();
  const history = useHistory();
  const outletId = query.get('outletId') || '';
  const outletName = decodeURIComponent(query.get('outletName') || 'Точка');
  
  const { items, addItem, updateQuantity, totalItems, totalAmount } = useCart();
  const [products, setProducts] = useState<WorkshopProduct[]>([]);
  const [categories, setCategories] = useState<WorkshopCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading menu:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      const matchesSearch = !searchQuery || 
        getLocalizedName(product.name).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const getItemQuantity = (productId: string): number => {
    const item = items.find(i => i.productId === productId);
    return item?.quantity || 0;
  };

  const handleAddProduct = (product: WorkshopProduct) => {
    addItem(product, 1);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const currentQty = getItemQuantity(productId);
    updateQuantity(productId, currentQty + delta);
  };

  const handleGoToCart = () => {
    history.push(`/client/cart?outletId=${outletId}&outletName=${encodeURIComponent(outletName)}`);
  };

  if (loading) {
    return <PageLoader text="Загрузка меню..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => history.goBack()}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-900 truncate">{outletName}</h1>
            <p className="text-sm text-slate-500">Выберите продукцию</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl border-0 focus:ring-2 focus:ring-workshop-500"
            />
          </div>
        </div>
        
        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${selectedCategory === 'all' 
                ? 'bg-workshop-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Все
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${selectedCategory === category.id 
                  ? 'bg-workshop-500 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {getLocalizedName(category.name)}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-4 py-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product, index) => {
            const quantity = getItemQuantity(product.id);
            
            return (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card>
                  <CardBody className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={getLocalizedName(product.name)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          🥐
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {getLocalizedName(product.name)}
                      </h3>
                      
                      {product.description && (
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                          {getLocalizedName(product.description)}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="font-bold text-workshop-600">
                          {product.price.toLocaleString()} ₸
                          <span className="text-sm font-normal text-slate-500">
                            /{product.unit}
                          </span>
                        </div>
                        
                        {/* Quantity Controls */}
                        {quantity > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(product.id, -1)}
                              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                            >
                              <MinusIcon className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-semibold">{quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(product.id, 1)}
                              className="w-8 h-8 rounded-full bg-workshop-500 text-white flex items-center justify-center hover:bg-workshop-600"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddProduct(product)}
                          >
                            Добавить
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">Ничего не найдено</p>
          </div>
        )}
      </div>

      {/* Cart Button */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg"
          >
            <Button
              fullWidth
              size="lg"
              onClick={handleGoToCart}
              className="relative"
            >
              <ShoppingCartIcon className="w-5 h-5 mr-2" />
              Корзина · {totalItems} шт
              <span className="ml-auto font-bold">
                {totalAmount.toLocaleString()} ₸
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
