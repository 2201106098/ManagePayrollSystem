import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

/**
 * Custom hook for data fetching with loading, error, and retry functionality
 * Similar to SWR but simpler implementation
 */
export const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const {
    immediate = true,
    retryCount = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    ...fetchOptions
  } = options;

  const fetchData = useCallback(async (retryAttempt = 0) => {
    if (!url) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
          ...fetchOptions.headers,
        },
        ...fetchOptions,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success === false) {
        throw new Error(result.message || 'Request failed');
      }

      setData(result.data || result);
      setLastUpdated(new Date().toISOString());
      
      if (onSuccess) {
        onSuccess(result.data || result);
      }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred while fetching data';
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }

      // Retry logic
      if (retryAttempt < retryCount) {
        setTimeout(() => {
          fetchData(retryAttempt + 1);
        }, retryDelay * Math.pow(2, retryAttempt)); // Exponential backoff
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, retryCount, retryDelay, onSuccess, onError, fetchOptions]);

  // Initial fetch
  useEffect(() => {
    if (immediate && url) {
      fetchData();
    }
  }, [immediate, url, fetchData]);

  // Manual refetch function
  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  // Mutate function for optimistic updates
  const mutate = useCallback(async (newData, options = {}) => {
    const { optimistic = false, rollbackOnError = true } = options;
    
    let previousData = null;
    
    if (optimistic) {
      previousData = data;
      setData(newData);
    }

    try {
      // If you need to sync with server, you can make a PUT/PATCH request here
      if (options.revalidate) {
        await fetchData();
      }
    } catch (err) {
      if (rollbackOnError && optimistic) {
        setData(previousData);
      }
      throw err;
    }
  }, [data, fetchData]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch,
    mutate,
  };
};

/**
 * Hook for paginated data fetching
 */
export const usePaginatedFetch = (url, options = {}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options.pageSize || 10);
  
  const paginatedUrl = `${url}?page=${page}&limit=${pageSize}`;
  
  const { data, isLoading, error, refetch } = useFetch(paginatedUrl, options);
  
  const pagination = data?.pagination || {};
  
  const goToPage = useCallback((newPage) => {
    setPage(newPage);
  }, []);
  
  const nextPage = useCallback(() => {
    if (page < pagination.pages) {
      setPage(prev => prev + 1);
    }
  }, [page, pagination.pages]);
  
  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);
  
  const changePageSize = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  }, []);
  
  return {
    data: data?.data || [],
    pagination,
    isLoading,
    error,
    page,
    pageSize,
    refetch,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
  };
};

export default useFetch;
