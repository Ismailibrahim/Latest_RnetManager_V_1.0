/**
 * Lazy Loading Utilities
 * 
 * Provides utilities for lazy loading components and data.
 */

import dynamic from "next/dynamic";

/**
 * Create a lazy-loaded component with loading state
 * 
 * @param {Function} importFunc - Dynamic import function
 * @param {object} options - Loading options
 * @returns {Component}
 */
export function createLazyComponent(importFunc, options = {}) {
  const {
    loading: LoadingComponent,
    ssr = true,
    ...dynamicOptions
  } = options;

  return dynamic(importFunc, {
    loading: LoadingComponent
      ? () => <LoadingComponent />
      : () => (
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
        ),
    ssr,
    ...dynamicOptions,
  });
}

/**
 * Lazy load a component with default loading state
 */
export function lazyLoad(importFunc) {
  return createLazyComponent(importFunc, {
    ssr: false,
  });
}

/**
 * Intersection Observer hook for lazy loading
 * (Can be used for images, sections, etc.)
 */
export function useIntersectionObserver(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = "50px",
    triggerOnce = true,
  } = options;

  return {
    threshold,
    rootMargin,
    triggerOnce,
  };
}

