import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create base axios instance
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-memory token storage (more secure than localStorage)
let accessToken = null;

// Function to set access token
export const setAccessToken = (token) => {
  accessToken = token;
  // Also store in sessionStorage as backup for page refresh
  if (token) {
    sessionStorage.setItem('accessToken_backup', token);
  } else {
    sessionStorage.removeItem('accessToken_backup');
  }
};

// Function to get access token
export const getAccessToken = () => {
  // Try memory first, then sessionStorage backup
  if (!accessToken) {
    const backupToken = sessionStorage.getItem('accessToken_backup');
    if (backupToken) {
      console.log('Restored token from sessionStorage backup');
      accessToken = backupToken;
    }
  }
  return accessToken;
};

// Function to clear access token
export const clearAccessToken = () => {
  accessToken = null;
  sessionStorage.removeItem('accessToken_backup');
};

// Function to check and refresh token if needed
export const checkAndRefreshToken = async () => {
  console.log('=== CHECK AND REFRESH TOKEN START ===');
  console.log('Current access token:', accessToken ? 'EXISTS' : 'NULL');
  
  if (!accessToken) {
    // Try to refresh using cookie even if no access token in memory
    try {
      console.log('No access token in memory, attempting cookie refresh...');
      const refreshResponse = await axios.post(
        `${axiosClient.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      
      console.log('Cookie refresh response status:', refreshResponse.status);
      console.log('Cookie refresh response data:', refreshResponse.data);
      
      if (refreshResponse.data?.data?.accessToken) {
        const newAccessToken = refreshResponse.data.data.accessToken;
        setAccessToken(newAccessToken);
        console.log('Cookie refresh successful, token set');
        return true;
      } else {
        console.log('Cookie refresh response missing accessToken');
      }
    } catch (error) {
      console.log('Cookie refresh failed:', error.response?.status, error.response?.data);
    }
    console.log('=== CHECK AND REFRESH TOKEN END (FAILED) ===');
    return false;
  }
  
  try {
    const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const timeUntilExpiry = tokenPayload.exp - currentTime;
    
    console.log('Token expires in:', timeUntilExpiry, 'seconds');
    
    // If token expires within 30 minutes, refresh it proactively
    if (timeUntilExpiry < 1800) {
      console.log('Token expiring soon, proactively refreshing...');
      const refreshResponse = await axios.post(
        `${axiosClient.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      
      const newAccessToken = refreshResponse.data.data.accessToken;
      setAccessToken(newAccessToken);
      console.log('Proactive refresh successful');
      console.log('=== CHECK AND REFRESH TOKEN END (SUCCESS) ===');
      return true;
    }
    console.log('Token is still valid, no refresh needed');
    console.log('=== CHECK AND REFRESH TOKEN END (VALID) ===');
    return true; // Token is still valid
  } catch (error) {
    console.error('Failed to check/refresh token:', error);
    console.log('=== CHECK AND REFRESH TOKEN END (ERROR) ===');
    return false;
  }
};

// Request interceptor to add auth token
axiosClient.interceptors.request.use(
  async (config) => {
    // If no access token, try to refresh using cookie first
    if (!accessToken) {
      console.log('No token in memory, attempting refresh before request...');
      const wasRefreshed = await checkAndRefreshToken();
      if (!wasRefreshed) {
        // If refresh failed, proceed without token (for public endpoints)
        return config;
      }
    }
    
    // Check if token is about to expire (within 30 minutes)
    try {
      const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = tokenPayload.exp - currentTime;
      
      // If token expires within 30 minutes, refresh it proactively
      if (timeUntilExpiry < 1800) {
        console.log('Token about to expire, refreshing...');
        try {
          const refreshResponse = await axios.post(
            `${axiosClient.defaults.baseURL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          
          const newAccessToken = refreshResponse.data.data.accessToken;
          setAccessToken(newAccessToken);
          config.headers.Authorization = `Bearer ${newAccessToken}`;
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          // Continue with the old token, let the response interceptor handle the failure
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      } else {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (tokenError) {
      // If we can't parse the token, just use it as is
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors and token refresh
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const { response, config } = error;
    
    if (response) {
      switch (response.status) {
        case 401:
          // Try to refresh the token
          try {
            const refreshResponse = await axios.post(
              `${axiosClient.defaults.baseURL}/auth/refresh`,
              {},
              { withCredentials: true }
            );
            
            // Update access token
            const newAccessToken = refreshResponse.data.data.accessToken;
            setAccessToken(newAccessToken);
            
            // Retry the original request
            config.headers.Authorization = `Bearer ${newAccessToken}`;
            return axiosClient(config);
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            clearAccessToken();
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            // Only redirect if not already on login page
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            toast.error('Session expired. Please login again.');
          }
          break;
        case 403:
          toast.error('Access denied. Insufficient permissions.');
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(response.data?.message || 'An error occurred');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
