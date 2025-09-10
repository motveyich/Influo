import React, { useState, useEffect } from 'react';
import { PaymentWindow, PaymentWindowType } from '../../../core/types';
import { paymentWindowService } from '../../../services/paymentWindowService';
import { X, Save, AlertCircle, DollarSign, CreditCard, Banknote, Smartphone, Bitcoin } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  payerId: string;
  payeeId: string;
  offerId?: string;
  applicationId?: string;
  dealId?: string;
  initialAmount?: number;
  currentWindow?: PaymentWindow | null;
  onWindowCreated?: (window: PaymentWindow) => void;
}

export function PaymentWindowModal({
  isOpen,
  onClose,
  payerId,
  payeeId,
  offerId,
  applicationId,
  dealId,
  initialAmount = 0,
  currentWindow,
  onWindowCreated
}: PaymentWindowModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    amount: initialAmount,
    currency: 'USD',
    paymentType: 'full_prepay' as PaymentWindowType,
    paymentStage: 'prepay' as 'prepay' | 'postpay',
    paymentDetails: {
      bankAccount: '',
      cardNumber: '',
      paypalEmail: '',
      cryptoAddress: '',
      instructions: ''
    }
  });

  useEffect(() => {
    if (currentWindow) {
      setFormData({
        amount: currentWindow.amount,
        currency: currentWindow.currency,
        paymentType: currentWindow.paymentType,
        paymentStage: currentWindow.paymentStage,
        paymentDetails: currentWindow.paymentDetails
      });
    } else {
      setFormData({
        amount: initialAmount,
        currency: 'USD',
        paymentType: 'full_prepay',
        paymentStage: 'prepay',
        paymentDetails: {
          bankAccount: '',
          cardNumber: '',
          paypalEmail: '',
          cryptoAddress: '',
          instructions: ''
        }
      });
    }
    setErrors({});
  }, [currentWindow, initialAmount, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Укажите корректную сумму';
    }

    if (!formData.paymentDetails.instructions.trim()) {
      newErrors.instructions = 'Инструкции по оплате обязательны';
    }

    // At least one payment method should be provided
    const hasPaymentMethod = 
      formData.paymentDetails.bankAccount.trim() ||
      formData.paymentDetails.cardNumber.trim() ||
      formData.paymentDetails.paypalEmail.trim() ||
      formData.paymentDetails.cryptoAddress.trim();

    if (!hasPaymentMethod) {
      newErrors.paymentMethod = 'Укажите хотя бы один способ оплаты';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки перед сохранением');
      return;
    }

    setIsLoading(true);
    try {
      const windowData: Partial<PaymentWindow> = {
        dealId,
        offerId,
        applicationId,
        payerId,
        payeeId,
        ...formData
      };

      let savedWindow: PaymentWindow;
      
      if (currentWindow) {
        savedWindow = await paymentWindowService.updatePaymentWindow(
          currentWindow.id,
          windowData,
          payeeId
        );
        toast.success('Окно оплаты обновлено!');
      } else {
        savedWindow = await paymentWindowService.createPaymentWindow(windowData);
        toast.success('Окно оплаты создано!');
      }

      onWindowCreated?.(savedWindow);
      onClose();
    } catch (error: any) {
      console.error('Failed to save payment window:', error);
      toast.error(error.message || 'Не удалось сохранить окно оплаты');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentWindow ? 'Редактировать окно оплаты' : 'Создать окно оплаты'}
            </h2>
            <p className="text-sm text-gray-600">
              Сумма: {formatCurrency(formData.amount)}
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
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сумма *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="1000"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Валюта
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="RUB">RUB</option>
              </select>
            </div>
          </div>

          {/* Payment Type */}
          {!isPostpayWindow && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Тип оплаты *
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="full_prepay"
                  checked={formData.paymentType === 'full_prepay'}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value as PaymentWindowType }))}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Полная предоплата</h4>
                  <p className="text-sm text-gray-600">100% оплата до начала работы</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="partial_prepay_postpay"
                  checked={formData.paymentType === 'partial_prepay_postpay'}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value as PaymentWindowType }))}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Частичная предоплата</h4>
                  <p className="text-sm text-gray-600">Часть до работы, часть после</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="postpay"
                  checked={formData.paymentType === 'postpay'}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value as PaymentWindowType }))}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Постоплата</h4>
                  <p className="text-sm text-gray-600">100% оплата после выполнения</p>
                </div>
              </label>
            </div>

          {/* Payment Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Реквизиты для оплаты</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Номер карты</span>
                </label>
                <input
                  type="text"
                  value={formData.paymentDetails.cardNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentDetails: { ...prev.paymentDetails, cardNumber: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="1234 5678 9012 3456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <Banknote className="w-4 h-4" />
                  <span>Банковский счет</span>
                </label>
                <input
                  type="text"
                  value={formData.paymentDetails.bankAccount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentDetails: { ...prev.paymentDetails, bankAccount: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Номер банковского счета"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <Smartphone className="w-4 h-4" />
                  <span>PayPal Email</span>
                </label>
                <input
                  type="email"
                  value={formData.paymentDetails.paypalEmail}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentDetails: { ...prev.paymentDetails, paypalEmail: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="email@paypal.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <Bitcoin className="w-4 h-4" />
                  <span>Криптовалютный адрес</span>
                </label>
                <input
                  type="text"
                  value={formData.paymentDetails.cryptoAddress}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentDetails: { ...prev.paymentDetails, cryptoAddress: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Адрес кошелька"
                />
              </div>
              
              {errors.paymentMethod && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.paymentMethod}
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Инструкции по оплате *
            </label>
            <textarea
              value={formData.paymentDetails.instructions}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                paymentDetails: { ...prev.paymentDetails, instructions: e.target.value }
              }))}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.instructions ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Подробные инструкции: как переводить, комментарий к переводу, дедлайны..."
            />
            {errors.instructions && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.instructions}
              </p>
            )}
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Важное уведомление</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Подтвердите оплату в системе после перевода средств. Это поможет контролировать процесс оплаты.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Сохранение...' : currentWindow ? 'Сохранить изменения' : 'Создать окно оплаты'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}