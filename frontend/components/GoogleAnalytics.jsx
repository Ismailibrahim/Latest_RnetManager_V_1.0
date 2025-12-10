"use client";

import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

/**
 * Google Analytics Component using Next.js Official Package
 * 
 * This uses @next/third-parties which provides:
 * - Automatic route tracking (SPA navigation)
 * - Optimized loading strategy
 * - Built-in performance optimizations
 * - Official Next.js support
 * 
 * Environment variables:
 * - NEXT_PUBLIC_GA_ID: Your Google Analytics ID (default: G-7TFNGSDY02)
 * - NEXT_PUBLIC_ENABLE_GA: Control when GA loads
 *   - "false" = disabled in all environments
 *   - "true" = enabled in all environments
 *   - unset = enabled only in production (default)
 */

export default function GoogleAnalytics() {
  // Get GA ID from environment variable, with fallback
  const gaId = process.env.NEXT_PUBLIC_GA_ID || "G-7TFNGSDY02";
  
  // Control GA loading: 
  // - "false" = disabled in all environments
  // - "true" = enabled in all environments  
  // - unset/undefined = enabled only in production (default)
  const enableGa = process.env.NEXT_PUBLIC_ENABLE_GA;
  const isProduction = process.env.NODE_ENV === "production";
  
  // Determine if GA should be loaded
  let shouldLoad = true;
  if (enableGa === "false") {
    shouldLoad = false; // Explicitly disabled
  } else if (enableGa !== "true" && !isProduction) {
    shouldLoad = false; // Not explicitly enabled and not in production
  }
  
  // Don't render if disabled
  if (!shouldLoad) {
    return null;
  }

  // Validate GA ID format (should start with G- for GA4)
  if (!gaId.startsWith("G-")) {
    console.warn("Invalid Google Analytics ID format. Should start with 'G-' for GA4.");
    return null;
  }

  // Use Next.js official GoogleAnalytics component
  // This automatically handles:
  // - Script loading optimization
  // - Route change tracking (SPA navigation)
  // - Performance optimizations
  return <NextGoogleAnalytics gaId={gaId} />;
}

/**
 * Utility functions for tracking custom events
 * Usage: import { trackEvent, trackPageView } from '@/components/GoogleAnalytics';
 * 
 * Note: The @next/third-parties package automatically tracks pageviews on route changes.
 * These utilities are for custom event tracking.
 */

/**
 * Track a custom event in Google Analytics
 * 
 * @param {string} action - The event action (e.g., 'click', 'submit', 'purchase')
 * @param {string} category - The event category (e.g., 'button', 'form', 'ecommerce')
 * @param {string} [label] - Optional event label for additional context
 * @param {number} [value] - Optional numeric value associated with the event
 * 
 * @example
 * trackEvent('click', 'button', 'signup_button');
 * trackEvent('submit', 'form', 'contact_form', 100);
 * trackEvent('purchase', 'ecommerce', 'subscription_pro', 999);
 */
export const trackEvent = (action, category, label, value) => {
  if (typeof window === "undefined" || !window.gtag) return;
  
  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

/**
 * Manually track a pageview
 * 
 * Note: This is usually not needed as @next/third-parties automatically
 * tracks pageviews on route changes. Use this only for special cases.
 * 
 * @param {string} [url] - The page URL to track (defaults to current pathname)
 * 
 * @example
 * trackPageView('/custom-page');
 */
export const trackPageView = (url) => {
  if (typeof window === "undefined" || !window.gtag) return;
  
  const gaId = process.env.NEXT_PUBLIC_GA_ID || "G-7TFNGSDY02";
  window.gtag("config", gaId, {
    page_path: url || window.location.pathname,
  });
};

