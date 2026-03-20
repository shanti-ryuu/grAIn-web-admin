import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'bordered' | 'elevated' | 'glass' | 'gradient';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    const baseStyles = 'rounded-2xl overflow-hidden transition-smooth';
    const variantStyles = {
      default: 'bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] border border-gray-200 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]',
      bordered: 'bg-white border-2 border-emerald-200 shadow-sm hover:shadow-md',
      elevated: 'bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] border border-gray-200 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]',
      glass: 'bg-white/50 backdrop-blur border border-white/80 shadow-sm hover:shadow-md',
      gradient: 'bg-gradient-to-br from-white to-emerald-50 shadow-md border border-emerald-100 hover:shadow-lg',
    };

    return (
      <div 
        ref={ref} 
        className={`${baseStyles} ${variantStyles[variant]} ${className}`} 
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
