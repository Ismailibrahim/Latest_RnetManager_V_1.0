# Performance Optimization Guide

This document describes the performance optimizations implemented in the RentApplication frontend.

## Overview

The application includes several performance optimizations:
- **Code Splitting** - Automatic code splitting via Next.js
- **Lazy Loading** - Lazy loading of components and images
- **API Caching** - Client-side caching of API responses
- **Bundle Optimization** - Optimized webpack configuration
- **Image Optimization** - Next.js Image component with lazy loading

## Code Splitting

Next.js automatically splits code at the page level. Additional optimizations:

### Route-Based Code Splitting

Each page is automatically code-split:

```jsx
// pages/properties/page.jsx - automatically split
export default function PropertiesPage() {
  // ...
}
```

### Dynamic Imports

Use dynamic imports for heavy components:

```jsx
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(() => import("@/components/HeavyComponent"), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Disable SSR if not needed
});
```

### Package Optimization

Large packages are optimized in `next.config.mjs`:

```js
experimental: {
  optimizePackageImports: ["lucide-react"],
}
```

## API Response Caching

**Location:** `utils/api-cache.js`

Client-side caching reduces API requests and improves performance.

### Basic Usage

```jsx
import { cachedFetch } from "@/utils/api-cache";

// Cached GET request
const response = await cachedFetch("/api/v1/properties", {
  cache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
});
```

### Using the Hook

```jsx
import { useCachedFetch } from "@/hooks/useCachedFetch";

function PropertiesList() {
  const { data, loading, error, refetch } = useCachedFetch(
    "/api/v1/properties",
    {
      cache: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Data is cached automatically
  // Refetch to get fresh data
  // Invalidate to clear cache
}
```

### Cache Options

- `cache` (default: `true`) - Enable/disable caching
- `cacheTTL` - Time to live in milliseconds (default: 5 minutes)
- `maxSize` - Maximum cache entries (default: 100)

### Cache Invalidation

```jsx
import { invalidateCache, clearAllCache } from "@/utils/api-cache";

// Invalidate specific URL
invalidateCache("/api/v1/properties");

// Invalidate URL pattern
invalidateCache(/\/api\/v1\/properties/);

// Clear all cache
clearAllCache();
```

## Lazy Loading

### Component Lazy Loading

**Location:** `utils/lazy-load.js`

```jsx
import { createLazyComponent } from "@/utils/lazy-load";

const HeavyChart = createLazyComponent(
  () => import("@/components/HeavyChart"),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);
```

### Image Lazy Loading

**Location:** `components/LazyImage.jsx`

```jsx
import { LazyImage } from "@/components/LazyImage";

<LazyImage
  src="/images/property.jpg"
  alt="Property"
  width={800}
  height={600}
  priority={false} // Lazy load
/>
```

## Bundle Optimization

**Location:** `next.config.mjs`

Webpack is configured for optimal bundle splitting:

- **Vendor Chunk** - Separate chunk for node_modules
- **Common Chunk** - Shared code across pages
- **Deterministic Module IDs** - Better caching
- **Runtime Chunk** - Separate runtime code

### Bundle Analysis

Analyze bundle size:

```bash
npm install --save-dev @next/bundle-analyzer
```

Add to `next.config.mjs`:

```js
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
```

Run analysis:

```bash
ANALYZE=true npm run build
```

## Image Optimization

### Next.js Image Component

Always use Next.js Image component:

```jsx
import Image from "next/image";

<Image
  src="/images/property.jpg"
  alt="Property"
  width={800}
  height={600}
  priority={false} // Lazy load by default
  placeholder="blur" // Blur placeholder
/>
```

### Image Formats

Next.js automatically serves:
- AVIF format (modern browsers)
- WebP format (fallback)
- Original format (legacy browsers)

### Image Sizes

Configured sizes in `next.config.mjs`:
- Device sizes: 640, 750, 828, 1080, 1200, 1920, 2048, 3840
- Image sizes: 16, 32, 48, 64, 96, 128, 256, 384

## Performance Best Practices

### 1. Use Cached Fetch for List Data

```jsx
const { data } = useCachedFetch("/api/v1/properties", {
  cache: true,
  cacheTTL: 5 * 60 * 1000,
});
```

### 2. Lazy Load Heavy Components

```jsx
const Chart = dynamic(() => import("@/components/Chart"), {
  ssr: false,
});
```

### 3. Optimize Re-renders

Use React.memo for expensive components:

```jsx
export default React.memo(function ExpensiveComponent({ data }) {
  // ...
});
```

### 4. Use useMemo for Expensive Calculations

```jsx
const filteredData = useMemo(() => {
  return data.filter(item => item.status === "active");
}, [data]);
```

### 5. Debounce Search Inputs

```jsx
import { useDebounce } from "@/hooks/useDebounce";

const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  // Search API call with debounced value
}, [debouncedSearch]);
```

### 6. Paginate Large Lists

Always paginate large data sets:

```jsx
const { data } = useCachedFetch("/api/v1/properties", {
  params: { page: 1, per_page: 15 },
});
```

### 7. Prefetch Critical Routes

```jsx
import Link from "next/link";

<Link href="/properties" prefetch={true}>
  Properties
</Link>
```

## Monitoring Performance

### Web Vitals

Next.js automatically tracks Web Vitals:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)

### Performance API

Monitor performance:

```jsx
useEffect(() => {
  if (typeof window !== "undefined" && "performance" in window) {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log("Page load time:", pageLoadTime);
  }
}, []);
```

## Caching Strategy

### API Cache TTL Guidelines

- **Static Data** (properties, units, tenants): 5-10 minutes
- **Dynamic Data** (payments, invoices): 1-2 minutes
- **User-Specific Data** (notifications): 30 seconds - 1 minute
- **Real-time Data**: No cache

### Cache Invalidation

Invalidate cache after mutations:

```jsx
const handleCreate = async (data) => {
  await fetch("/api/v1/properties", {
    method: "POST",
    body: JSON.stringify(data),
  });
  
  // Invalidate cache
  invalidateCache("/api/v1/properties");
  refetch();
};
```

## Performance Checklist

- [ ] Use Next.js Image component for all images
- [ ] Lazy load heavy components
- [ ] Use cached fetch for list data
- [ ] Paginate large lists
- [ ] Debounce search inputs
- [ ] Optimize re-renders with React.memo
- [ ] Use useMemo for expensive calculations
- [ ] Prefetch critical routes
- [ ] Monitor bundle size
- [ ] Test on slow networks

## Tools

- **Lighthouse** - Performance auditing
- **WebPageTest** - Detailed performance analysis
- **Bundle Analyzer** - Bundle size analysis
- **React DevTools Profiler** - Component performance

---

**Last Updated:** 2024-01-01

