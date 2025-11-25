import React, { useState } from 'react';
import { X, Send, DollarSign, Calendar, FileText, Loader2 } from 'lucide-react';
import { AutoCampaign } from '../../../core/types';
import toast from 'react-hot-toast';

interface AutoCampaignApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: AutoCampaign;
  influencerId: string;
  onSuccess: () => void;
}

export function AutoCampaignApplicationModal({
  isOpen,
  onClose,
  campaign,
  influencerId,
  onSuccess
}: AutoCampaignApplicationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    proposedRate: Math.floor((campaign.budgetMin + campaign.budgetMax) / 2),
    message: '',
    deliverables: campaign.contentTypes.join(', '),
    timeline: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (campaign.status === 'paused') {
      toast.error('Эта кампания приостановлена. Откликнуться невозможно.');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Пожалуйста, добавьте сообщение');
      return;
    }

    if (!formData.timeline.trim()) {
      toast.error('Пожалуйста, укажите сроки выполнения');
      return;
    }

    if (formData.proposedRate < campaign.budgetMin || formData.proposedRate > campaign.budgetMax) {
      toast.error(`Предложенная ставка должна быть в диапазоне ${campaign.budgetMin}-${campaign.budgetMax} ₽`);
      return;
    }

    setIsSubmitting(true);

    try {
      const { offerService } = await import('../../offers/services/offerService');

      await offerService.createAutoCampaignOffer({
        autoCampaignId: campaign.id,
        influencerId,
        advertiserId: campaign.advertiserId,
        title: `Отклик на автокампанию: ${campaign.title}`,
        description: formData.message,
        proposedRate: formData.proposedRate,
        currency: 'RUB',
        deliverables: formData.deliverables.split(',').map(d => d.trim()).filter(Boolean),
        timeline: formData.timeline,
        platform: campaign.platforms[0] || 'instagram',
        contentType: campaign.contentTypes[0] || 'post',
        enableChat: campaign.enableChat
      });

      toast.success('Отклик успешно отправлен!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to submit application:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Не удалось отправить отклик';

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Откликнуться на автокампанию
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {campaign.title}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Campaign Info */}
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Бюджет</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {campaign.budgetMin.toLocaleString()}-{campaign.budgetMax.toLocaleString()} ₽
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Требуемая аудитория</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {campaign.audienceMin.toLocaleString()}-{campaign.audienceMax.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {campaign.platforms.slice(0, 3).map((platform) => (
              <span
                key={platform}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs rounded-md capitalize"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Proposed Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Предложенная ставка (₽) *</span>
              </div>
            </label>
            <input
              type="number"
              value={formData.proposedRate}
              onChange={(e) => setFormData({ ...formData, proposedRate: Number(e.target.value) })}
              min={campaign.budgetMin}
              max={campaign.budgetMax}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder={`От ${campaign.budgetMin} до ${campaign.budgetMax} ₽`}
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Диапазон бюджета: {campaign.budgetMin.toLocaleString()}-{campaign.budgetMax.toLocaleString()} ₽
            </p>
          </div>

          {/* Deliverables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Что вы предлагаете *</span>
              </div>
            </label>
            <input
              type="text"
              value={formData.deliverables}
              onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Пост, Stories, Reel (через запятую)"
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Рекомендуемые типы контента: {campaign.contentTypes.join(', ')}
            </p>
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Сроки выполнения *</span>
              </div>
            </label>
            <input
              type="text"
              value={formData.timeline}
              onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Например: 3-5 дней"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сообщение рекламодателю *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              placeholder="Расскажите, почему вы подходите для этой кампании..."
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Минимум 20 символов
            </p>
          </div>

          {/* Chat Notice */}
          {campaign.enableChat && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-300">
                ✓ В этой автокампании разрешено общение через чат. После принятия предложения вы сможете обсудить детали.
              </p>
            </div>
          )}

          {!campaign.enableChat && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                ⚠ Чат недоступен для этой автокампании. Все детали должны быть указаны в заявке.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Отправка...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Отправить отклик</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
