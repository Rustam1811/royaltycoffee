/**
 * Утилиты для локализации элементов заказа
 * Преобразует ключи API в человекочитаемые русские названия
 */

/**
 * Преобразует ключ типа молока в читаемое название
 */
export const getMilkLabel = (key: string | undefined): string => {
  const labels: Record<string, string> = {
    regular: 'Обычное молоко',
    oat: 'Овсяное молоко',
    almond: 'Миндальное молоко',
    coconut: 'Кокосовое молоко',
    lactosefree: 'Безлактозное молоко',
    soy: 'Соевое молоко',
    none: 'Без молока',
  };
  
  return labels[key || ''] || key || '';
};

/**
 * Преобразует ключ размера в читаемое название
 */
export const getSizeLabel = (key: string | undefined): string => {
  const labels: Record<string, string> = {
    s: 'Маленький (S)',
    m: 'Средний (M)',
    l: 'Большой (L)',
    xl: 'Очень большой (XL)',
    small: 'Маленький',
    medium: 'Средний',
    large: 'Большой',
  };
  
  return labels[key?.toLowerCase() || ''] || key || '';
};

/**
 * Преобразует ключ сиропа в читаемое название
 */
export const getSyrupLabel = (key: string | undefined): string => {
  const labels: Record<string, string> = {
    vanilla: 'Ванильный сироп',
    caramel: 'Карамельный сироп',
    chocolate: 'Шоколадный сироп',
    hazelnut: 'Ореховый сироп',
    mint: 'Мятный сироп',
    coconut: 'Кокосовый сироп',
    irish: 'Ирландский крем',
    amaretto: 'Амаретто',
    cinnamon: 'Коричный сироп',
    ginger: 'Имбирный сироп',
    pumpkin: 'Тыквенный сироп',
    none: 'Без сиропа',
  };
  
  return labels[key || ''] || key || '';
};

/**
 * Преобразует ключ температуры в читаемое название
 */
export const getTemperatureLabel = (key: string | undefined): string => {
  const labels: Record<string, string> = {
    hot: 'Горячий',
    warm: 'Тёплый',
    cold: 'Холодный',
    iced: 'Со льдом',
  };
  
  return labels[key || ''] || key || '';
};

/**
 * Преобразует ключ интенсивности в читаемое название
 */
export const getIntensityLabel = (key: string | undefined): string => {
  const labels: Record<string, string> = {
    light: 'Лёгкий',
    medium: 'Средний',
    strong: 'Крепкий',
    extra: 'Очень крепкий',
  };
  
  return labels[key || ''] || key || '';
};

/**
 * Форматирует все модификаторы позиции заказа в читаемую строку
 */
export const formatOrderItemModifiers = (item: {
  sizeKey?: string;
  milkKey?: string;
  syrupKey?: string;
  temperatureKey?: string;
  intensityKey?: string;
}): string => {
  const modifiers: string[] = [];

  if (item.sizeKey) {
    modifiers.push(getSizeLabel(item.sizeKey));
  }
  if (item.temperatureKey) {
    modifiers.push(getTemperatureLabel(item.temperatureKey));
  }
  if (item.milkKey) {
    modifiers.push(getMilkLabel(item.milkKey));
  }
  if (item.syrupKey) {
    modifiers.push(getSyrupLabel(item.syrupKey));
  }
  if (item.intensityKey) {
    modifiers.push(`Интенсивность: ${getIntensityLabel(item.intensityKey)}`);
  }

  return modifiers.join(' • ');
};

/**
 * Генерирует номер заказа для отображения
 * Использует числовой orderNumberDisplay из API
 */
export const getOrderDisplayNumber = (order: {
  orderNumberDisplay?: string | number;
  id: string;
}): string => {
  // Если есть orderNumberDisplay, используем его (числовой формат)
  if (order.orderNumberDisplay !== undefined && order.orderNumberDisplay !== null) {
    return String(order.orderNumberDisplay);
  }
  
  // Fallback для старых заказов без номера - используем последние 6 символов ID
  return order.id.slice(-6).toUpperCase();
};
