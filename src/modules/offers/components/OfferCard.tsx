import React from 'react';
import { CollaborationOffer, OfferStatus } from '../../../core/types';
import { offerService } from '../services/offerService';
import { 
  Clock, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Eye,
  Settings,
  Play,
  Trophy,
  Ban
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface OfferCardProps {
  offer: CollaborationOffer;
  currentUserId: string;
  userRole: 'influencer' | 'advertiser';
  onOfferUpdated: (offer: CollaborationOffer) => void;
  onViewDetails: (offer: CollaborationOffer) => void;
}

export function OfferCard({ 
  offer, 
  currentUserId, 
  userRole, 
  onOfferUpdated, 
  onViewDetails 
}: OfferCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const getStatusColor = (status: OfferStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'terminated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'declined':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: OfferStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Play className="w-4 h-4" />;
      case 'completed':
        return <Trophy className="w-4 h-4" />;
      case 'terminated':
        return <Ban className="w-4 h-4" />;
      case 'declined':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: OfferStatus) => {
    switch (status) {
      case 'pending':
        return 'Ожидает ответа';
      case 'accepted':
        return 'Принято';
      case 'in_progress':
        return 'В работе';
      case 'completed':
        return 'Завершено';
      case 'terminated':
        return 'Расторгнуто';
      case 'declined':
        return 'Отклонено';
      case 'cancelled':
        return 'Отменено';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleStatusUpdate = async (newStatus: OfferStatus, additionalData?: any) => {
    setIsLoading(true);
    try {
      const updatedOffer = await offerService.updateOfferStatus(offer.id, newStatus, currentUserId, additionalData);
      onOfferUpdated(updatedOffer);
      
      const statusMessages = {
        'accepted': 'Предложение принято',
        'declined': 'Предложение отклонено',
        'cancelled': 'Предложение отменено',
        'completed': 'Сотрудничество завершено',
        'terminated': 'Сотрудничество расторгнуто'
      };
      
      toast.success(statusMessages[newStatus] || 'Статус обновлен');
    } catch (error: any) {
      console.error('Failed to update offer status:', error);
      toast.error(error.message || 'Не удалось обновить статус');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    // Pending status actions
    if (offer.status === 'pending') {
      if (userRole === 'advertiser') {
        actions.push(
          { label: 'Принять', action: 'accepted', style: 'success' },
          { label: 'Отклонить', action: 'declined', style: 'danger' }
        );
      } else if (userRole === 'influencer') {
        actions.push(
          { label: 'Отменить', action: 'cancelled', style: 'neutral' }
        );
      }
    }

    // In progress actions (both roles)
    if (offer.status === 'in_progress') {
      actions.push(
        { label: 'Завершить', action: 'completed', style: 'success' },
        { label: 'Расторгнуть', action: 'terminated', style: 'danger' }
      );
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {offer.title}
            </h3>
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(offer.status)}`}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(offer.status)}
                <span>{getStatusLabel(offer.status)}</span>
              </div>
            </span>
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2">
            {offer.description}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(offer.acceptedRate || offer.proposedRate, offer.currency)}
            </p>
            <p className="text-xs text-gray-600">
              {offer.acceptedRate && offer.acceptedRate !== offer.proposedRate ? 'Принятая ставка' : 'Предложенная ставка'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {offer.timeline}
            </p>
            <p className="text-xs text-gray-600">Сроки</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatDistanceToNow(parseISO(offer.createdAt), { addSuffix: true })}
            </p>
            <p className="text-xs text-gray-600">Создано</p>
          </div>
        </div>
      </div>

      {/* Deliverables */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Результаты:</p>
        <div className="flex flex-wrap gap-1">
          {offer.deliverables.slice(0, 3).map((deliverable, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
            >
              {deliverable}
            </span>
          ))}
          {offer.deliverables.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
              +{offer.deliverables.length - 3} еще
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={() => onViewDetails(offer)}
          className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors flex items-center space-x-1"
        >
          <Eye className="w-4 h-4" />
          <span>Подробнее</span>
        </button>

        {availableActions.length > 0 && (
          <div className="flex space-x-2">
            {availableActions.map((action) => (
              <button
                key={action.action}
                onClick={() => handleStatusUpdate(action.action as OfferStatus)}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                  action.style === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  action.style === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}