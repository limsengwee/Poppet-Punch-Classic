

import React from 'react';

// Fix: Updated MalletIcon props to accept standard SVG props like `style`, resolving the TypeScript error. The hardcoded transform was removed to fix a style override bug.
export const MalletIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    {...props}
  >
    <path d="M19.9999 4.00003L14.8283 9.17159L12.707 7.04992L17.8786 1.87869C18.2691 1.48816 18.9023 1.48816 19.2928 1.87869L22.1212 4.70712C22.5117 5.09764 22.5117 5.73081 22.1212 6.12133L19.9999 8.24268V4.00003Z" fill="#a16207"/>
    <path d="M11.2929 8.46447L2 17.7574V22H6.24264L15.5355 12.7071L11.2929 8.46447Z" fill="#ca8a04"/>
    <path d="M12.7071 7.05021L14.8284 9.17154L15.5355 8.46443L13.4142 6.3431L12.7071 7.05021Z" fill="#fbbf24"/>
    <path d="M5.53553 21.2929L6.24264 22L2 22V17.7574L2.70711 18.4645L5.53553 21.2929Z" fill="#854d0e"/>
  </svg>
);

// Fix: Updated UploadIcon to accept all SVG props for consistency and flexibility.
export const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    {...props}
  >
    <path d="M13 10H18L12 3L6 10H11V16H13V10ZM4 18H20V20H4V18Z" />
  </svg>
);

// Fix: Updated SpinnerIcon to accept all SVG props while preserving its base animation class.
export const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, ...props }) => (
  <svg className={`animate-spin ${className || ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const CoinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400" {...props}>
    <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 20C7.582 20 4 16.418 4 12C4 7.582 7.582 4 12 4C16.418 4 20 7.582 20 12C20 16.418 16.418 20 12 20ZM12 6C8.686 6 6 8.686 6 12C6 12.552 6.448 13 7 13C7.552 13 8 12.552 8 12C8 9.791 9.791 8 12 8C14.209 8 16 9.791 16 12C16 14.209 14.209 16 12 16C11.448 16 11 16.448 11 17C11 17.552 11.448 18 12 18C15.314 18 18 15.314 18 12C18 8.686 15.314 6 12 6Z"></path>
  </svg>
);

export const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M4 5H7L9 3H15L17 5H20C21.1046 5 22 5.89543 22 7V19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V7C2 5.89543 2.89543 5 4 5ZM12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17ZM12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"></path>
  </svg>
);

export const HandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M21.5 12.5C21.5 12.2239 21.2761 12 21 12H19.25V5.5C19.25 4.11929 18.1307 3 16.75 3C15.3693 3 14.25 4.11929 14.25 5.5V11.5H11.75V2.5C11.75 1.11929 10.6307 0 9.25 0C7.86929 0 6.75 1.11929 6.75 2.5V11.5H4.75C4.25 11.5 3.75 11.75 3.5 12.25C2.5 14.25 3.75 16.5 3.75 16.5C3.75 16.5 4.75 22 9.25 22H16.25C20.75 22 21.5 17 21.5 16.5V12.5Z"/>
  </svg>
);

export const VoodooNeedleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M21.707,2.293a1,1,0,0,0-1.414,0L2.586,20H2a1,1,0,0,0,0,2H4.414l-1.707-1.707a1,1,0,0,0-1.414,1.414L3,23.414V21a1,1,0,0,0,2,0V18.414L20.293,3.707A1,1,0,0,0,21.707,2.293Z"/>
    <path d="M19,7a3,3,0,1,0-3-3A3,3,0,0,0,19,7Z"/>
  </svg>
);

export const SpiderIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.7,7.26a.5.5,0,0,0-.7-.4L16.22,8.4V6.5a.5.5,0,0,0-1,0v2.75l-2.61.87a4,4,0,0,0-1.22,0L8.78,9.25V6.5a.5.5,0,0,0-1,0V8.4L5,6.86a.5.5,0,0,0-.7.4L3.06,9.9a.5.5,0,0,0,.35.65l2.7,1.35V13a.5.5,0,0,0,1,0v-1l2.5-.83.39.2a.5.5,0,0,0,.52,0l.39-.2,2.5.83v1a.5.5,0,0,0,1,0v-1.1l2.7-1.35a.5.5,0,0,0,.35-.65ZM12,14.4a3.2,3.2,0,1,0,3.2,3.2A3.2,3.2,0,0,0,12,14.4Zm-5,1.5a.5.5,0,0,0,0,1H8.83l.89,1.78a.5.5,0,0,0,.86,0l.89-1.78h1.83a.5.5,0,0,0,0-1H11.5l-1-2a.5.5,0,0,0-.86,0l-1,2Z"/>
  </svg>
);

export const BlisterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".3"/>
      <path d="M12,5a7,7,0,1,0,7,7A7,7,0,0,0,12,5Zm0,12a5,5,0,1,1,5-5A5,5,0,0,1,12,17Z"/>
      <path d="M14.2,8.25a3,3,0,0,0-4.4,0,1,1,0,0,0,1.4,1.4,1,1,0,0,1,1.6,0,1,1,0,0,0,1.4-1.4Z"/>
    </svg>
);

export const ClassicPunchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M20.9,4.6c-1.3-1.6-3.5-2.2-5.5-1.6c-3.1,0.9-4.8,3.9-4.4,6.9c0.3,2.2,2.2,4.1,4.4,4.5c1.4,0.3,2.9,0,4.2-0.8 c1.8-1.2,2.9-3.2,3-5.3C22.8,7.1,22.1,5.8,20.9,4.6z M10.4,19.2c-0.2-1.3,0.6-2.6,1.9-2.9c1.3-0.3,2.6,0.5,2.9,1.8 c0.3,1.3-0.5,2.6-1.8,2.9C12.1,21.3,10.7,20.5,10.4,19.2z M6.4,17.2c-0.2-1.3,0.6-2.6,1.9-2.9c1.3-0.3,2.6,0.5,2.9,1.8 c0.3,1.3-0.5,2.6-1.8,2.9S6.7,18.5,6.4,17.2z M17.2,12.8c-0.6,0-1.2-0.5-1.2-1.2c0-0.6,0.5-1.2,1.2-1.2s1.2,0.5,1.2,1.2 C18.4,12.3,17.9,12.8,17.2,12.8z M19.2,9.6c-0.6,0-1.2-0.5-1.2-1.2s0.5-1.2,1.2-1.2s1.2,0.5,1.2,1.2S19.9,9.6,19.2,9.6z"/>
    </svg>
);

export const BurnerGunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M10.46 12.54a1 1 0 0 1 0-1.41l6-6a1 1 0 0 1 1.41 1.41l-6 6a1 1 0 0 1-1.41 0z" fill="#a1a1aa"/>
        <path d="M9 13a1 1 0 0 1-.71-.29L3.54 8 2.83 8.71 7.29 13.17a3 3 0 0 0 4.24 0l1.18-1.18-1.88-1.88-2.12 2.12A1 1 0 0 1 9 13z" fill="#dc2626"/>
        <path d="M7.88 13.88a3 3 0 0 0-4.24 0L2.22 15.3a1 1 0 0 0 0 1.41L3.64 18.12a1 1 0 0 0 1.41 0l1.42-1.42a3 3 0 0 0 0-4.24z" fill="#b91c1c"/>
        <path d="M22.56 2.44a1 1 0 0 0-1.09-.21l-3 1A1 1 0 0 0 17.5 4v0a8.42 8.42 0 0 1-4.75 4.75l-1 .31-1.42-1.42.31-1A8.42 8.42 0 0 1 15.4 2h0a1 1 0 0 0 .77-.93l1-3a1 1 0 0 0-.21-1.09z" fill="#f97316"/>
        <path d="M19.91 3.09a6.45 6.45 0 0 0-5.82 5.82c.42 0 .83.06 1.24.18l1.42-1.42a.5.5 0 0 1 .71 0l.7.71a.5.5 0 0 1 0 .71l-1.42 1.42c.12.41.18.82.18 1.24a6.45 6.45 0 0 0 5.82-5.82.51.51 0 0 0-.5-.51z" fill="#fbbf24"/>
    </svg>
);

export const PhlegmIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.5,7.5c0,4-4.5,7-4.5,7s-4.5-3-4.5-7a4.5,4.5,0,0,1,9,0Z"/>
    <path d="M18.6,12.1a1,1,0,0,0-1.2.6,4.1,4.1,0,0,1-3.1,2.8,1,1,0,0,0-.3,2,6,6,0,0,0,4.8-4.2A1,1,0,0,0,18.6,12.1Z"/>
  </svg>
);

export const TornadoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22,6H2a1,1,0,0,0,0,2H22a1,1,0,0,0,0-2Z"/>
    <path d="M19,10H5a1,1,0,0,0,0,2H19a1,1,0,0,0,0-2Z"/>
    <path d="M16,14H8a1,1,0,0,0,0,2h8a1,1,0,0,0,0-2Z"/>
    <path d="M13,18H11a1,1,0,0,0,0,2h2a1,1,0,0,0,0-2Z"/>
  </svg>
);

export const RestartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12 10.5858L9.17157 7.75736L7.75736 9.17157L10.5858 12L7.75736 14.8284L9.17157 16.2426L12 13.4142L14.8284 16.2426L16.2426 14.8284L13.4142 12L16.2426 9.17157L14.8284 7.75736L12 10.5858Z" />
  </svg>
);

export const BroomIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M21 1.75a.75.75 0 0 0-1.06-.05L6.21 14.07a3.5 3.5 0 0 0 4.64 5.2l.14-.11L21.05 2.81a.75.75 0 0 0-.05-1.06zM9.5 19a2 2 0 1 1-3.66 1.22l-1.5-3.48A2 2 0 0 1 6.5 14H12v2.5a2.5 2.5 0 0 1-2.5 2.5z" />
  </svg>
);

export const GlobeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1h-2v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

export const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M13 9V3h-2v6H6l6 7 6-7h-5zM4 18v2h16v-2H4z" />
    </svg>
);

export const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

export const LogoutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
  </svg>
);

export const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
  </svg>
);

export const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px" {...props}>
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <pre><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.018,36.251,44,30.655,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></pre>
  </svg>
);
