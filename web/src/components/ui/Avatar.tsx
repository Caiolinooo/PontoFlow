/**
 * Avatar Component
 * 
 * Displays user profile picture or initials as fallback.
 * Supports multiple sizes and automatic fallback on image load error.
 * 
 * Usage:
 * <Avatar 
 *   src={user.avatar_url} 
 *   alt={user.name}
 *   initials={`${user.first_name?.charAt(0)}${user.last_name?.charAt(0)}`}
 *   size="md"
 * />
 */

'use client';

import React, { useState } from 'react';

export interface AvatarProps {
  /** URL of the profile picture */
  src?: string | null;
  /** Alt text for the image */
  alt?: string;
  /** Initials to display as fallback (e.g., "JD" for John Doe) */
  initials?: string;
  /** Size of the avatar */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show a border */
  bordered?: boolean;
}

export default function Avatar({
  src,
  alt = 'User avatar',
  initials = '?',
  size = 'md',
  className = '',
  bordered = false,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const borderClass = bordered ? 'ring-2 ring-[var(--border)]' : '';

  // Show initials if no src, image error, or still loading
  const showInitials = !src || imageError;

  return (
    <div
      className={`
        relative rounded-full overflow-hidden flex items-center justify-center
        ${sizeClasses[size]}
        ${borderClass}
        ${className}
      `}
      title={alt}
    >
      {showInitials ? (
        // Fallback: Show initials
        <div className="w-full h-full bg-[var(--primary)]/10 flex items-center justify-center">
          <span className="text-[var(--primary)] font-medium uppercase">
            {initials.substring(0, 2)}
          </span>
        </div>
      ) : (
        // Show image
        <>
          {/* Loading skeleton */}
          {imageLoading && (
            <div className="absolute inset-0 bg-[var(--muted)] animate-pulse" />
          )}
          
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        </>
      )}
    </div>
  );
}

/**
 * Avatar Group Component
 * 
 * Displays multiple avatars in a stacked layout.
 * 
 * Usage:
 * <AvatarGroup max={3}>
 *   <Avatar src={user1.avatar_url} initials="JD" />
 *   <Avatar src={user2.avatar_url} initials="SM" />
 *   <Avatar src={user3.avatar_url} initials="AB" />
 * </AvatarGroup>
 */
export function AvatarGroup({
  children,
  max = 3,
  size = 'md',
  className = '',
}: {
  children: React.ReactNode;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const childArray = React.Children.toArray(children);
  const displayedChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      {displayedChildren.map((child, index) => (
        <div
          key={index}
          className="relative ring-2 ring-[var(--background)] rounded-full"
          style={{ zIndex: displayedChildren.length - index }}
        >
          {child}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className={`
            relative rounded-full flex items-center justify-center
            bg-[var(--muted)] text-[var(--muted-foreground)]
            ring-2 ring-[var(--background)]
            ${sizeClasses[size]}
          `}
          style={{ zIndex: 0 }}
        >
          <span className="font-medium">+{remainingCount}</span>
        </div>
      )}
    </div>
  );
}

