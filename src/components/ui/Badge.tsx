import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-gray-100 text-gray-800 border border-gray-300 font-medium',
      success: 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm font-semibold',
      danger: 'bg-red-100 text-red-800 border border-red-300 shadow-sm font-semibold',
      warning: 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm font-semibold',
      info: 'bg-blue-100 text-blue-800 border border-blue-300 shadow-sm font-semibold',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full px-4 py-2 text-xs md:text-sm transition-all duration-200 ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
