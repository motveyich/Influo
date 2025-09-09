import React, { useState, useEffect } from 'react';
import { Deal, PaymentType, dealService } from '../../../services/dealService';
import { X, CreditCard, Calendar, CheckCircle, AlertCircle, DollarSign, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal?: Deal;
  offerId?: string;
  applicationId?: string;
  payerId: string;
  payeeId: string;
  totalAmount: number;
  currency?: string;
  onDealCreated?: (deal: Deal) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  deal,
  offerId,
  applicationId,
  payerId,
  payeeId,
  totalAmount,
  currency = 'USD',
  onDealCreated
}: PaymentModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentType, setPaymentType] = useState<PaymentType>('full_prepay');
  const [prepayPercentage, setPrepayPercentage] = useState(50);
  const [paymentDetails, setPaymentDetails] = useState({
    bankAccount: '',
    cardNumber: '',
    paypalEmail: '',
    cryptoAddress: '',
    instructions: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentDeal, setCurrentDeal] = useState<Deal | null>(deal || null);

  useEffect(() => {
    if (deal) {
      setCurrentDeal(deal);
      setPaymentType(deal.paymentType);
      setPaymentDetails(deal.paymentDetails as any);
    }
  }, [deal]);

  const handleCreateDeal = async () => {
    if (!paymentDetails.instructions.trim()) {
      toast.error('Добавьте инструкции по оплате');
      return;
    }

    setIsLoading(true);
    try {
      const newDeal = await dealService.createDeal({
        offerId,
        applicationId,
        payerId,
        payeeId,
        totalAmount,
        currency,
        paymentType,
        prepayAmount: paymentType === 'partial_prepay_postpay' ? Math.round(totalAmount * (prepayPercentage / 100)) : 
                      paymentType === 'full_prepay' ? totalAmount : 0,
        postpayAmount: paymentType === 'partial_prepay_postpay' ? totalAmount - Math.round(totalAmount * (prepayPercentage / 100)) :
                       paymentType === 'postpay' ? totalAmount : 0,
        paymentDetails,
        workDetails: {}
      });

      const configuredDeal = await dealService.configureDealPayment(
        newDeal.id,
        paymentType,
        paymentDetails,
        prepayPercentage
      );

      setCurrentDeal(configuredDeal);
      onDealCreated?.(configuredDeal);
      toast.success('Сделка создана! Ожидание подтверждения оплаты.');
      setCurrentStep(2);
    } catch (error: any) {
      console.error('Failed to create deal:', error);
      toast.error(error.message || 'Не удалось создать сделку');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentConfirmation = async (stage: 'prepay' | 'postpay', type: 'payment_sent' | 'payment_received') => {
    if (!currentDeal) return;

    setIsLoading(true);
    try {
      const confirmedDeal = await dealService.confirmPayment(
        currentDeal.id,
        stage,
        type,
        payerId, // Assuming current user is payer for this demo
        { confirmed_at: new Date().toISOString() }
      );

      setCurrentDeal(confirmedDeal);
      toast.success(`${type === 'payment_sent' ? 'Оплата отправлена' : 'Получение оплаты подтверждено'}!`);
      
      // Check if we should move to next step
      if (stage === 'prepay' && confirmedDeal.prepayConfirmedByPayer && confirmedDeal.prepayConfirmedByPayee) {
        setCurrentStep(3);
      } else if (stage === 'postpay' && confirmedDeal.postpayConfirmedByPayer && confirmedDeal.postpayConfirmedByPayee) {
        setCurrentStep(4);
      }
    } catch (error: any) {
      console.error('Failed to confirm payment:', error);
      toast.error(error.message || 'Не удалось подтвердить оплату');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentTypeLabel = (type: PaymentType) => {
    switch (type) {
      case 'full_prepay':
        return 'Полная предоплата';
      case 'partial_prepay_postpay':
        return 'Частичная предоплата + постоплата';
      case 'postpay':
        return 'Постоплата';
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Настройка оплаты';
      case 2:
        return paymentType === 'postpay' ? 'Выполнение работы' : 'Подтверждение предоплаты';
      case 3:
        return 'Выполнение работы';
      case 4:
        return 'Завершение сделки';
      default:
        return 'Оплата';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
            <p className="text-sm text-gray-600">
              Сумма сделки: {formatCurrency(totalAmount)}
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
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Step 1: Payment Configuration */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Выберите тип оплаты</h3>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      value="full_prepay"
                      checked={paymentType === 'full_prepay'}
                      onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                      className="mt-1"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">Полная предоплата</h4>
                      <p className="text-sm text-gray-600">Полная оплата {formatCurrency(totalAmount)} до начала работы</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      value="partial_prepay_postpay"
                      checked={paymentType === 'partial_prepay_postpay'}
                      onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Частичная предоплата + постоплата</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Предоплата {formatCurrency(totalAmount * (prepayPercentage / 100))}, 
                        постоплата {formatCurrency(totalAmount - (totalAmount * (prepayPercentage / 100)))}
                      </p>
                      {paymentType === 'partial_prepay_postpay' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Предоплата: {prepayPercentage}%
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            step="10"
                            value={prepayPercentage}
                            onChange={(e) => setPrepayPercentage(parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      value="postpay"
                      checked={paymentType === 'postpay'}
                      onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                      className="mt-1"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">Постоплата</h4>
                      <p className="text-sm text-gray-600">Оплата {formatCurrency(totalAmount)} после выполнения работы</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Реквизиты для оплаты</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Номер карты
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.cardNumber}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Банковский счет
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.bankAccount}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, bankAccount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Номер счета"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PayPal Email
                    </label>
                    <input
                      type="email"
                      value={paymentDetails.paypalEmail}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, paypalEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="email@paypal.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Инструкции по оплате *
                    </label>
                    <textarea
                      value={paymentDetails.instructions}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, instructions: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Подробные инструкции по оплате, комментарии, дедлайны..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Payment Confirmation */}
          {currentStep === 2 && currentDeal && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-blue-900">
                      {currentDeal.paymentType === 'postpay' ? 'Ожидание выполнения работы' : 'Подтверждение предоплаты'}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {currentDeal.paymentType === 'postpay' 
                        ? `Сумма к оплате после работы: ${formatCurrency(currentDeal.postpayAmount)}`
                        : `Сумма к предоплате: ${formatCurrency(currentDeal.prepayAmount)}`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {currentDeal.paymentType !== 'postpay' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Реквизиты для оплаты</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      {currentDeal.paymentDetails.cardNumber && (
                        <p><strong>Карта:</strong> {currentDeal.paymentDetails.cardNumber}</p>
                      )}
                      {currentDeal.paymentDetails.bankAccount && (
                        <p><strong>Счет:</strong> {currentDeal.paymentDetails.bankAccount}</p>
                      )}
                      {currentDeal.paymentDetails.paypalEmail && (
                        <p><strong>PayPal:</strong> {currentDeal.paymentDetails.paypalEmail}</p>
                      )}
                      <p><strong>Инструкции:</strong> {currentDeal.paymentDetails.instructions}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handlePaymentConfirmation('prepay', 'payment_sent')}
                      disabled={isLoading || currentDeal.prepayConfirmedByPayer}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        currentDeal.prepayConfirmedByPayer
                          ? 'border-green-500 bg-green-50 cursor-not-allowed'
                          : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-center">
                        {currentDeal.prepayConfirmedByPayer ? (
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        ) : (
                          <CreditCard className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        )}
                        <h4 className="font-medium text-gray-900">
                          {currentDeal.prepayConfirmedByPayer ? 'Оплачено' : 'Я оплатил'}
                        </h4>
                        <p className="text-sm text-gray-600">Подтвердить отправку оплаты</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handlePaymentConfirmation('prepay', 'payment_received')}
                      disabled={isLoading || currentDeal.prepayConfirmedByPayee}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        currentDeal.prepayConfirmedByPayee
                          ? 'border-green-500 bg-green-50 cursor-not-allowed'
                          : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'
                      }`}
                    >
                      <div className="text-center">
                        {currentDeal.prepayConfirmedByPayee ? (
                          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        ) : (
                          <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        )}
                        <h4 className="font-medium text-gray-900">
                          {currentDeal.prepayConfirmedByPayee ? 'Получено' : 'Я получил'}
                        </h4>
                        <p className="text-sm text-gray-600">Подтвердить получение оплаты</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {currentDeal.paymentType === 'postpay' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-6 h-6 text-yellow-600" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Ожидание выполнения работы</h4>
                      <p className="text-sm text-yellow-700">
                        Оплата произойдет после завершения всех условий сделки.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Work in Progress */}
          {currentStep === 3 && currentDeal && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-900">Предоплата подтверждена</h3>
                    <p className="text-sm text-green-700">Можно приступать к выполнению работы</p>
                  </div>
                </div>
              </div>

              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Работа в процессе</h3>
                <p className="text-gray-600">
                  Следите за выполнением условий сделки через чат.
                  {currentDeal.paymentType === 'partial_prepay_postpay' && (
                    <span className="block mt-2">
                      После завершения потребуется постоплата: {formatCurrency(currentDeal.postpayAmount)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Deal Completion */}
          {currentStep === 4 && currentDeal && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                  <div>
                    <h3 className="font-medium text-purple-900">Сделка завершена!</h3>
                    <p className="text-sm text-purple-700">Обе стороны могут оставить отзыв</p>
                  </div>
                </div>
              </div>

              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Поздравляем с успешной сделкой!</h3>
                <p className="text-gray-600 mb-6">
                  Сделка на сумму {formatCurrency(currentDeal.totalAmount)} успешно завершена.
                </p>
                
                <div className="flex space-x-3 justify-center">
                  <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition-colors">
                    Оставить отзыв
                  </button>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
                    Перейти в чат
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          {currentStep === 1 ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateDeal}
                disabled={isLoading || !paymentDetails.instructions.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4" />
                <span>{isLoading ? 'Создание...' : 'Создать сделку'}</span>
              </button>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-600">
                ID сделки: {currentDeal?.id.substring(0, 8)}...
              </div>
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Закрыть
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}