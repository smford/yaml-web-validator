import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-8 h-8', size = 32 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="yc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <linearGradient id="yc-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="yc-check" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <filter id="yc-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#6366f1" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Squircle container */}
      <rect width="32" height="32" rx="7.5" fill="url(#yc-bg)" stroke="#27272a" strokeWidth="1.2" />

      {/* Inner YAML Document outline */}
      <rect x="7" y="8" width="12" height="15" rx="2" fill="#1e1b4b" fillOpacity="0.5" stroke="#6366f1" strokeOpacity="0.6" strokeWidth="1.2" />

      {/* Indented YAML lines */}
      <line x1="9.5" y1="12" x2="13.5" y2="12" stroke="#a5b4fc" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11.5" y1="15" x2="16" y2="15" stroke="#a5b4fc" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11.5" y1="18" x2="14" y2="18" stroke="#a5b4fc" strokeWidth="1.2" strokeLinecap="round" />

      {/* Anchor Motif */}
      <circle cx="16" cy="6" r="2" stroke="url(#yc-accent)" strokeWidth="1.6" />
      <line x1="16" y1="8" x2="16" y2="24.5" stroke="url(#yc-accent)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 19.5 C7.5 25.5 12.5 27 16 27 C19.5 27 24.5 25.5 25 19.5" stroke="url(#yc-accent)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5.5 21 L7 18.5 L8.5 21" stroke="url(#yc-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23.5 21 L25 18.5 L26.5 21" stroke="url(#yc-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Clean Validation Checkmark */}
      <path d="M15.5 15 L19.5 19 L27 8.5" stroke="url(#yc-check)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#yc-glow)" />
    </svg>
  );
};
