import { useState } from 'react';
import { MinusSmallIcon, PlusSmallIcon } from '@heroicons/react/24/outline';

type AccordionItem = {
  question: string;
  answer: string;
};

type AccordionProps = {
  items: AccordionItem[];
};

export function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <dl className="space-y-3">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={index} className="rounded-2xl border border-[#E8DDD4] bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              className={`flex w-full items-center justify-between gap-4 text-left text-base font-semibold transition-colors duration-200 ${
                open ? 'text-[#2C1810]' : 'text-[#4A2C2A]/80'
              }`}
            >
              <span>{item.question}</span>
              {open ? (
                <MinusSmallIcon className="h-5 w-5 text-[#C68B59]" aria-hidden="true" />
              ) : (
                <PlusSmallIcon className="h-5 w-5 text-[#4A2C2A]/40" aria-hidden="true" />
              )}
            </button>
            {open && (
              <dd className="mt-3 text-sm leading-relaxed text-[#4A2C2A]/70">
                {item.answer}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

