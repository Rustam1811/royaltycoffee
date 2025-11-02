type SizeOption = {
  key: "S" | "M" | "L";
  label: string;
  volume: string;
};

const options: SizeOption[] = [
  { key: "S", label: "S", volume: "250 мл" },
  { key: "M", label: "M", volume: "350 мл" },
  { key: "L", label: "L", volume: "450 мл" },
];

interface SizeSelectorProps {
  value: string;
  onChange: (key: string) => void;
}

export default function SizeSelector({ value, onChange }: SizeSelectorProps) {
  const currentIndex = options.findIndex(
    (o) => o.key.toLowerCase() === value.toLowerCase()
  );

  const ITEM_W = 58;  // Еще уже для округлости
  const ITEM_H = 52;  // Выше для более округлой формы

  return (
    <div className="w-full flex justify-center">
      {/* Серый контейнер */}
      <div className="relative flex items-center rounded-full bg-gray-300 px-1.5 py-1.5 overflow-visible">
        {/* Активная "таблетка", чуть больше и выступает наружу */}
        <div
          className="absolute rounded-full bg-white flex flex-col items-center justify-center transition-transform duration-200 ease-in-out shadow-md"
          style={{
            width: `${ITEM_W * 1.4}px`, // шире на 40%
            height: `${ITEM_H}px`,
            transform: `translateX(calc(${currentIndex * ITEM_W}px - 10px))`, // немного выдвигаем наружу
          }}
        >
          <span className="text-[14px] font-semibold text-black">
            {options[currentIndex].label}
          </span>
          <span className="text-[10px] text-black/70 mt-0.5">
            {options[currentIndex].volume}
          </span>
        </div>

        {/* Серые варианты */}
        {options.map((opt, idx) => {
          const active = idx === currentIndex;
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
                {opt.volume}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
