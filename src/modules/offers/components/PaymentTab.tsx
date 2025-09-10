import React, { useState, useEffect } from 'react';
import { PaymentWindow, PaymentWindowStatus } from '../../../core/types';
import { paymentWindowService } from '../../../services/paymentWindowService';
import { PaymentWindowModal } from './PaymentWindowModal';
import { useAuth } from '../../../hooks/useAuth';
import { 
  CreditCard, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  Edit,
  Trash2,
  Plus,
  Eye,
  Calendar,
  User
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export function PaymentTab() {
  const [paymentWindows, setPaymentWindows] = useState<PaymentWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentWindowStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWindow, setEditingWindow] = useState<PaymentWindow | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<PaymentWindow | null>(null);

  const { user } = useAuth();
  const currentUserId = user?.id || '';

  useEffect(() => {
    if (currentUserId) {
      loadPaymentWindows();
    }
  }, [currentUserId, statusFilter]);

  const loadPaymentWindows = async () => {
    try {
      setIsLoading(true);
      const windows = await paymentWindowService.getUserPaymentWindows(currentUserId);
      
      // Filter by status
      const filteredWindows = statusFilter === 'all' 
        ? windows 
        : windows.filter(w => w.status === statusFilter);
        
      setPaymentWindows(filteredWindows);
    } catch (error) {
      console.error('Failed to load payment windows:', error);
      if (error?.code !== '42P01') {
        toast.error('Не удалось загрузить окна оплаты');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (windowId: string, newStatus: PaymentWindowStatus) => {
    try {
      await paymentWindowService.updatePaymentWindowStatus(windowId, newStatus, currentUserId);
      
      // Force reload the payment windows to show updated status
      await loadPaymentWindows();
      
      const statusLabel = getStatusLabel(newStatus);
      toast.success(`Статус изменен на "${statusLabel}"`);
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error.message || 'Не удалось обновить статус');
    }
  };

  const handleEditWindow = (window: PaymentWindow) => {
    if (!canEdit(window)) {
      toast.error('Нельзя редактировать это окно оплаты');
      return;
    }
    setEditingWindow(window);
    setShowCreateModal(true);
  };

  const handleCancelWindow = async (windowId: string) => {
    if (!confirm('Вы уверены, что хотите отменить это окно оплаты?')) return;

    try {
      await paymentWindowService.updatePaymentWindowStatus(windowId, 'cancelled', currentUserId, 'Окно отменено создателем');
      await loadPaymentWindows();
      toast.success('Окно оплаты отменено');
    } catch (error: any) {
      console.error('Failed to cancel window:', error);
      toast.error(error.message || 'Не удалось отменить окно');
    }
  };

  const canEdit = (window: PaymentWindow): boolean => {
    return window.payeeId === currentUserId && window.isEditable && ['pending', 'failed'].includes(window.status);
  };

  const canCancel = (window: PaymentWindow): boolean => {
    return window.payeeId === currentUserId && ['pending', 'failed'].includes(window.status);
  };

  const canUpdateStatus = (window: PaymentWindow, status: PaymentWindowStatus): boolean => {
    if (window.payeeId === currentUserId) {
      return ['confirmed', 'cancelled'].includes(status);
    }
    if (window.payerId === currentUserId) {
      return ['paying', 'paid', 'failed'].includes(status);
    }
    return false;
  };

  const getStatusIcon = (status: PaymentWindowStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'paying': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-purple-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PaymentWindowStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paying': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: PaymentWindowStatus) => {
    switch (status) {
      case 'pending': return 'Ожидает оплаты';
      case 'paying': return 'Оплачиваю';
      case 'paid': return 'Оплачено';
      case 'failed': return 'Не получилось оплатить';
      case 'confirmed': return 'Получено';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRoleLabel = (window: PaymentWindow) => {
    if (window.payeeId === currentUserId) {
      return 'Получатель';
    } else if (window.payerId === currentUserId) {
      return 'Плательщик';
    }
    return 'Участник';
  };

  const getPaymentTypeLabel = (paymentType: string) => {
    switch (paymentType) {
      case 'full_prepay':
        return 'Полная предоплата';
      case 'partial_prepay_postpay':
        return 'Частичная предоплата';
      case 'postpay':
        return 'Постоплата';
      default:
        return paymentType;
    }
  };

  const stats = {
    total: paymentWindows.length,
    pending: paymentWindows.filter(w => w.status === 'pending').length,
    paying: paymentWindows.filter(w => w.status === 'paying').length,
    completed: paymentWindows.filter(w => ['completed', 'confirmed'].includes(w.status)).length,
    failed: paymentWindows.filter(w => w.status === 'failed').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Оплаты</h2>
          <p className="text-sm text-gray-600">История выставленных и полученных окон оплаты</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">Всего</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">Ожидают</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.pending}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">В процессе</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.paying}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">Завершены</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.completed}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="ml-2 text-sm font-medium text-gray-600">Неудачные</span>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.failed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PaymentWindowStatus | 'all')}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">Все статусы</option>
          <option value="pending">Ожидают оплаты</option>
          <option value="paying">Оплачиваю</option>
          <option value="paid">Оплачено</option>
          <option value="failed">Неудачные</option>
          <option value="confirmed">Подтверждены</option>
          <option value="completed">Завершены</option>
          <option value="cancelled">Отменены</option>
        </select>
      </div>

      {/* Payment Windows List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка окон оплаты...</p>
        </div>
      ) : paymentWindows.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Окна оплаты не найдены</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter === 'all' 
              ? 'У вас пока нет окон оплаты'
              : 'Нет окон с выбранным статусом'
            }
          </p>
          <p className="text-sm text-blue-600">
            💡 Окна оплаты создаются через кнопку "Окно оплаты" в принятых предложениях
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentWindows.map((window) => (
            <div key={window.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatCurrency(window.amount, window.currency)}
                    </h3>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(window.status)}`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(window.status)}
                        <span>{getStatusLabel(window.status)}</span>
                      </div>
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
                      {getRoleLabel(window)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>ID: {window.id.substring(0, 8)}...</span>
                    <span>Тип: {getPaymentTypeLabel(window.paymentType)}</span>
                    <span>Создано {formatDistanceToNow(parseISO(window.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {canEdit(window) && (
                    <button
                      onClick={() => handleEditWindow(window)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Редактировать"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  
                  {canCancel(window) && (
                    <button
                      onClick={() => handleCancelWindow(window.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Отменить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => setSelectedWindow(selectedWindow?.id === window.id ? null : window)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                    title="Подробности"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Payment Details Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Реквизиты для оплаты:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                  {window.paymentDetails.cardNumber && (
                    <p><strong>💳 Карта:</strong> {window.paymentDetails.cardNumber}</p>
                  )}
                  {window.paymentDetails.bankAccount && (
                    <p><strong>🏦 Счет:</strong> {window.paymentDetails.bankAccount}</p>
                  )}
                  {window.paymentDetails.paypalEmail && (
                    <p><strong>📧 PayPal:</strong> {window.paymentDetails.paypalEmail}</p>
                  )}
                  {window.paymentDetails.cryptoAddress && (
                    <p><strong>₿ Крипто:</strong> {window.paymentDetails.cryptoAddress}</p>
                  )}
                </div>
                {window.paymentDetails.instructions && (
                  <div className="mt-3">
                    <strong>📋 Инструкции:</strong>
                    <p className="mt-1 p-2 bg-white rounded border text-sm">{window.paymentDetails.instructions}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {canUpdateStatus(window, 'paying') && window.status === 'pending' && (
                  <button
                    onClick={() => handleStatusUpdate(window.id, 'paying')}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Оплачиваю
                  </button>
                )}
                
                {canUpdateStatus(window, 'paid') && ['pending', 'paying'].includes(window.status) && (
                  <button
                    onClick={() => handleStatusUpdate(window.id, 'paid')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Оплатил
                  </button>
                )}
                
                {canUpdateStatus(window, 'failed') && ['paying'].includes(window.status) && (
                  <button
                    onClick={() => handleStatusUpdate(window.id, 'failed')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Не получилось оплатить
                  </button>
                )}
                
                {canUpdateStatus(window, 'confirmed') && window.status === 'paid' && (
                  <button
                    onClick={() => handleStatusUpdate(window.id, 'confirmed')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Получено
                  </button>
                )}
                
                {window.payeeId === currentUserId && window.status === 'paid' && (
                  <button
                    onClick={() => handleStatusUpdate(window.id, 'failed')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Средства не получены
                  </button>
                )}
              </div>

              {/* Expanded Details */}
              {selectedWindow?.id === window.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">История статусов</h4>
                  <div className="space-y-2">
                    {window.statusHistory.map((history, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(history.status)}
                          <span className="text-sm text-gray-900">{getStatusLabel(history.status)}</span>
                          {history.note && (
                          <strong>📋 Инструкции:</strong>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(parseISO(history.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Window Modal */}
      <PaymentWindowModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingWindow(null);
        }}
        payerId="" // Will be set based on context
        payeeId={currentUserId}
        currentWindow={editingWindow}
        onWindowCreated={(window) => {
          setShowCreateModal(false);
          setEditingWindow(null);
          loadPaymentWindows();
        }}
      />
    </div>
  );
}