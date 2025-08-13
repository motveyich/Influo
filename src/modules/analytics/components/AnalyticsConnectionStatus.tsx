import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { analytics } from '../../../core/analytics';

interface AnalyticsConnectionStatusProps {
  onRetry?: () => void;
}

export function AnalyticsConnectionStatus({ onRetry }: AnalyticsConnectionStatusProps) {
  const [status, setStatus] = React.useState(analytics.getConnectionStatus());
  const [isRetrying, setIsRetrying] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(analytics.getConnectionStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await analytics.retryFailedEvents();
      onRetry?.();
    } catch (error) {
      console.error('Failed to retry events:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusColor = () => {
    if (status.ga || status.mixpanel) return 'green';
    if (status.hasQueuedEvents) return 'yellow';
    return 'red';
  };

  const getStatusMessage = () => {
    if (status.ga && status.mixpanel) return 'All analytics services connected';
    if (status.ga || status.mixpanel) return 'Partial analytics connectivity';
    if (status.hasQueuedEvents) return 'Analytics offline - events queued';
    return 'Analytics services unavailable';
  };

  const statusColor = getStatusColor();

  return (
    <div className={`p-3 rounded-lg border ${
      statusColor === 'green' ? 'bg-green-50 border-green-200' :
      statusColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
      'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {statusColor === 'green' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : statusColor === 'yellow' ? (
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            statusColor === 'green' ? 'text-green-800' :
            statusColor === 'yellow' ? 'text-yellow-800' :
            'text-red-800'
          }`}>
            {getStatusMessage()}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Service indicators */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${status.ga ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs text-gray-600">GA</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${status.mixpanel ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs text-gray-600">MP</span>
            </div>
          </div>

          {status.hasQueuedEvents && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center space-x-1 ${
                statusColor === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                'bg-red-600 hover:bg-red-700 text-white'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Queued events indicator */}
      {status.hasQueuedEvents && (
        <div className="mt-2 text-xs text-gray-600">
          Events are queued locally and will sync when services are available.
        </div>
      )}
    </div>
  );
}