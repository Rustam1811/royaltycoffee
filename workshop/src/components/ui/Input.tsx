import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-4 py-2.5 rounded-xl border transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-workshop-500 focus:border-transparent
          ${error 
            ? 'border-red-300 bg-red-50 focus:ring-red-500' 
            : 'border-slate-200 bg-white hover:border-slate-300'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`
          w-full px-4 py-2.5 rounded-xl border transition-all duration-200 resize-none
          focus:outline-none focus:ring-2 focus:ring-workshop-500 focus:border-transparent
          ${error 
            ? 'border-red-300 bg-red-50 focus:ring-red-500' 
            : 'border-slate-200 bg-white hover:border-slate-300'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
