'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export default function Skeleton({ className = 'h-12 w-full', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${className} bg-gray-200 rounded animate-pulse`}
          role="status"
          aria-label="Loading"
        />
      ))}
    </>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-full" count={5} />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="border rounded p-4 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

