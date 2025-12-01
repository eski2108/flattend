/**
 * Performance optimization utilities
 */

/**
 * Debounce function calls to prevent excessive executions
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function calls to limit execution rate
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Lazy load images with intersection observer
 */
export const lazyLoadImage = (imageElement) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  });
  
  observer.observe(imageElement);
};

/**
 * Cache API responses in memory
 */
const cache = new Map();

export const cacheResponse = (key, data, ttl = 60000) => {
  const expiry = Date.now() + ttl;
  cache.set(key, { data, expiry });
};

export const getCachedResponse = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * Batch multiple API calls
 */
export const batchRequests = async (requests, batchSize = 3) => {
  const results = [];
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }
  return results;
};

/**
 * Measure component render time
 */
export const measureRenderTime = (componentName) => {
  const start = performance.now();
  return () => {
    const end = performance.now();
    console.log(`[Performance] ${componentName} rendered in ${(end - start).toFixed(2)}ms`);
  };
};
