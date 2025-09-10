import React from 'react';
import { ChatMessage } from '../../../core/types';
import { CreditCard, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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
    if (message.messageType !== 'payment_window' || !message.metadata?.paymentDetails) {
      return null;
    }

    const details = message.metadata.paymentDetails;
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
          {details.cardNumber && <p><strong>💳 Карта:</strong> {details.cardNumber}</p>}
          {details.bankAccount && <p><strong>🏦 Банковский счет:</strong> {details.bankAccount}</p>}
          {details.paypalEmail && <p><strong>📧 PayPal:</strong> {details.paypalEmail}</p>}
          {details.cryptoAddress && <p><strong>₿ Крипто:</strong> {details.cryptoAddress}</p>}
          {details.instructions && (
            <div>
              <strong>📄 Инструкции:</strong>
              <p className="whitespace-pre-line mt-1 p-2 bg-white rounded border">{details.instructions}</p>
            </div>
          )}
        </div>
      </div>
    );
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
                {formatMessageTime(message.timestamp)}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive buttons */}
        {isInteractive && !isOwnMessage && message.metadata?.buttons && (
          <div className="mt-2 space-y-2">
            {message.metadata.buttons.map((button: any) => (
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

        {/* Show buttons for sender when payment is confirmed */}
        {isInteractive && isOwnMessage && message.messageType === 'payment_confirmation' && message.metadata?.buttons && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {message.metadata.buttons.map((button: any) => (
              <button
                key={button.id}
                onClick={() => onInteraction(button.action, message.id, button.dealId)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${getButtonStyle(button.style)}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}