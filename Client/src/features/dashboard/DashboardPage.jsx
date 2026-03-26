import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart3, Users, DollarSign, TrendingUp } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();

  // Mock data - replace with actual API calls
  const stats = [
    {
      title: 'Total Employees',
      value: '248',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'blue',
    },
    {
      title: 'Monthly Payroll',
      value: '$124,500',
      change: '+8%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'green',
    },
    {
      title: 'Departments',
      value: '12',
      change: '+2',
      changeType: 'positive',
      icon: BarChart3,
      color: 'purple',
    },
    {
      title: 'Efficiency Rate',
      value: '94.2%',
      change: '+1.2%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'orange',
    },
  ];

  const recentActivities = [
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

  const getActivityIcon = (type) => {
    switch (type) {
      case 'payroll':
        return '💰';
      case 'employee':
        return '👤';
      case 'update':
        return '✏️';
      case 'report':
        return '📊';
      default:
        return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">
                Welcome back, {user?.firstName || 'User'}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      <span
                        className={`text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">from last month</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Recent Activities</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 text-2xl">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{activity.user}</span>{' '}
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                    <div className="font-medium">Process Payroll</div>
                    <div className="text-sm opacity-75">Run monthly payroll</div>
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
                    <div className="font-medium">Add Employee</div>
                    <div className="text-sm opacity-75">Onboard new staff</div>
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors">
                    <div className="font-medium">Generate Reports</div>
                    <div className="text-sm opacity-75">View analytics</div>
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors">
                    <div className="font-medium">Manage Settings</div>
                    <div className="text-sm opacity-75">System configuration</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
