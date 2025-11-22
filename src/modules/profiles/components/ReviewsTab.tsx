import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Calendar } from 'lucide-react';
import { supabase, TABLES } from '../../../core/supabase';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Review {
  id: string;
  offerId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerProfile?: {
    fullName: string;
    avatarUrl?: string;
  };
  reviewedProfile?: {
    fullName: string;
    avatarUrl?: string;
  };
}

interface ReviewsTabProps {
  userId: string;
}

export function ReviewsTab({ userId }: ReviewsTabProps) {
  const [activeSection, setActiveSection] = useState<'received' | 'given'>('received');
  const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
  const [givenReviews, setGivenReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [userId]);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      // Загружаем отзывы обо мне
      const { data: received, error: receivedError } = await supabase
        .from(TABLES.REVIEWS)
        .select('*')
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Загружаем мои отзывы
      const { data: given, error: givenError } = await supabase
        .from(TABLES.REVIEWS)
        .select('*')
        .eq('reviewer_id', userId)
        .order('created_at', { ascending: false });

      if (givenError) throw givenError;

      // Загружаем профили для полученных отзывов
      if (received && received.length > 0) {
        const reviewerIds = received.map(r => r.reviewer_id);
        const { data: profiles } = await supabase
          .from(TABLES.USER_PROFILES)
          .select('user_id, full_name, avatar_url')
          .in('user_id', reviewerIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setReceivedReviews(received.map(r => ({
          id: r.review_id,
          offerId: r.offer_id,
          reviewerId: r.reviewer_id,
          reviewedUserId: r.reviewed_user_id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
          reviewerProfile: profilesMap.get(r.reviewer_id) ? {
            fullName: profilesMap.get(r.reviewer_id)!.full_name,
            avatarUrl: profilesMap.get(r.reviewer_id)!.avatar_url
          } : undefined
        })));
      }

      // Загружаем профили для отданных отзывов
      if (given && given.length > 0) {
        const reviewedIds = given.map(r => r.reviewed_user_id);
        const { data: profiles } = await supabase
          .from(TABLES.USER_PROFILES)
          .select('user_id, full_name, avatar_url')
          .in('user_id', reviewedIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setGivenReviews(given.map(r => ({
          id: r.review_id,
          offerId: r.offer_id,
          reviewerId: r.reviewer_id,
          reviewedUserId: r.reviewed_user_id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
          reviewedProfile: profilesMap.get(r.reviewed_user_id) ? {
            fullName: profilesMap.get(r.reviewed_user_id)!.full_name,
            avatarUrl: profilesMap.get(r.reviewed_user_id)!.avatar_url
          } : undefined
        })));
      }

    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderReviewCard = (review: Review, type: 'received' | 'given') => {
    const profile = type === 'received' ? review.reviewerProfile : review.reviewedProfile;
    const label = type === 'received' ? 'От' : 'Для';

    return (
      <div key={review.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {label}: {profile?.fullName || 'Пользователь'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  {renderStars(review.rating)}
                  <span className="text-xs text-gray-500">
                    {review.rating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDistanceToNow(parseISO(review.createdAt), {
                  addSuffix: true,
                  locale: ru
                })}
              </div>
            </div>

            {review.comment && (
              <div className="mt-2 bg-gray-50 dark:bg-gray-900 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Отзывы
        </h2>

        {/* Section Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveSection('received')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
              activeSection === 'received'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Отзывы обо мне ({receivedReviews.length})
          </button>
          <button
            onClick={() => setActiveSection('given')}
            className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
              activeSection === 'given'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Мои отзывы ({givenReviews.length})
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSection === 'received' ? (
              receivedReviews.length > 0 ? (
                receivedReviews.map(review => renderReviewCard(review, 'received'))
              ) : (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    У вас пока нет отзывов
                  </p>
                </div>
              )
            ) : (
              givenReviews.length > 0 ? (
                givenReviews.map(review => renderReviewCard(review, 'given'))
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Вы еще не оставляли отзывов
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
