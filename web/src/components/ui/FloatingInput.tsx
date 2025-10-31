import React, { forwardRef, InputHTMLAttributes } from "react";

export interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

// Meta-like floating label input
// Usage: <FloatingInput id="email" label="E-mail" type="email" {...register('email')} />
const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ id, label, error, className = "", ...props }, ref) => {
    return (
      <div className="relative">
        <input
          id={id}
          ref={ref}
          placeholder=" "
          className={[
            "peer block w-full rounded-lg",
            "bg-[var(--input)] text-[var(--foreground)]",
            "border-2 border-gray-300 dark:border-gray-600",
            "px-4 pt-6 pb-2",
            "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "transition-all duration-200",
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "",
            className,
          ].join(" ")}
          {...props}
        />
        <label
          htmlFor={id}
          className={[
            "absolute left-4 top-2",
            "text-xs font-medium",
            "text-gray-600 dark:text-gray-400",
            "transition-all duration-200",
            "pointer-events-none",
            "peer-placeholder-shown:text-base peer-placeholder-shown:top-4",
            "peer-focus:text-xs peer-focus:top-2",
            "peer-focus:text-[var(--primary)]",
            error ? "text-red-600 dark:text-red-400" : "",
          ].join(" ")}
        >
          {label}
        </label>
        {error ? (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export default FloatingInput;

