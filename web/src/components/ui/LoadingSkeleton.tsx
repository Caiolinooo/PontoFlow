'use client';

import React from 'react';

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export default function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-[var(--surface)] rounded animate-pulse"
          style={{
            width: `${Math.random() * 30 + 70}%`,
            animationDelay: `${index * 0.1}s`
          }}
        />
      ))}
    </div>
  );
}

