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
            "peer block w-full rounded-xl",
            "bg-[var(--input)] text-[var(--input-foreground)]",
            "border border-[var(--input-border)]",
            "px-4 py-3",
            "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            className,
          ].join(" ")}
          {...props}
        />
        <label
          htmlFor={id}
          className={[
            "pointer-events-none absolute left-3",
            "text-sm text-white",
            "transition-all",
            "top-3",
            "peer-focus:-top-2 peer-focus:text-xs peer-focus:text-white",
            "peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs",
            "bg-[var(--input-label-bg)] px-1 rounded-sm shadow-sm",
          ].join(" ")}
          style={{
            // create a small background behind the label for visual clarity
            transformOrigin: "left top",
          }}
        >
          {label}
        </label>
        {error ? (
          <p className="mt-1 text-sm text-[var(--destructive)]">{error}</p>
        ) : null}
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export default FloatingInput;

