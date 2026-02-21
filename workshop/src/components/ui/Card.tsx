import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hover = false,
}) => {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm border border-slate-100
        ${hover ? 'hover:shadow-md hover:border-workshop-200 transition-all cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`px-5 py-4 border-b border-slate-100 ${className}`}>
    {children}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`p-5 ${className}`}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl ${className}`}>
    {children}
  </div>
);
