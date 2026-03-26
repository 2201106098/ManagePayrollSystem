import { configureStore } from '@reduxjs/toolkit';
import logger from 'redux-logger';

// Custom middleware for API calls
export const apiMiddleware = (store) => (next) => (action) => {
  // Log all API-related actions
  if (action.type.endsWith('/pending') || 
      action.type.endsWith('/fulfilled') || 
      action.type.endsWith('/rejected')) {
    console.log(`API Action: ${action.type}`, action);
  }
  
  return next(action);
};

// Custom middleware for error handling
export const errorMiddleware = (store) => (next) => (action) => {
  if (action.type.endsWith('/rejected')) {
    console.error('Async action rejected:', action.payload);
    // You could dispatch a notification action here
    // store.dispatch(showNotification({ type: 'error', message: action.payload }));
  }
  
  return next(action);
};

// Middleware configuration based on environment
const middleware = (getDefaultMiddleware) => {
  const middlewares = getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
    },
  });

  // Add custom middleware
  middlewares.push(apiMiddleware);
  middlewares.push(errorMiddleware);

  // Add logger only in development
  if (process.env.NODE_ENV === 'development') {
    middlewares.push(logger);
  }

  return middlewares;
};

export default middleware;
