import clsx from 'clsx';

type Option = {
  label: string;
  value: string;
};

type SegmentedControlProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
};

export function SegmentedControl({ options, value, onChange, ariaLabel }: SegmentedControlProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-[#E8DDD4] bg-white p-1.5 shadow-sm"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={clsx(
              'relative min-w-[120px] rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C68B59]',
              isActive 
                ? 'bg-gradient-to-r from-[#6B4423] to-[#4A2C2A] text-white shadow-md' 
                : 'text-[#4A2C2A]/60 hover:text-[#4A2C2A]'
            )}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

