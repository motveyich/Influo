import React, { useState, useEffect } from 'react';
import { AdminLog } from '../../../core/types';
import { adminService } from '../../../services/adminService';
import { 
  BarChart3, 
  Filter, 
  Calendar,
  User,
  Shield,
  Target,
  Trash2,
  Eye,
  Settings
} from 'lucide-react';

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const loadedLogs = await adminService.getAdminLogs({
        actionType: actionFilter !== 'all' ? actionFilter : undefined,
        limit: 100
      });
      setLogs(loadedLogs);
    } catch (error) {
      console.error('Failed to load admin logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'user_deleted':
      case 'campaign_deleted':
      case 'influencer_card_deleted':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'role_assigned':
      case 'role_removed':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'content_moderated':
        return <Eye className="w-4 h-4 text-purple-600" />;
      case 'report_resolved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Settings className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'user_deleted':
        return 'Удаление пользователя';
      case 'user_restored':
        return 'Восстановление пользователя';
      case 'campaign_deleted':
        return 'Удаление кампании';
      case 'influencer_card_deleted':
        return 'Удаление карточки';
      case 'role_assigned':
        return 'Назначение роли';
      case 'role_removed':
        return 'Удаление роли';
      case 'content_moderated':
        return 'Модерация контента';
      case 'report_resolved':
        return 'Решение жалобы';
      default:
        return actionType;
    }
  };

  const formatDetails = (details: Record<string, any>) => {
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Логи действий</h2>
          <p className="text-sm text-gray-600">История действий администраторов и модераторов</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">Все действия</option>
          <option value="user_deleted">Удаление пользователей</option>
          <option value="campaign_deleted">Удаление кампаний</option>
          <option value="role_assigned">Назначение ролей</option>
          <option value="content_moderated">Модерация контента</option>
          <option value="report_resolved">Решение жалоб</option>
          <option value="update_created">Создание обновлений</option>
          <option value="event_created">Создание событий</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка логов...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действие
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Администратор
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Цель
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Детали
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Время
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.actionType)}
                        <span className="text-sm font-medium text-gray-900">
                          {getActionLabel(log.actionType)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.adminId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.targetType && log.targetId ? `${log.targetType}: ${log.targetId.substring(0, 8)}...` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {formatDetails(log.details)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && logs.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Логи не найдены</h3>
            <p className="text-gray-600">Нет записей, соответствующих выбранным фильтрам</p>
          </div>
        )}
      </div>
    </div>
  );
}