export interface SizeOption {
  key: string;
  label: string;
  volume: number;
  price: number;
}

// Дефолтные размеры (для обратной совместимости)
const defaultOptions: SizeOption[] = [
  { key: "s", label: "S", volume: 250, price: 0 },
  { key: "m", label: "M", volume: 350, price: 0 },
  { key: "l", label: "L", volume: 450, price: 0 },
];

interface SizeSelectorProps {
  value: string;
  onChange: (key: string) => void;
  sizes?: SizeOption[]; // Кастомные размеры из данных напитка
}

export default function SizeSelector({ value, onChange, sizes }: SizeSelectorProps) {
  // Используем переданные размеры или дефолтные
  const options = sizes && sizes.length > 0 ? sizes : defaultOptions;
  
  const currentIndex = options.findIndex(
    (o) => o.key.toLowerCase() === value.toLowerCase()
  );
  
  // Если текущий размер не найден в доступных, выбираем первый доступный
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Динамическая ширина в зависимости от количества опций
  const ITEM_W = options.length === 1 ? 100 : options.length === 2 ? 75 : 58;
  const ITEM_H = 52;

  // Если только один размер - показываем как статику
  if (options.length === 1) {
    const opt = options[0];
    return (
      <div className="w-full flex justify-center">
        <div className="flex items-center rounded-full bg-white px-4 py-2.5 shadow-md">
          <span className="text-[14px] font-semibold text-black">{opt.label}</span>
          <span className="text-[11px] text-black/60 ml-2">{opt.volume} мл</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      {/* Серый контейнер */}
      <div className="relative flex items-center rounded-full bg-gray-300 px-1.5 py-1.5 overflow-visible">
        {/* Активная "таблетка" */}
        <div
          className="absolute rounded-full bg-white flex flex-col items-center justify-center transition-transform duration-200 ease-in-out shadow-md"
          style={{
            width: `${ITEM_W * 1.3}px`,
            height: `${ITEM_H}px`,
            transform: `translateX(calc(${safeIndex * ITEM_W}px - ${ITEM_W * 0.15}px))`,
          }}
        >
          <span className="text-[14px] font-semibold text-black">
            {options[safeIndex]?.label}
          </span>
          <span className="text-[10px] text-black/70 mt-0.5">
            {options[safeIndex]?.volume} мл
          </span>
        </div>

        {/* Варианты */}
        {options.map((opt, idx) => {
          const active = idx === safeIndex;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key.toLowerCase())}
              className="flex flex-col items-center justify-center select-none transition-all duration-200"
              style={{
                width: `${ITEM_W}px`,
                height: `${ITEM_H}px`,
              }}
            >
              <span
                className={`text-[13px] font-medium ${
                  active ? "text-transparent" : "text-gray-700"
                }`}
              >
                {opt.label}
              </span>
              <span
                className={`text-[10px] font-normal mt-0.5 ${
                  active ? "text-transparent" : "text-gray-500"
                }`}
              >
                {opt.volume} мл
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
