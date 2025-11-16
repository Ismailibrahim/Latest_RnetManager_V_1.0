"use client";

import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * ErrorDisplay Component
 * 
 * A reusable component for displaying error messages with different styles
 * and auto-dismiss functionality.
 */
export function ErrorDisplay({
  error,
  title,
  message,
  onDismiss,
  autoDismiss = false,
  autoDismissDelay = 5000,
  variant = "error", // 'error' | 'warning' | 'info'
  className = "",
  showIcon = true,
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, isVisible, onDismiss]);

  if (!isVisible || (!error && !message)) {
    return null;
  }

  const displayMessage = message || (error?.message || error) || "An error occurred";
  const displayTitle = title || (error?.name === "ApiError" ? "API Error" : "Error");

  const variantStyles = {
    error: {
      container: "border-red-200 bg-red-50",
      icon: "text-red-600",
      title: "text-red-900",
      message: "text-red-800",
      button: "text-red-600 hover:bg-red-100",
    },
    warning: {
      container: "border-amber-200 bg-amber-50",
      icon: "text-amber-600",
      title: "text-amber-900",
      message: "text-amber-800",
      button: "text-amber-600 hover:bg-amber-100",
    },
    info: {
      container: "border-blue-200 bg-blue-50",
      icon: "text-blue-600",
      title: "text-blue-900",
      message: "text-blue-800",
      button: "text-blue-600 hover:bg-blue-100",
    },
  };

  const styles = variantStyles[variant] || variantStyles.error;
  const Icon = variant === "warning" ? AlertTriangle : AlertCircle;

  return (
    <div
      className={`rounded-lg border p-4 ${styles.container} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {displayTitle && (
            <h3 className={`text-sm font-semibold ${styles.title} mb-1`}>
              {displayTitle}
            </h3>
          )}
          <p className={`text-sm ${styles.message}`}>{displayMessage}</p>
          {error?.errors && Object.keys(error.errors).length > 0 && (
            <ul className="mt-2 list-disc list-inside text-xs">
              {Object.entries(error.errors).map(([field, messages]) => (
                <li key={field}>
                  {Array.isArray(messages) ? messages.join(", ") : messages}
                </li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
            className={`flex-shrink-0 rounded p-1 transition ${styles.button}`}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * InlineError Component
 * 
 * A smaller, inline error display for form fields and smaller spaces.
 */
export function InlineError({ error, message, className = "" }) {
  if (!error && !message) {
    return null;
  }

  const displayMessage = message || (error?.message || error) || "An error occurred";

  return (
    <p className={`text-xs text-red-600 mt-1 ${className}`} role="alert">
      {displayMessage}
    </p>
  );
}

