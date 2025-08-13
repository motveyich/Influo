import React, { useState } from 'react';
import { CollaborationForm } from '../../../core/types';
import { collaborationService } from '../services/collaborationService';
import { X, Check, XCircle, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface CollaborationResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborationRequest: CollaborationForm;
  onResponseSent?: (response: 'accepted' | 'declined') => void;
}

export function CollaborationResponseModal({
  isOpen,
  onClose,
  collaborationRequest,
  onResponseSent
}: CollaborationResponseModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [responseType, setResponseType] = useState<'accepted' | 'declined' | null>(null);
  const [counterOffer, setCounterOffer] = useState({
    proposedRate: collaborationRequest.formFields?.proposedRate || 0,
    timeline: collaborationRequest.formFields?.timeline || '',
    additionalTerms: ''
  });

  const handleResponse = async (response: 'accepted' | 'declined') => {
    setIsLoading(true);
    try {
      let responseData = undefined;
      
      if (response === 'accepted' && responseType === 'accepted') {
        // Include counter offer data if modified
        const originalRate = collaborationRequest.formFields?.proposedRate || 0;
        const originalTimeline = collaborationRequest.formFields?.timeline || '';
        
        if (counterOffer.proposedRate !== originalRate || 
            counterOffer.timeline !== originalTimeline || 
            counterOffer.additionalTerms.trim()) {
          responseData = {
            ...collaborationRequest.formFields,
            counterOffer: {
              proposedRate: counterOffer.proposedRate,
              timeline: counterOffer.timeline,
              additionalTerms: counterOffer.additionalTerms
            }
          };
        }
      }

      await collaborationService.respondToCollaborationRequest(
        collaborationRequest.id,
        response,
        responseData
      );

      toast.success(`Collaboration request ${response} successfully!`);
      onResponseSent?.(response);
      onClose();
    } catch (error: any) {
      console.error('Failed to respond to collaboration request:', error);
      toast.error(error.message || 'Failed to send response');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
          <h2 className="text-xl font-semibold text-gray-900">
            Collaboration Request Response
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
          {/* Request Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Request Details</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-600">Campaign:</span>
                <span className="ml-2 text-sm text-gray-900">{collaborationRequest.formFields?.campaignTitle}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Proposed Rate:</span>
                <span className="ml-2 text-sm text-gray-900">{formatCurrency(collaborationRequest.formFields?.proposedRate || 0)}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Timeline:</span>
                <span className="ml-2 text-sm text-gray-900">{collaborationRequest.formFields?.timeline}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Message:</span>
                <p className="mt-1 text-sm text-gray-900">{collaborationRequest.formFields?.message}</p>
              </div>
              {collaborationRequest.formFields?.deliverables && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Deliverables:</span>
                  <ul className="mt-1 space-y-1">
                    {collaborationRequest.formFields.deliverables.map((deliverable, index) => (
                      <li key={index} className="text-sm text-gray-900 ml-4">• {deliverable}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Response Options */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Your Response</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setResponseType('accepted')}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  responseType === 'accepted'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700">Accept</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Accept this collaboration request</p>
              </button>

              <button
                onClick={() => setResponseType('declined')}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  responseType === 'declined'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-red-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-700">Decline</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Decline this collaboration request</p>
              </button>
            </div>
          </div>

          {/* Counter Offer (if accepting) */}
          {responseType === 'accepted' && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3">Modify Terms (Optional)</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposed Rate (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      value={counterOffer.proposedRate}
                      onChange={(e) => setCounterOffer(prev => ({ ...prev, proposedRate: parseInt(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={counterOffer.timeline}
                      onChange={(e) => setCounterOffer(prev => ({ ...prev, timeline: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Terms
                  </label>
                  <textarea
                    value={counterOffer.additionalTerms}
                    onChange={(e) => setCounterOffer(prev => ({ ...prev, additionalTerms: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Any additional terms or requirements..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Decline Reason (if declining) */}
          {responseType === 'declined' && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-900 mb-3">Reason for Declining (Optional)</h4>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Let them know why you're declining (optional)..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          
          {responseType && (
            <button
              onClick={() => handleResponse(responseType)}
              disabled={isLoading}
              className={`px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50 ${
                responseType === 'accepted'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {responseType === 'accepted' ? (
                <Check className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>
                {isLoading ? 'Sending...' : responseType === 'accepted' ? 'Accept Request' : 'Decline Request'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}