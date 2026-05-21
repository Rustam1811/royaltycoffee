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
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '1rem',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        border: '1px solid rgb(241 245 249)',
        cursor: onClick ? 'pointer' : undefined,
      }}
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
  <div className={`p-5 ${className}`} style={{ padding: '1.25rem' }}>
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
