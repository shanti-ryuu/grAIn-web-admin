import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeMap = {
    sm: { width: 40, height: 40 },
    md: { width: 60, height: 60 },
    lg: { width: 80, height: 80 },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Image */}
      <div className="flex-shrink-0 rounded-lg overflow-hidden shadow-md">
        <Image
          src="/grain-admin.jpg"
          alt="grAIn Admin Logo"
          width={currentSize.width}
          height={currentSize.height}
          className="object-cover"
          priority
        />
      </div>

      {/* Text Logo - Hidden on sm size */}
      {showText && size !== 'sm' && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-gray-900 text-lg md:text-xl">
            gr<span className="text-green-600">A</span>in
          </span>
          <span className="text-xs text-gray-600 font-medium">Admin</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
