import React from 'react';

type ButtonVariant = 'primary' | 'accent' | 'danger' | 'outline' | 'ghost' | 'success';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center rounded-xl px-3.5 py-2.5 font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 gap-2 select-none';
const styles: Record<ButtonVariant, string> = {
  primary: 'bg-slate-50 text-slate-900 border border-slate-300 shadow hover:bg-slate-100 active:bg-slate-200 hover:shadow-md active:shadow-sm',
  accent: 'bg-slate-900 text-white shadow hover:shadow-lg active:shadow-md hover:bg-black',
  danger: 'bg-rose-600 text-white shadow hover:shadow-lg active:shadow-md hover:bg-rose-700',
  outline: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 active:bg-slate-100',
  ghost: 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200',
  success: 'bg-emerald-600 text-white shadow hover:bg-emerald-700 active:bg-emerald-800',
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className,
  children,
  leftIcon,
  rightIcon,
  loading,
  disabled,
  ...rest
}) => {
  return (
    <button
      className={cn(base, styles[variant], loading && 'cursor-wait', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span className="inline-flex items-center">
        {loading && (
          <span className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        )}
        {children}
      </span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
