import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary';

type BaseProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

type AnchorProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  onClick?: never;
};

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: never;
  onClick: () => void;
};

type Props = AnchorProps | ButtonProps;

const styles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-[#6B4423] to-[#4A2C2A] text-white shadow-[0_4px_16px_rgba(74,44,42,0.3)] hover:shadow-[0_8px_24px_rgba(74,44,42,0.4)] focus-visible:ring-2 focus-visible:ring-[#C68B59] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFBF7]',
  secondary:
    'border-2 border-[#E8DDD4] text-[#4A2C2A] bg-white hover:bg-[#FFF8F0] hover:border-[#C68B59] focus-visible:ring-2 focus-visible:ring-[#C68B59] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFBF7]'
};

const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] supports-hover:hover:-translate-y-0.5';

export function Button(props: Props) {
  const { children, className, variant = 'primary' } = props;
  const combinedStyles = clsx(baseStyles, styles[variant], className);

  if ('href' in props && props.href) {
    const { href, target = '_blank', rel = 'noreferrer noopener', ...rest } = props;
    return (
      <a
        className={combinedStyles}
        href={href}
        target={target}
        rel={rel}
        {...rest}
      >
        {children}
      </a>
    );
  }

  const { onClick, type = 'button', ...rest } = props as ButtonProps;
  return (
    <button
      className={combinedStyles}
      onClick={onClick}
      type={type}
      {...rest}
    >
      {children}
    </button>
  );
}

