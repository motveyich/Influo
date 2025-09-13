import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { AdminRoute } from '../../../components/AdminRoute';
import { UsersManagement } from './UsersManagement';
import { CampaignsManagement } from './CampaignsManagement';
import { ModerationQueue } from './ModerationQueue';
import { ReportsManagement } from './ReportsManagement';
import { AdminLogs } from './AdminLogs';
import { ContentManagement } from './ContentManagement';
import { 
  Users, 
  Target, 
  Flag, 
  Shield, 
  BarChart3, 
  Settings,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { moderationService } from '../../../services/moderationService';

type AdminTab = 'users' | 'campaigns' | 'moderation' | 'reports' | 'logs' | 'content' | 'settings';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCampaigns: 0,
    pendingReports: 0,
    moderationQueue: 0,
    todayActions: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const { user, userRole } = useAuth();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      
      // Load basic stats
      const [users, campaigns, reports, queue, logs] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllCampaigns(),
        moderationService.getReports({ status: 'pending' }),
        moderationService.getModerationQueue({ status: 'pending' }),
        adminService.getAdminLogs({ limit: 100 })
      ]);

      // Calculate today's actions
      const today = new Date().toISOString().split('T')[0];
      const todayActions = logs.filter(log => 
        log.createdAt.startsWith(today)
      ).length;

      setStats({
        totalUsers: users.length,
        totalCampaigns: campaigns.length,
        pendingReports: reports.length,
        moderationQueue: queue.length,
        todayActions
      });
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'users', label: 'Пользователи', icon: Users, count: stats.totalUsers },
    { id: 'campaigns', label: 'Кампании', icon: Target, count: stats.totalCampaigns },
    { id: 'moderation', label: 'Модерация', icon: Shield, count: stats.moderationQueue },
    { id: 'reports', label: 'Жалобы', icon: Flag, count: stats.pendingReports },
    { id: 'logs', label: 'Логи', icon: BarChart3, count: stats.todayActions },
    { id: 'content', label: 'Контент', icon: Bell, count: 0 },
    { id: 'settings', label: 'Настройки', icon: Settings, count: 0 }
  ];

  return (
    <AdminRoute requiredRole="moderator">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Админ-панель</h1>
                  <p className="text-sm text-gray-600">
                    Роль: {userRole === 'admin' ? 'Администратор' : 'Модератор'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {user?.email}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="ml-2 text-sm font-medium text-gray-600">Пользователи</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Target className="w-5 h-5 text-green-600" />
                <span className="ml-2 text-sm font-medium text-gray-600">Кампании</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalCampaigns}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Flag className="w-5 h-5 text-red-600" />
                <span className="ml-2 text-sm font-medium text-gray-600">Жалобы</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.pendingReports}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="ml-2 text-sm font-medium text-gray-600">На модерации</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.moderationQueue}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <span className="ml-2 text-sm font-medium text-gray-600">Действий сегодня</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.todayActions}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as AdminTab)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          activeTab === tab.id
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'users' && <UsersManagement onStatsUpdate={loadStats} />}
              {activeTab === 'campaigns' && <CampaignsManagement onStatsUpdate={loadStats} />}
              {activeTab === 'moderation' && <ModerationQueue onStatsUpdate={loadStats} />}
              {activeTab === 'reports' && <ReportsManagement onStatsUpdate={loadStats} />}
              {activeTab === 'logs' && <AdminLogs />}
              {activeTab === 'content' && <ContentManagement onStatsUpdate={loadStats} />}
              {activeTab === 'settings' && (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Настройки</h3>
                  <p className="text-gray-600">Настройки администратора будут доступны в следующем обновлении</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}