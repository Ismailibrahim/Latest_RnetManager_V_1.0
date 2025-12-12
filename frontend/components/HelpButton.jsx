"use client";

import { useState, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { HelpPanel } from "./HelpPanel";
import clsx from "clsx";

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  // Close panel when clicking outside (handled by HelpPanel)
  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={handleToggle}
        className={clsx(
          "fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isOpen && "bg-slate-600"
        )}
        aria-label="Open help panel"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <HelpCircle className="h-6 w-6" />
        )}
      </button>

      {/* Help Panel */}
      <HelpPanel isOpen={isOpen} onClose={handleClose} />
    </>
  );
}
