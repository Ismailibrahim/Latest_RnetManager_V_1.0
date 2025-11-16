"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

/**
 * LazyImage Component
 * 
 * Lazy-loads images using Intersection Observer for better performance.
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = "",
  placeholder = "blur",
  blurDataURL,
  priority = false,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);

  useEffect(() => {
    if (priority || isInView) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView]);

  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`bg-slate-200 animate-pulse ${className}`}
        style={{ width, height }}
        aria-label={alt}
      />
    );
  }

  return (
    <Image
      ref={imgRef}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      priority={priority}
      onLoad={() => setIsLoaded(true)}
      {...props}
    />
  );
}

