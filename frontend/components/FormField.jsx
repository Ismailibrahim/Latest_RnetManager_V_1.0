"use client";

import { InlineError } from "./ErrorDisplay";

/**
 * FormField Component
 * 
 * A reusable form field component with built-in validation display.
 */
export function FormField({
  label,
  name,
  error,
  required = false,
  hint,
  children,
  className = "",
  labelClassName = "",
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className={`block text-sm font-semibold text-slate-700 ${labelClassName}`}
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {hint && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {children}
      <InlineError error={error} />
    </div>
  );
}

/**
 * Input Component
 * 
 * Enhanced input with validation styling.
 */
export function Input({
  error,
  touched,
  className = "",
  ...props
}) {
  const hasError = error && touched;

  return (
    <input
      {...props}
      className={`
        w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-700
        shadow-sm outline-none transition
        focus:border-primary focus:ring-2 focus:ring-primary/20
        disabled:cursor-not-allowed disabled:opacity-60
        ${hasError ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "border-slate-200"}
        ${className}
      `}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${props.id || props.name}-error` : undefined}
    />
  );
}

/**
 * Textarea Component
 * 
 * Enhanced textarea with validation styling.
 */
export function Textarea({
  error,
  touched,
  className = "",
  rows = 4,
  ...props
}) {
  const hasError = error && touched;

  return (
    <textarea
      {...props}
      rows={rows}
      className={`
        w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-700
        shadow-sm outline-none transition resize-y
        focus:border-primary focus:ring-2 focus:ring-primary/20
        disabled:cursor-not-allowed disabled:opacity-60
        ${hasError ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "border-slate-200"}
        ${className}
      `}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${props.id || props.name}-error` : undefined}
    />
  );
}

/**
 * Select Component
 * 
 * Enhanced select with validation styling.
 */
export function Select({
  error,
  touched,
  className = "",
  children,
  ...props
}) {
  const hasError = error && touched;

  return (
    <select
      {...props}
      className={`
        w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-700
        shadow-sm outline-none transition
        focus:border-primary focus:ring-2 focus:ring-primary/20
        disabled:cursor-not-allowed disabled:opacity-60
        ${hasError ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "border-slate-200"}
        ${className}
      `}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${props.id || props.name}-error` : undefined}
    >
      {children}
    </select>
  );
}

/**
 * Checkbox Component
 * 
 * Enhanced checkbox with validation styling.
 */
export function Checkbox({
  label,
  error,
  touched,
  className = "",
  ...props
}) {
  const hasError = error && touched;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          {...props}
          type="checkbox"
          className={`
            h-4 w-4 rounded border-slate-300 text-primary
            focus:ring-2 focus:ring-primary/20
            ${hasError ? "border-red-300" : ""}
          `}
          aria-invalid={hasError}
        />
        {label && (
          <span className="text-sm font-medium text-slate-700">{label}</span>
        )}
      </label>
      <InlineError error={error} />
    </div>
  );
}

/**
 * Radio Component
 * 
 * Enhanced radio button with validation styling.
 */
export function Radio({
  label,
  error,
  touched,
  className = "",
  ...props
}) {
  const hasError = error && touched;

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        {...props}
        type="radio"
        className={`
          h-4 w-4 border-slate-300 text-primary
          focus:ring-2 focus:ring-primary/20
          ${hasError ? "border-red-300" : ""}
        `}
        aria-invalid={hasError}
      />
      {label && (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      )}
    </label>
  );
}

