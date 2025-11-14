import React, { useState, useEffect } from 'react';
import { ContentReport, ReportType } from '../../../core/types';
import { moderationService } from '../../../services/moderationService';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Flag, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Target,
  MessageCircle,
  Grid,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportsManagementProps {
  onStatsUpdate: () => void;
}

export function ReportsManagement({ onStatsUpdate }: ReportsManagementProps) {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadReports();
  }, [statusFilter, typeFilter]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const loadedReports = await moderationService.getReports({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        reportType: typeFilter !== 'all' ? typeFilter : undefined
      });
      setReports(loadedReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Не удалось загрузить жалобы');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, resolution: 'resolved' | 'dismissed') => {
    try {
      await moderationService.resolveReport(reportId, resolution, resolutionNotes, currentUser!.id);
      await loadReports();
      onStatsUpdate();
      setSelectedReport(null);
      setResolutionNotes('');
      toast.success(`Жалоба ${resolution === 'resolved' ? 'решена' : 'отклонена'}`);
    } catch (error: any) {
      console.error('Failed to resolve report:', error);
      toast.error(error.message || 'Не удалось обработать жалобу');
    }
  };

  const getReportTypeIcon = (reportType: ReportType) => {
    switch (reportType) {
      case 'spam':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'inappropriate':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'fake':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'harassment':
        return <Flag className="w-4 h-4 text-red-600" />;
      case 'copyright':
        return <Eye className="w-4 h-4 text-blue-600" />;
      default:
        return <Flag className="w-4 h-4 text-gray-600" />;
    }
  };

  const getReportTypeLabel = (reportType: ReportType) => {
    switch (reportType) {
      case 'spam':
        return 'Спам';
      case 'inappropriate':
        return 'Неподходящий контент';
      case 'fake':
        return 'Поддельная информация';
      case 'harassment':
        return 'Домогательства';
      case 'copyright':
        return 'Авторские права';
      default:
        return 'Другое';
    }
  };

  const getTargetTypeIcon = (targetType: string) => {
    switch (targetType) {
      case 'user_profile':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'influencer_card':
        return <Grid className="w-4 h-4 text-blue-600" />;
      case 'campaign':
        return <Target className="w-4 h-4 text-green-600" />;
      case 'chat_message':
        return <MessageCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-100';
    if (priority >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Управление жалобами</h2>
          <p className="text-sm text-gray-600">Рассмотрение жалоб пользователей на контент</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Все статусы</option>
          <option value="pending">Ожидают</option>
          <option value="investigating">Расследуются</option>
          <option value="resolved">Решены</option>
          <option value="dismissed">Отклонены</option>
        </select>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ReportType | 'all')}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Все типы</option>
          <option value="spam">Спам</option>
          <option value="inappropriate">Неподходящий контент</option>
          <option value="fake">Поддельная информация</option>
          <option value="harassment">Домогательства</option>
          <option value="copyright">Авторские права</option>
          <option value="other">Другое</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка жалоб...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Жалобы не найдены</h3>
            <p className="text-gray-600">Нет жалоб, соответствующих выбранным фильтрам</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getReportTypeIcon(report.reportType)}
                    <span className="text-sm font-medium text-gray-900">
                      {getReportTypeLabel(report.reportType)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(report.priority)}`}>
                      Приоритет {report.priority}
                    </span>
                    <div className="flex items-center space-x-1">
                      {getTargetTypeIcon(report.targetType)}
                      <span className="text-xs text-gray-600">
                        {report.targetType === 'user_profile' ? 'Профиль' :
                         report.targetType === 'influencer_card' ? 'Карточка' :
                         report.targetType === 'campaign' ? 'Кампания' :
                         report.targetType === 'chat_message' ? 'Сообщение' : report.targetType}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {report.description}
                  </p>
                  
                  <div className="text-xs text-gray-500">
                    Отправлено: {new Date(report.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                
                {report.status === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Рассмотреть
                    </button>
                  </div>
                )}
                
                {report.status !== 'pending' && (
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      report.status === 'dismissed' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {report.status === 'resolved' ? 'Решено' :
                       report.status === 'dismissed' ? 'Отклонено' :
                       report.status === 'investigating' ? 'Расследуется' : report.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report Resolution Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Рассмотрение жалобы</h3>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setResolutionNotes('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Детали жалобы</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Тип:</strong> {getReportTypeLabel(selectedReport.reportType)}</div>
                    <div><strong>Цель:</strong> {selectedReport.targetType}</div>
                    <div><strong>Приоритет:</strong> {selectedReport.priority}</div>
                    <div><strong>Описание:</strong> {selectedReport.description}</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Заметки о решении
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Опишите принятое решение..."
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setResolutionNotes('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleResolveReport(selectedReport.id, 'dismissed')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Отклонить</span>
                </button>
                
                <button
                  onClick={() => handleResolveReport(selectedReport.id, 'resolved')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Решить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}