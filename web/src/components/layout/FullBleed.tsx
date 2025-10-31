import React from 'react';

export default function FullBleed({ children, className }: { children: React.ReactNode; className?: string }) {
  // Break out of centered container: full viewport width
  return (
    <div className={`relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen ${className ?? ''}`}>
      {children}
    </div>
  );
}

