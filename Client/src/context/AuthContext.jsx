import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../api/auth.api';
import { setAccessToken, clearAccessToken, checkAndRefreshToken, getAccessToken } from '../api/axiosClient';
import { toast } from 'react-hot-toast';

const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  token: null, // Token is stored in memory, not localStorage
  isAuthenticated: false,
  isLoading: true,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        isLoading: true,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };

    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    default:
      return state;
  }
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Login function - can be called with credentials or directly with user and token
  const login = async (credentialsOrUser, token = null) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      let user, accessToken;
      
      if (token && credentialsOrUser) {
        // Called with user and token directly (from LoginPage after API call)
        user = credentialsOrUser;
        accessToken = token;
      } else {
        // Called with credentials (original behavior)
        const response = await authAPI.login(credentialsOrUser);
        
        if (response.success) {
          user = response.data.user;
          accessToken = response.data.accessToken;
        } else {
          throw new Error(response.message);
        }
      }
      
      // Store user data in localStorage (but NOT token)
      localStorage.setItem('user', JSON.stringify(user));
      // Token is stored in memory only via setAccessToken
      
      // Set token in axiosClient for API requests
      setAccessToken(accessToken);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token: accessToken },
      });
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE });
      toast.error(error.message || 'Login failed');
      return { success: false, error: error.message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START });
      
      const response = await authAPI.register(userData);
      
      if (response.success) {
        const { user, token } = response.data;
        
        // Store user data in localStorage (but NOT token)
        localStorage.setItem('user', JSON.stringify(user));
        // Token is stored in memory only via setAccessToken
        
        // Set token in axiosClient for API requests
        setAccessToken(token);
        
        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: { user, token },
        });
        
        toast.success('Registration successful!');
        return { success: true };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.REGISTER_FAILURE });
      toast.error(error.message || 'Registration failed');
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear localStorage user data and axiosClient
      localStorage.removeItem('user');
      // Token is cleared from memory via clearAccessToken
      clearAccessToken();
      
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  // Load user from localStorage on app start and refresh token
  useEffect(() => {
    const loadUser = async () => {
      console.log('=== AUTH CONTEXT LOAD USER START ===');
      const userStr = localStorage.getItem('user');
      console.log('User in localStorage:', userStr ? 'YES' : 'NO');
      
      // Check for backup token in sessionStorage
      const backupToken = sessionStorage.getItem('accessToken_backup');
      console.log('Backup token in sessionStorage:', backupToken ? 'YES' : 'NO');
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          console.log('Parsed user:', user.email || user.firstName);
          
          // First check if we have a backup token that's still valid
          if (backupToken) {
            try {
              const tokenPayload = JSON.parse(atob(backupToken.split('.')[1]));
              const currentTime = Date.now() / 1000;
              const timeUntilExpiry = tokenPayload.exp - currentTime;
              
              if (timeUntilExpiry > 60) { // Token valid for at least 1 minute
                console.log('Using backup token, expires in:', timeUntilExpiry, 'seconds');
                setAccessToken(backupToken);
                dispatch({
                  type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
                  payload: { user, token: backupToken },
                });
                return;
              } else {
                console.log('Backup token expired, will refresh');
                sessionStorage.removeItem('accessToken_backup');
              }
            } catch (tokenError) {
              console.log('Backup token invalid, will refresh');
              sessionStorage.removeItem('accessToken_backup');
            }
          }
          
          // Try to refresh token using httpOnly cookie
          console.log('Attempting to refresh token on page load...');
          const wasRefreshed = await checkAndRefreshToken();
          console.log('checkAndRefreshToken result:', wasRefreshed);
          
          if (wasRefreshed) {
            const newToken = getAccessToken();
            console.log('New token after refresh:', newToken ? 'RECEIVED' : 'NULL');
            if (newToken) {
              console.log('Token refreshed successfully on page load');
              dispatch({
                type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
                payload: { user, token: newToken },
              });
              return;
            }
          }
          
          // If refresh failed, try a direct refresh token call
          console.log('Direct token refresh attempt...');
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            console.log('Direct refresh response status:', response.status);
            const data = await response.json();
            console.log('Direct refresh response data:', data);
            
            if (response.ok && data.success && data.data?.accessToken) {
              setAccessToken(data.data.accessToken);
              console.log('Direct token refresh successful');
              dispatch({
                type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
                payload: { user, token: data.data.accessToken },
              });
              return;
            }
          } catch (directRefreshError) {
            console.error('Direct token refresh failed:', directRefreshError);
          }
          
          // If all refresh attempts failed, clear user data
          console.log('All token refresh attempts failed, clearing user data');
          localStorage.removeItem('user');
          clearAccessToken();
          dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE });
          
        } catch (error) {
          console.error('Failed to parse user from localStorage:', error);
          // Clear corrupted data
          localStorage.removeItem('user');
          clearAccessToken();
          dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE });
        }
      } else {
        // No user found, ensure token is cleared
        console.log('No user found in localStorage');
        clearAccessToken();
        dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE });
      }
      
      console.log('=== AUTH CONTEXT LOAD USER END ===');
    };

    loadUser();
  }, []);

  // Update user function
  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify({ ...state.user, ...userData }));
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData,
    });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
