import { Disclosure, Transition } from '@headlessui/react';
import { MinusSmallIcon, PlusSmallIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

type AccordionItem = {
  question: string;
  answer: string;
};

type AccordionProps = {
  items: AccordionItem[];
};

export function Accordion({ items }: AccordionProps) {
  return (
    <dl className="space-y-3">
      {items.map((item, index) => (
        <Disclosure as="div" key={index} className="rounded-2xl border border-[#E8DDD4] bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
          {({ open }) => (
            <>
              <Disclosure.Button
                className={clsx(
                  'flex w-full items-center justify-between gap-4 text-left text-base font-semibold transition-colors duration-200',
                  open ? 'text-[#2C1810]' : 'text-[#4A2C2A]/80'
                )}
              >
                <span>{item.question}</span>
                {open ? (
                  <MinusSmallIcon className="h-5 w-5 text-[#C68B59]" aria-hidden="true" />
                ) : (
                  <PlusSmallIcon className="h-5 w-5 text-[#4A2C2A]/40" aria-hidden="true" />
                )}
              </Disclosure.Button>
              <Transition
                enter="transition duration-200 ease-out"
                enterFrom="opacity-0 -translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition duration-150 ease-in"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Disclosure.Panel as="dd" className="mt-3 text-sm leading-relaxed text-[#4A2C2A]/70">
                  {item.answer}
                </Disclosure.Panel>
              </Transition>
            </>
          )}
        </Disclosure>
      ))}
    </dl>
  );
}

