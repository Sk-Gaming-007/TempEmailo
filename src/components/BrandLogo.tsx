import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = "", size = 40 }) => {
  return (
    <div 
      className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 shadow-md shadow-blue-500/20 flex-shrink-0 text-white overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Subtle glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
      
      {/* SVG Icon: Envelope with Shield & Sparkle */}
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-sm"
      >
        <rect
          x="2.5"
          y="4.5"
          width="19"
          height="15"
          rx="3.5"
          stroke="white"
          strokeWidth="2.2"
        />
        <path
          d="M3 7.5L11.4 13.0667C11.7667 13.3111 12.2333 13.3111 12.6 13.0667L21 7.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Security Sparkle Badge */}
        <circle cx="18.5" cy="16.5" r="4.2" fill="#10b981" stroke="#2563eb" strokeWidth="1.2" />
        <path
          d="M17 16.5L18.2 17.7L20.3 15.2"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
