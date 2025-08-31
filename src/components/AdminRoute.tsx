import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Lock } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
  requiredRole?: 'moderator' | 'admin';
}

export function AdminRoute({ children, requiredRole = 'moderator' }: AdminRouteProps) {
  const { user, userRole, loading, roleLoading } = useAuth();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка прав доступа...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Требуется авторизация</h3>
          <p className="text-gray-600">Войдите в систему для доступа к этой странице</p>
        </div>
      </div>
    );
  }

  const hasAccess = () => {
    if (requiredRole === 'admin') {
      return userRole === 'admin';
    }
    if (requiredRole === 'moderator') {
      return userRole === 'moderator' || userRole === 'admin';
    }
    return false;
  };

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Доступ запрещен</h3>
          <p className="text-gray-600">
            У вас недостаточно прав для доступа к этой странице.
            <br />
            Требуется роль: {requiredRole === 'admin' ? 'Администратор' : 'Модератор'}
            <br />
            Ваша роль: {userRole === 'admin' ? 'Администратор' : userRole === 'moderator' ? 'Модератор' : 'Пользователь'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}