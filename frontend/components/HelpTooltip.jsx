"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import clsx from "clsx";

/**
 * HelpTooltip Component
 * Displays an inline help tooltip next to form fields or UI elements
 * 
 * @param {string} content - The help text to display
 * @param {string} position - Tooltip position: 'top', 'bottom', 'left', 'right'
 * @param {string} className - Additional CSS classes
 */
export function HelpTooltip({ content, position = "top", className }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        tooltipRef.current &&
        buttonRef.current &&
        !tooltipRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!content) return null;

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-t-transparent border-b-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <div className={clsx("relative inline-flex", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
        aria-label="Show help"
        aria-expanded={isOpen}
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className={clsx(
            "absolute z-50 w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl",
            positionClasses[position]
          )}
          role="tooltip"
        >
          <div className="relative">
            <p className="text-sm leading-relaxed">{content}</p>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -right-1 -top-1 rounded-full p-0.5 text-white hover:bg-slate-800"
              aria-label="Close tooltip"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {/* Arrow */}
          <div
            className={clsx(
              "absolute h-0 w-0 border-4",
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  );
}
