import React, { useState } from 'react';
import { PaymentRequest } from '../../../core/types';
import { paymentRequestService } from '../services/paymentRequestService';
import { X, Save, AlertCircle, CreditCard, Building, Mail, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  createdBy: string;
  existingRequest?: PaymentRequest;
  onPaymentRequestCreated: (request: PaymentRequest) => void;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Банковский перевод', icon: Building },
  { value: 'card', label: 'Банковская карта', icon: CreditCard },
  { value: 'paypal', label: 'PayPal', icon: Mail },
  { value: 'crypto', label: 'Криптовалюта', icon: Wallet }
];

export function PaymentRequestModal({ 
  isOpen, 
  onClose, 
  offerId, 
  createdBy, 
  existingRequest,
  onPaymentRequestCreated 
}: PaymentRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    amount: 0,
    currency: 'USD',
    paymentType: 'full' as 'prepay' | 'postpay' | 'full',
    paymentMethod: 'bank_transfer',
    paymentDetails: {
      bankAccount: '',
      cardNumber: '',
      paypalEmail: '',
      cryptoAddress: '',
      accountHolder: '',
      bankName: '',
      routingNumber: ''
    },
    instructions: ''
  });

  React.useEffect(() => {
    if (existingRequest) {
      setFormData({
        amount: existingRequest.amount,
        currency: existingRequest.currency,
        paymentType: existingRequest.paymentType as any,
        paymentMethod: existingRequest.paymentMethod,
        paymentDetails: {
          ...existingRequest.paymentDetails,
          bankAccount: existingRequest.paymentDetails.bankAccount || '',
          cardNumber: existingRequest.paymentDetails.cardNumber || '',
          paypalEmail: existingRequest.paymentDetails.paypalEmail || '',
          cryptoAddress: existingRequest.paymentDetails.cryptoAddress || '',
          accountHolder: existingRequest.paymentDetails.accountHolder || '',
          bankName: existingRequest.paymentDetails.bankName || '',
          routingNumber: existingRequest.paymentDetails.routingNumber || ''
        },
        instructions: existingRequest.instructions || ''
      });
    }
  }, [existingRequest]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Укажите корректную сумму';
    }

    // Validate payment details based on method
    if (formData.paymentMethod === 'bank_transfer') {
      if (!formData.paymentDetails.bankAccount?.trim()) {
        newErrors.bankAccount = 'Номер банковского счета обязателен';
      }
      if (!formData.paymentDetails.accountHolder?.trim()) {
        newErrors.accountHolder = 'Имя владельца счета обязательно';
      }
    } else if (formData.paymentMethod === 'card') {
      if (!formData.paymentDetails.cardNumber?.trim()) {
        newErrors.cardNumber = 'Номер карты обязателен';
      }
      if (!formData.paymentDetails.accountHolder?.trim()) {
        newErrors.accountHolder = 'Имя владельца карты обязательно';
      }
    } else if (formData.paymentMethod === 'paypal') {
      if (!formData.paymentDetails.paypalEmail?.trim()) {
        newErrors.paypalEmail = 'Email PayPal обязателен';
      } else if (!/\S+@\S+\.\S+/.test(formData.paymentDetails.paypalEmail)) {
        newErrors.paypalEmail = 'Введите корректный email';
      }
    } else if (formData.paymentMethod === 'crypto') {
      if (!formData.paymentDetails.cryptoAddress?.trim()) {
        newErrors.cryptoAddress = 'Адрес кошелька обязателен';
      }
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
      const requestData: Partial<PaymentRequest> = {
        offerId,
        createdBy,
        ...formData
      };

      const createdRequest = await paymentRequestService.createPaymentRequest(requestData);
      toast.success('Окно оплаты создано успешно!');
      onPaymentRequestCreated(createdRequest);
      onClose();
    } catch (error: any) {
      console.error('Failed to create payment request:', error);
      toast.error(error.message || 'Не удалось создать окно оплаты');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPaymentDetailsFields = () => {
    const method = formData.paymentMethod;
    
    switch (method) {
      case 'bank_transfer':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер банковского счета *
              </label>
              <input
                type="text"
                value={formData.paymentDetails.bankAccount}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  paymentDetails: { ...prev.paymentDetails, bankAccount: e.target.value }
                }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.bankAccount ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="1234567890123456"
              />
              {errors.bankAccount && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.bankAccount}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя владельца счета *
              </label>
              <input
                type="text"
                value={formData.paymentDetails.accountHolder}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  paymentDetails: { ...prev.paymentDetails, accountHolder: e.target.value }
                }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.accountHolder ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Иван Иванов"
              />
              {errors.accountHolder && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.accountHolder}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название банка
              </label>
              <input
                type="text"
                value={formData.paymentDetails.bankName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  paymentDetails: { ...prev.paymentDetails, bankName: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Сбербанк"
              />
            </div>
          </>
        );

      case 'card':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер карты *
              </label>
              <input
                type="text"
                value={formData.paymentDetails.cardNumber}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  paymentDetails: { ...prev.paymentDetails, cardNumber: e.target.value }
                }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cardNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="1234 5678 9012 3456"
              />
              {errors.cardNumber && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.cardNumber}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя владельца карты *
              </label>
              <input
                type="text"
                value={formData.paymentDetails.accountHolder}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  paymentDetails: { ...prev.paymentDetails, accountHolder: e.target.value }
                }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.accountHolder ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="IVAN IVANOV"
              />
              {errors.accountHolder && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.accountHolder}
                </p>
              )}
            </div>
          </>
        );

      case 'paypal':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email PayPal *
            </label>
            <input
              type="email"
              value={formData.paymentDetails.paypalEmail}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                paymentDetails: { ...prev.paymentDetails, paypalEmail: e.target.value }
              }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.paypalEmail ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="your.email@example.com"
            />
            {errors.paypalEmail && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.paypalEmail}
              </p>
            )}
          </div>
        );

      case 'crypto':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Адрес кошелька *
            </label>
            <input
              type="text"
              value={formData.paymentDetails.cryptoAddress}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                paymentDetails: { ...prev.paymentDetails, cryptoAddress: e.target.value }
              }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.cryptoAddress ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            />
            {errors.cryptoAddress && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.cryptoAddress}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {existingRequest ? 'Редактировать окно оплаты' : 'Создать окно оплаты'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Amount and Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сумма к оплате *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.amount ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="1000"
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="RUB">RUB</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип оплаты
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="full">Полная оплата</option>
                <option value="prepay">Предоплата</option>
                <option value="postpay">Постоплата</option>
              </select>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Способ оплаты
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.value }))}
                    className={`p-3 border rounded-lg transition-colors flex items-center space-x-2 ${
                      formData.paymentMethod === method.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Details */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">Реквизиты для оплаты</h3>
            <div className="space-y-4">
              {renderPaymentDetailsFields()}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дополнительные инструкции
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Дополнительные инструкции по оплате, сроки, комментарии..."
            />
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Сохранение...' : 'Создать окно оплаты'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}