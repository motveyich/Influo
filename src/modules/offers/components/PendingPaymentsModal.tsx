import React, { useState } from 'react';
import { PaymentRequest } from '../../../core/types';
import { paymentRequestService } from '../services/paymentRequestService';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { X, CreditCard, Building, Mail, Wallet, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PendingPaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: PaymentRequest[];
  currentUserId: string;
  onPaymentUpdated: () => void;
}

export function PendingPaymentsModal({
  isOpen,
  onClose,
  payments,
  currentUserId,
  onPaymentUpdated
}: PendingPaymentsModalProps) {
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  useBodyScrollLock(isOpen);

  const getPaymentMethodIcon = (method: string) => {
    const iconProps = { className: "w-5 h-5" };

    switch (method) {
      case 'bank_transfer':
        return <Building {...iconProps} />;
      case 'card':
        return <CreditCard {...iconProps} />;
      case 'paypal':
        return <Mail {...iconProps} />;
      case 'crypto':
        return <Wallet {...iconProps} />;
      default:
        return <CreditCard {...iconProps} />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: 'Банковский перевод',
      card: 'Банковская карта',
      paypal: 'PayPal',
      crypto: 'Криптовалюта'
    };
    return labels[method] || method;
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      prepay: 'Предоплата',
      postpay: 'Постоплата',
      full: 'Полная оплата'
    };
    return labels[type] || type;
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      setProcessingPaymentId(paymentId);
      await paymentRequestService.updatePaymentStatus(paymentId, 'paid');
      toast.success('Платеж отмечен как оплаченный');
      onPaymentUpdated();
    } catch (error: any) {
      console.error('Failed to mark payment as paid:', error);
      toast.error(error.message || 'Не удалось обновить статус платежа');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Окна оплаты
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Ожидают оплаты: {payments.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Нет ожидающих оплаты платежей
              </p>
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      {getPaymentMethodIcon(payment.paymentMethod)}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {payment.amount.toLocaleString()} {payment.currency}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getPaymentMethodLabel(payment.paymentMethod)} • {getPaymentTypeLabel(payment.paymentType)}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs font-medium rounded-full border border-yellow-200 dark:border-yellow-800">
                    Ожидает оплаты
                  </span>
                </div>

                {payment.paymentDetails && Object.keys(payment.paymentDetails).length > 0 && (
                  <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Реквизиты для оплаты:
                    </h4>
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {payment.paymentDetails.bankAccount && (
                        <p><span className="font-medium">Счет:</span> {payment.paymentDetails.bankAccount}</p>
                      )}
                      {payment.paymentDetails.cardNumber && (
                        <p><span className="font-medium">Карта:</span> {payment.paymentDetails.cardNumber}</p>
                      )}
                      {payment.paymentDetails.paypalEmail && (
                        <p><span className="font-medium">PayPal:</span> {payment.paymentDetails.paypalEmail}</p>
                      )}
                      {payment.paymentDetails.cryptoAddress && (
                        <p><span className="font-medium">Адрес:</span> {payment.paymentDetails.cryptoAddress}</p>
                      )}
                      {payment.paymentDetails.accountHolder && (
                        <p><span className="font-medium">Владелец:</span> {payment.paymentDetails.accountHolder}</p>
                      )}
                      {payment.paymentDetails.bankName && (
                        <p><span className="font-medium">Банк:</span> {payment.paymentDetails.bankName}</p>
                      )}
                    </div>
                  </div>
                )}

                {payment.instructions && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                      Инструкции по оплате:
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      {payment.instructions}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Создано {formatDistanceToNow(parseISO(payment.createdAt), { addSuffix: true, locale: ru })}
                  </p>
                  <button
                    onClick={() => handleMarkAsPaid(payment.id)}
                    disabled={processingPaymentId === payment.id}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {processingPaymentId === payment.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Обработка...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Отметить как оплаченный</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
