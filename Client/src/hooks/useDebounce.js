import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a value
 * Useful for search inputs, API calls, etc.
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear timeout if value or delay changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook that returns a debounced callback function
 * Useful for debouncing function calls directly
 */
export const useDebouncedCallback = (callback, delay, deps = []) => {
  const [debouncedCallback, setDebouncedCallback] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCallback(() => callback);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [callback, delay, ...deps]);

  return debouncedCallback;
};

/**
 * Hook for search functionality with debounced input
 */
export const useSearch = (initialValue = '', delay = 300) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  useEffect(() => {
    if (debouncedSearchTerm !== initialValue) {
      setIsSearching(true);
      // You can add a timeout here to reset isSearching after search completes
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [debouncedSearchTerm, initialValue, delay]);

  const resetSearch = () => {
    setSearchTerm(initialValue);
    setIsSearching(false);
  };

  return {
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    setSearchTerm,
    resetSearch,
  };
};

export default useDebounce;
