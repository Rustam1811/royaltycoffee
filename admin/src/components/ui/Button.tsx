import React from "react";

const baseClasses = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
const variants = {
  primary: "bg-slate-900 text-white hover:bg-black focus-visible:ring-slate-900",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400",
  outline: "border border-slate-300 text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-300",
  ghost: "text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-200",
  accent: "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500",
} as const;

type ButtonVariant = keyof typeof variants;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "primary",
  loading = false,
  disabled,
  ...rest
}) => {
  const isDisabled = disabled || loading;
  const classes = [baseClasses, variants[variant], className].filter(Boolean).join(" ");

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={classes}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin text-current"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
