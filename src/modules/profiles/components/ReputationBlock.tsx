import React from 'react';
import { ReputationData } from '../../../core/types';
import { Star, Award, CheckCircle, Clock, Shield } from 'lucide-react';

interface ReputationBlockProps {
  reputationData?: ReputationData;
  compact?: boolean;
}

export function ReputationBlock({ reputationData, compact = false }: ReputationBlockProps) {
  if (!reputationData) {
    return null;
  }

  const {
    rating,
    completedDeals,
    totalReviews,
    positiveReviewsPercentage,
    averageResponseTime,
    verifications,
    badges,
    trustScore
  } = reputationData;

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="font-medium">{rating.toFixed(1)}</span>
          <span className="text-gray-500">({totalReviews})</span>
        </div>

        {completedDeals > 0 && (
          <div className="flex items-center gap-1 text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>{completedDeals} сделок</span>
          </div>
        )}

        {verifications?.email && (
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Подтверждён</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Репутация и доверие</h3>
        {trustScore && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {trustScore}% надёжность
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="text-2xl font-bold text-gray-900">{rating.toFixed(1)}</span>
          </div>
          <div className="text-sm text-gray-600">
            {totalReviews} {totalReviews === 1 ? 'отзыв' : totalReviews < 5 ? 'отзыва' : 'отзывов'}
          </div>
          {positiveReviewsPercentage > 0 && (
            <div className="text-xs text-green-600 mt-1">
              {positiveReviewsPercentage}% положительных
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">{completedDeals}</span>
          </div>
          <div className="text-sm text-gray-600">
            {completedDeals === 1 ? 'Завершённая сделка' : completedDeals < 5 ? 'Завершённые сделки' : 'Завершённых сделок'}
          </div>
        </div>

        {averageResponseTime !== undefined && averageResponseTime > 0 && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-semibold text-gray-900">
                {averageResponseTime < 60 ? `${averageResponseTime} мин` : `${Math.round(averageResponseTime / 60)} ч`}
              </span>
            </div>
            <div className="text-sm text-gray-600">Среднее время ответа</div>
          </div>
        )}
      </div>

      {verifications && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Подтверждения</h4>
          <div className="flex flex-wrap gap-2">
            {verifications.email && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Email подтверждён</span>
              </div>
            )}
            {verifications.phone && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Телефон подтверждён</span>
              </div>
            )}
            {verifications.document && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm">
                <Award className="w-4 h-4" />
                <span>Документы проверены</span>
              </div>
            )}
          </div>
        </div>
      )}

      {badges && badges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Достижения</h4>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 rounded-full text-sm"
              >
                <Award className="w-4 h-4" />
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
