import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2.5">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-4 md:px-5 py-3 text-sm md:text-base border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 placeholder:text-gray-600 placeholder:font-medium ${
            error 
              ? 'border-red-500 focus:border-red-600 focus:ring-red-300 text-gray-900' 
              : 'border-gray-300 focus:border-green-600 focus:ring-green-300 hover:border-gray-400 text-gray-900'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-2 text-xs md:text-sm text-red-700 font-semibold">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
