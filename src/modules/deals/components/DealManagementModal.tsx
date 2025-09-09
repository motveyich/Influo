import React, { useState } from 'react';
import { Deal } from '../../../services/dealService';
import { X, CheckCircle, XCircle, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface DealManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: Deal | null;
  currentUserId: string;
  onStatusUpdated?: () => void;
  onCreatePayment?: () => void;
}

export function DealManagementModal({
  isOpen,
  onClose,
  deal,
  currentUserId,
  onStatusUpdated,
  onCreatePayment
}: DealManagementModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'complete' | 'terminate' | null>(null);

  if (!isOpen || !deal) return null;

  const handleCompleteDeal = async () => {
    if (!deal) return;
    
    setIsLoading(true);
    try {
      const { dealService } = await import('../../../services/dealService');
      
      // Mark work as completed
      await dealService.markWorkCompleted(deal.id, currentUserId, {
        completed_by: currentUserId,
        completed_at: new Date().toISOString(),
        completion_notes: 'Работа выполнена согласно условиям сделки'
      });

      toast.success('Сотрудничество отмечено как завершенное!');
      onStatusUpdated?.();
      setConfirmAction(null);
    } catch (error: any) {
      console.error('Failed to complete deal:', error);
      toast.error(error.message || 'Не удалось завершить сотрудничество');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateDeal = async () => {
    if (!deal) return;
    
    setIsLoading(true);
    try {
      const { dealService } = await import('../../../services/dealService');
      
      // Update deal status to cancelled
      await dealService.updateDealStatus(deal.id, 'cancelled', {
        cancelled_by: currentUserId,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Расторжение по инициативе пользователя'
      });

      toast.success('Сотрудничество расторгнуто');
      onStatusUpdated?.();
      setConfirmAction(null);
    } catch (error: any) {
      console.error('Failed to terminate deal:', error);
      toast.error(error.message || 'Не удалось расторгнуть сотрудничество');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: deal.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDealStatusInfo = () => {
    switch (deal.dealStatus) {
      case 'created':
        return { color: 'bg-gray-100 text-gray-800', label: 'Создана', icon: <Clock className="w-4 h-4" /> };
      case 'payment_configured':
        return { color: 'bg-blue-100 text-blue-800', label: 'Настройка оплаты', icon: <DollarSign className="w-4 h-4" /> };
      case 'prepay_pending':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Ожидание предоплаты', icon: <Clock className="w-4 h-4" /> };
      case 'prepay_confirmed':
      case 'work_in_progress':
        return { color: 'bg-purple-100 text-purple-800', label: 'Работа в процессе', icon: <Clock className="w-4 h-4" /> };
      case 'work_completed':
        return { color: 'bg-green-100 text-green-800', label: 'Работа завершена', icon: <CheckCircle className="w-4 h-4" /> };
      case 'postpay_pending':
        return { color: 'bg-orange-100 text-orange-800', label: 'Ожидание постоплаты', icon: <DollarSign className="w-4 h-4" /> };
      case 'completed':
        return { color: 'bg-green-100 text-green-800', label: 'Завершена', icon: <CheckCircle className="w-4 h-4" /> };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', label: 'Расторгнута', icon: <XCircle className="w-4 h-4" /> };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: deal.dealStatus, icon: <Clock className="w-4 h-4" /> };
    }
  };

  const canCompleteDeal = () => {
    return ['work_in_progress', 'prepay_confirmed'].includes(deal.dealStatus);
  };

  const canTerminateDeal = () => {
    return !['completed', 'cancelled'].includes(deal.dealStatus);
  };

  const canCreatePaymentWindow = () => {
    return deal.dealStatus === 'created' || deal.dealStatus === 'work_completed';
  };

  const statusInfo = getDealStatusInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Управление сделкой</h2>
            <p className="text-sm text-gray-600">
              Сумма: {formatCurrency(deal.totalAmount)} • ID: {deal.id.substring(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Текущий статус сделки</h3>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-2 rounded-full text-sm font-medium ${statusInfo.color} flex items-center space-x-2`}>
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prepay Status */}
            {deal.prepayAmount > 0 && (
              <div className={`p-4 rounded-lg border ${
                deal.prepayConfirmedByPayer && deal.prepayConfirmedByPayee
                  ? 'border-green-200 bg-green-50'
                  : 'border-yellow-200 bg-yellow-50'
              }`}>
                <h4 className="font-medium text-gray-900 mb-2">
                  Предоплата ({formatCurrency(deal.prepayAmount)})
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Плательщик подтвердил:</span>
                    {deal.prepayConfirmedByPayer ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Получатель подтвердил:</span>
                    {deal.prepayConfirmedByPayee ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Postpay Status */}
            {deal.postpayAmount > 0 && (
              <div className={`p-4 rounded-lg border ${
                deal.postpayConfirmedByPayer && deal.postpayConfirmedByPayee
                  ? 'border-green-200 bg-green-50'
                  : 'border-yellow-200 bg-yellow-50'
              }`}>
                <h4 className="font-medium text-gray-900 mb-2">
                  Постоплата ({formatCurrency(deal.postpayAmount)})
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Плательщик подтвердил:</span>
                    {deal.postpayConfirmedByPayer ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Получатель подтвердил:</span>
                    {deal.postpayConfirmedByPayee ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Action */}
          {confirmAction === 'complete' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800">Подтвердите завершение сотрудничества</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Вы уверены, что все условия сделки выполнены и готовы завершить сотрудничество?
                  </p>
                  <div className="flex space-x-3 mt-3">
                    <button
                      onClick={handleCompleteDeal}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                      Да, завершить
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {confirmAction === 'terminate' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800">Подтвердите расторжение сотрудничества</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Вы уверены, что хотите расторгнуть сделку? Это действие нельзя будет отменить.
                  </p>
                  <div className="flex space-x-3 mt-3">
                    <button
                      onClick={handleTerminateDeal}
                      disabled={isLoading}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                      Да, расторгнуть
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Закрыть
          </button>
          
          <div className="flex space-x-3">
            {/* Create Payment Window */}
            {canCreatePaymentWindow() && (
              <button
                onClick={onCreatePayment}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <DollarSign className="w-4 h-4" />
                <span>Создать окно оплаты</span>
              </button>
            )}

            {/* Complete Deal */}
            {canCompleteDeal() && confirmAction !== 'complete' && (
              <button
                onClick={() => setConfirmAction('complete')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Завершить сотрудничество</span>
              </button>
            )}

            {/* Terminate Deal */}
            {canTerminateDeal() && confirmAction !== 'terminate' && (
              <button
                onClick={() => setConfirmAction('terminate')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Расторгнуть сотрудничество</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}