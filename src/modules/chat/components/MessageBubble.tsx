import React from 'react';
import { ChatMessage } from '../../../core/types';
import { CreditCard, CheckCircle, XCircle, AlertTriangle, Edit, Trash2, CheckCheck, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageBubbleProps {
  message: ChatMessage;
  currentUserId: string;
  onInteraction: (action: string, messageId: string, dealId?: string) => void;
}

export function MessageBubble({ message, currentUserId, onInteraction }: MessageBubbleProps) {
  const isOwnMessage = message.senderId === currentUserId;
  const isInteractive = message.metadata?.isInteractive && message.metadata?.buttons;
  
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ru-RU', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const getMessageIcon = () => {
    switch (message.messageType) {
      case 'payment_window':
        return <CreditCard className="w-4 h-4 mr-2 text-blue-600" />;
      case 'payment_confirmation':
        return <CheckCircle className="w-4 h-4 mr-2 text-green-600" />;
      default:
        return null;
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  const renderPaymentDetails = () => {
    if (message.messageType !== 'payment_window' || !message.metadata?.paymentRequestId) {
      return null;
    }

    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💳 Реквизиты для оплаты:</h4>
        <div className="space-y-1 text-sm text-blue-800">
          <p><strong>💰 Сумма:</strong> ${message.metadata.amount}</p>
          <p><strong>📋 Тип оплаты:</strong> {
            message.metadata.paymentType === 'full_prepay' ? 'Полная предоплата' :
            message.metadata.paymentType === 'partial_prepay_postpay' ? 'Частичная предоплата + постоплата' :
            'Постоплата'
          }</p>
          {message.metadata.paymentDetails?.cardNumber && <p><strong>💳 Карта:</strong> {message.metadata.paymentDetails.cardNumber}</p>}
          {message.metadata.paymentDetails?.bankAccount && <p><strong>🏦 Банковский счет:</strong> {message.metadata.paymentDetails.bankAccount}</p>}
          {message.metadata.paymentDetails?.paypalEmail && <p><strong>📧 PayPal:</strong> {message.metadata.paymentDetails.paypalEmail}</p>}
          {message.metadata.paymentDetails?.cryptoAddress && <p><strong>₿ Крипто:</strong> {message.metadata.paymentDetails.cryptoAddress}</p>}
          {message.metadata.paymentDetails?.instructions && (
            <div>
              <strong>📄 Инструкции:</strong>
              <p className="whitespace-pre-line mt-1 p-2 bg-white rounded border">{message.metadata.paymentDetails.instructions}</p>
            </div>
          )}
        </div>
        
        {/* Edit/Cancel buttons for payment window creator */}
        {isOwnMessage && message.metadata.status === 'pending' && (
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => handleEditPaymentWindow()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Редактировать</span>
            </button>
            <button
              onClick={() => handleCancelPaymentWindow()}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Отменить</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleEditPaymentWindow = async () => {
    // This would open the edit modal
    toast('Функция редактирования будет доступна в интерфейсе окон оплаты');
  };

  const handleCancelPaymentWindow = async () => {
    if (!confirm('Отменить это окно оплаты?')) return;
    
    try {
      onInteraction('payment_request_cancelled', message.id);
      toast.success('Окно оплаты отменено');
    } catch (error: any) {
      console.error('Failed to cancel payment window:', error);
      toast.error('Не удалось отменить окно оплаты');
    }
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${
        isInteractive ? 'min-w-[300px]' : ''
      }`}>
        <div
          className={`px-4 py-2 rounded-lg ${
            isOwnMessage
              ? 'bg-purple-600 text-white'
              : isInteractive
              ? 'bg-white border border-gray-300'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <div className="flex items-start">
            {!isOwnMessage && getMessageIcon()}
            <div className="flex-1">
              <p className={`text-sm ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                {message.messageContent}
              </p>
              
              {/* Render payment details for payment_window messages */}
              {renderPaymentDetails()}
              
              <p className={`text-xs mt-1 ${
                isOwnMessage ? 'text-purple-100' : 'text-gray-500'
              }`}>
                <div className="flex items-center space-x-1">
                  <span>{formatMessageTime(message.timestamp)}</span>
                  {isOwnMessage && (
                    <>
                      {message.isRead ? (
                        <CheckCheck className="w-3 h-3 text-blue-300" />
                      ) : (
                        <Check className="w-3 h-3 text-purple-200" />
                      )}
                    </>
                  )}
                </div>
              </p>
            </div>
          </div>
        </div>

        {/* Interactive buttons */}
        {isInteractive && message.metadata?.buttons && (
          <div className="mt-2 space-y-2">
            {!isOwnMessage && message.metadata.buttons.filter((button: any) => {
              // Фильтруем кнопки на основе роли пользователя
              const userRole = getUserRole(currentUserId, message.metadata);
              return shouldShowButton(button, userRole, message.metadata?.status);
            }).map((button: any) => (
              <button
                key={button.id}
                onClick={() => onInteraction(button.action, message.id, button.dealId)}
                className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${getButtonStyle(button.style)}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );

  function getUserRole(userId: string, metadata: any): 'payer' | 'payee' | 'none' {
    // Check for explicit payer/payee IDs in metadata
    if (metadata?.payerId && metadata.payerId === userId) return 'payer';
    if (metadata?.payeeId && metadata.payeeId === userId) return 'payee';
    
    // Fallback: try to determine from offer structure if available
    if (metadata?.offerId) {
      // In most cases, advertiser is payer and influencer is payee
      // This is a fallback when explicit IDs are not available
      return 'none'; // Return none to be safe if we can't determine role
    }
    
    return 'none';
  }

  function shouldShowButton(button: any, userRole: 'payer' | 'payee' | 'none', currentStatus?: string): boolean {
    // Don't show any buttons if we can't determine the user's role
    if (userRole === 'none') {
      return false;
    }
    
    // Кнопки для плательщика (рекламодателя)
    const payerButtons = ['paying', 'paid', 'failed'];
    // Кнопки для получателя (инфлюенсера)
    const payeeButtons = ['confirm_received', 'payment_not_received'];

    if (userRole === 'payer' && payerButtons.includes(button.id)) {
      // Дополнительная логика для кнопки "failed" - показывать только в статусе "paying"
      if (button.id === 'failed' && currentStatus !== 'paying') {
        return false;
      }
      return true;
    }
    
    if (userRole === 'payee' && payeeButtons.includes(button.id)) {
      // Кнопка "confirm_received" только при статусе "paid"
      if (button.id === 'confirm_received' && currentStatus !== 'paid') {
        return false;
      }
      // Кнопка "payment_not_received" только при статусе "paid"
      if (button.id === 'payment_not_received' && currentStatus !== 'paid') {
        return false;
      }
      return true;
    }

    return false;
  }
}