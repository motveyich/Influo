import React, { useState, useEffect } from 'react';
import { PaymentRequest, PaymentStatus } from '../../../core/types';
import { paymentRequestService } from '../../../services/paymentRequestService';
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
  Eye,
  Calendar,
  User
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export function PaymentRequestsTab() {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);

  const { user } = useAuth();
  const currentUserId = user?.id || '';

  useEffect(() => {
    if (currentUserId) {
      loadPaymentRequests();
    }
  }, [currentUserId, statusFilter]);

  const loadPaymentRequests = async () => {
    try {
      setIsLoading(true);
      const requests = await paymentRequestService.getUserPaymentRequests(currentUserId);
      setPaymentRequests(requests);
    } catch (error) {
      console.error('Failed to load payment requests:', error);
      if (error?.code !== '42P01') {
        toast.error('Не удалось загрузить запросы оплаты');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: PaymentStatus) => {
    try {
      await paymentRequestService.updatePaymentStatus(requestId, newStatus, currentUserId);
      await loadPaymentRequests();
      
      const statusLabel = getStatusLabel(newStatus);
      toast.success(`Статус изменен на "${statusLabel}"`);
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error.message || 'Не удалось обновить статус');
    }
  };

  const canUpdateStatus = (request: PaymentRequest, status: PaymentStatus): boolean => {
    if (request.payeeId === currentUserId) {
      return ['confirmed', 'cancelled'].includes(status);
    }
    if (request.payerId === currentUserId) {
      return ['paying', 'paid', 'failed'].includes(status);
    }
    return false;
  };

  const getStatusIcon = (status: PaymentStatus) => {
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

  const getStatusColor = (status: PaymentStatus) => {
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

  const getStatusLabel = (status: PaymentStatus) => {
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

  const getRoleLabel = (request: PaymentRequest) => {
    if (request.payeeId === currentUserId) {
      return 'Получатель';
    } else if (request.payerId === currentUserId) {
      return 'Плательщик';
    }
    return 'Участник';
  };

  const getPaymentTypeLabel = (paymentType: string) => {
    switch (paymentType) {
      case 'full_prepay': return 'Полная предоплата';
      case 'partial_prepay_postpay': return 'Частичная предоплата';
      case 'postpay': return 'Постоплата';
      default: return paymentType;
    }
  };

  const filteredRequests = paymentRequests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = 
      typeFilter === 'all' ||
      (typeFilter === 'sent' && request.payeeId === currentUserId) ||
      (typeFilter === 'received' && request.payerId === currentUserId);
    
    return matchesStatus && matchesType;
  });

  const stats = {
    total: paymentRequests.length,
    pending: paymentRequests.filter(r => r.status === 'pending').length,
    paying: paymentRequests.filter(r => r.status === 'paying').length,
    completed: paymentRequests.filter(r => ['completed', 'confirmed'].includes(r.status)).length,
    failed: paymentRequests.filter(r => r.status === 'failed').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Запросы оплаты</h2>
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
          onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
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

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">Все типы</option>
          <option value="sent">Выставленные мной</option>
          <option value="received">Полученные мной</option>
        </select>
      </div>

      {/* Payment Requests List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка запросов оплаты...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Запросы оплаты не найдены</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter === 'all' 
              ? 'У вас пока нет запросов оплаты'
              : 'Нет запросов с выбранным статусом'
            }
          </p>
          <p className="text-sm text-blue-600">
            💡 Окна оплаты создаются через кнопку в принятых предложениях
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatCurrency(request.amount, request.currency)}
                    </h3>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(request.status)}`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(request.status)}
                        <span>{getStatusLabel(request.status)}</span>
                      </div>
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
                      {getRoleLabel(request)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>ID: {request.id.substring(0, 8)}...</span>
                    <span>Тип: {getPaymentTypeLabel(request.paymentType)}</span>
                    <span>Создано {formatDistanceToNow(parseISO(request.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
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
                  {request.paymentDetails.cardNumber && (
                    <p><strong>💳 Карта:</strong> {request.paymentDetails.cardNumber}</p>
                  )}
                  {request.paymentDetails.bankAccount && (
                    <p><strong>🏦 Счет:</strong> {request.paymentDetails.bankAccount}</p>
                  )}
                  {request.paymentDetails.paypalEmail && (
                    <p><strong>📧 PayPal:</strong> {request.paymentDetails.paypalEmail}</p>
                  )}
                  {request.paymentDetails.cryptoAddress && (
                    <p><strong>₿ Крипто:</strong> {request.paymentDetails.cryptoAddress}</p>
                  )}
                </div>
                {request.paymentDetails.instructions && (
                  <div className="mt-3">
                    <strong>📋 Инструкции:</strong>
                    <p className="mt-1 p-2 bg-white rounded border text-sm">{request.paymentDetails.instructions}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {canUpdateStatus(request, 'paying') && request.status === 'pending' && (
                  <button
                    onClick={() => handleStatusUpdate(request.id, 'paying')}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Оплачиваю
                  </button>
                )}
                
                {canUpdateStatus(request, 'paid') && ['pending', 'paying'].includes(request.status) && (
                  <button
                    onClick={() => handleStatusUpdate(request.id, 'paid')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Оплатил
                  </button>
                )}
                
                {canUpdateStatus(request, 'failed') && ['paying'].includes(request.status) && (
                  <button
                    onClick={() => handleStatusUpdate(request.id, 'failed')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Не получилось оплатить
                  </button>
                )}
                
                {canUpdateStatus(request, 'confirmed') && request.status === 'paid' && (
                  <button
                    onClick={() => handleStatusUpdate(request.id, 'confirmed')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Получено
                  </button>
                )}
                
                {request.payeeId === currentUserId && request.status === 'paid' && (
                  <button
                    onClick={() => handleStatusUpdate(request.id, 'failed')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Средства не получены
                  </button>
                )}
              </div>

              {/* Expanded Details */}
              {selectedRequest?.id === request.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">История статусов</h4>
                  <div className="space-y-2">
                    {request.statusHistory.map((history, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(history.status)}
                          <span className="text-sm text-gray-900">{getStatusLabel(history.status)}</span>
                          {history.note && (
                            <span className="text-sm text-gray-600">- {history.note}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(parseISO(history.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Important Notice */}
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-yellow-800">Важное уведомление</h5>
                        <p className="text-sm text-yellow-700">
                          Подтвердите оплату в системе после перевода средств.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}