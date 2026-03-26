import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userAPI } from '../../api/user.api';

// Async thunks
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      // In a real app, you'd have a dedicated dashboard API endpoint
      // For now, we'll fetch user data and mock other data
      const response = await userAPI.getCurrentUser();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard data');
    }
  }
);

export const fetchPayrollStats = createAsyncThunk(
  'dashboard/fetchPayrollStats',
  async (_, { rejectWithValue }) => {
    try {
      // Mock API call - replace with actual endpoint
      const mockStats = {
        totalEmployees: 248,
        monthlyPayroll: 124500,
        departments: 12,
        efficiencyRate: 94.2,
      };
      return mockStats;
    } catch (error) {
      return rejectWithValue('Failed to fetch payroll statistics');
    }
  }
);

export const fetchRecentActivities = createAsyncThunk(
  'dashboard/fetchRecentActivities',
  async (_, { rejectWithValue }) => {
    try {
      // Mock API call - replace with actual endpoint
      const mockActivities = [
        {
          id: 1,
          user: 'John Doe',
          action: 'Processed payroll for Engineering department',
          time: '2 hours ago',
          type: 'payroll',
        },
        {
          id: 2,
          user: 'Jane Smith',
          action: 'Added new employee: Sarah Johnson',
          time: '4 hours ago',
          type: 'employee',
        },
        {
          id: 3,
          user: 'Mike Wilson',
          action: 'Updated salary for 5 employees',
          time: '6 hours ago',
          type: 'update',
        },
        {
          id: 4,
          user: 'Emily Brown',
          action: 'Generated monthly reports',
          time: '1 day ago',
          type: 'report',
        },
      ];
      return mockActivities;
    } catch (error) {
      return rejectWithValue('Failed to fetch recent activities');
    }
  }
);

const initialState = {
  user: null,
  stats: {
    totalEmployees: 0,
    monthlyPayroll: 0,
    departments: 0,
    efficiencyRate: 0,
  },
  recentActivities: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUserProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    addActivity: (state, action) => {
      state.recentActivities.unshift(action.payload);
      // Keep only last 10 activities
      if (state.recentActivities.length > 10) {
        state.recentActivities = state.recentActivities.slice(0, 10);
      }
    },
    updateStats: (state, action) => {
      state.stats = { ...state.stats, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchDashboardData
      .addCase(fetchDashboardData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // fetchPayrollStats
      .addCase(fetchPayrollStats.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchPayrollStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchPayrollStats.rejected, (state, action) => {
        state.error = action.payload;
      })
      // fetchRecentActivities
      .addCase(fetchRecentActivities.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchRecentActivities.fulfilled, (state, action) => {
        state.recentActivities = action.payload;
      })
      .addCase(fetchRecentActivities.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  updateUserProfile,
  addActivity,
  updateStats,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;

// Selectors
export const selectDashboard = (state) => state.dashboard;
export const selectDashboardUser = (state) => state.dashboard.user;
export const selectDashboardStats = (state) => state.dashboard.stats;
export const selectRecentActivities = (state) => state.dashboard.recentActivities;
export const selectDashboardLoading = (state) => state.dashboard.isLoading;
export const selectDashboardError = (state) => state.dashboard.error;
export const selectLastUpdated = (state) => state.dashboard.lastUpdated;
