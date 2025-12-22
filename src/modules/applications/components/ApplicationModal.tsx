import React, { useState } from 'react';
import { applicationService, OfferResponse, CreateOfferFromCardData } from '../services/applicationService';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { X, Send, AlertCircle, DollarSign, Calendar, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  cardType: 'influencer' | 'advertiser';
  cardOwnerId: string;
  onOfferSent?: (offer: OfferResponse) => void;
}

export function ApplicationModal({
  isOpen,
  onClose,
  cardId,
  cardType,
  cardOwnerId,
  onOfferSent,
}: ApplicationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useBodyScrollLock(isOpen);

  const [formData, setFormData] = useState({
    message: '',
    proposedRate: 0,
    timeline: '',
    deliverables: [] as string[],
  });

  const [newDeliverable, setNewDeliverable] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    if (!formData.proposedRate || formData.proposedRate <= 0) {
      newErrors.proposedRate = 'Please specify a rate';
    }

    if (!formData.timeline.trim()) {
      newErrors.timeline = 'Timeline is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendApplication = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsLoading(true);
    try {
      const data: CreateOfferFromCardData = {
        cardId,
        cardType,
        cardOwnerId,
        message: formData.message,
        proposedRate: formData.proposedRate,
        timeline: formData.timeline,
        deliverables: formData.deliverables,
      };

      const sentOffer = await applicationService.createApplication(data);

      toast.success('Offer sent successfully!');
      onOfferSent?.(sentOffer);
      onClose();
    } catch (error: any) {
      console.error('Failed to send offer:', error);
      toast.error(error.message || 'Failed to send offer');
    } finally {
      setIsLoading(false);
    }
  };

  const addDeliverable = () => {
    if (!newDeliverable.trim()) return;

    setFormData(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, newDeliverable.trim()]
    }));
    setNewDeliverable('');
  };

  const removeDeliverable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Send Collaboration Offer
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.message ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Tell about yourself, your experience, and why you're interested in collaboration..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.message && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.message}
                </p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {formData.message.length}/1000 characters
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Rate (USD) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={formData.proposedRate}
                onChange={(e) => setFormData(prev => ({ ...prev, proposedRate: parseInt(e.target.value) || 0 }))}
                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.proposedRate ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="1000"
              />
            </div>
            {errors.proposedRate && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.proposedRate}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeline *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={formData.timeline}
                onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.timeline ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 2 weeks from acceptance, by March 15"
              />
            </div>
            {errors.timeline && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.timeline}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What you offer
            </label>

            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                placeholder="e.g., 1 Instagram post, 3 Stories slides"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && addDeliverable()}
              />
              <button
                type="button"
                onClick={addDeliverable}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>

            <div className="space-y-2">
              {formData.deliverables.map((deliverable, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-900">{deliverable}</span>
                  </div>
                  <button
                    onClick={() => removeDeliverable(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendApplication}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isLoading ? 'Sending...' : 'Send Offer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
