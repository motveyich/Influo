import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../../../core/types';
import { adminService } from '../../../services/adminService';
import { roleService } from '../../../services/roleService';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  Trash2, 
  RotateCcw, 
  Crown,
  User,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UsersManagementProps {
  onStatsUpdate: () => void;
}

export function UsersManagement({ onStatsUpdate }: UsersManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const { user: currentUser, userRole } = useAuth();

  useEffect(() => {
    loadUsers();
  }, [roleFilter, showDeleted]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const loadedUsers = await adminService.getAllUsers({
        role: roleFilter !== 'all' ? roleFilter : undefined,
        searchQuery: searchQuery || undefined,
        isDeleted: showDeleted
      });
      setUsers(loadedUsers);
      
      // Debug log to check user data structure
      console.log('Loaded users:', loadedUsers.map(u => ({ 
        name: u.fullName, 
        email: u.email, 
        isDeleted: (u as any).is_deleted,
        deletedAt: (u as any).deleted_at 
      })));
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Не удалось загрузить пользователей');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length === 0 || query.length >= 3) {
      loadUsers();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    console.log('🔧 [UsersManagement] Block button clicked for user:', userId);
    if (!confirm('Вы уверены, что хотите заблокировать этого пользователя?')) return;

    try {
      console.log('✅ [UsersManagement] User confirmed blocking, calling adminService');
      
      // Additional validation
      if (userId === currentUser?.id) {
        toast.error('Нельзя заблокировать самого себя');
        return;
      }
      
      if (!userRole || !['admin', 'moderator'].includes(userRole)) {
        toast.error('У вас недостаточно прав для блокировки пользователей');
        return;
      }
      
      await adminService.deleteUser(userId, currentUser!.id, userRole!);
      console.log('✅ [UsersManagement] AdminService call completed, reloading users');
      
      // Force reload users to see the change
      await loadUsers();
      onStatsUpdate();
      
      console.log('✅ [UsersManagement] User successfully blocked and removed from active list');
      toast.success('Пользователь заблокирован');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      
      if (error.message.includes('RLS policy')) {
        toast.error('Ошибка прав доступа. Проверьте настройки Database RLS политик.');
      } else if (error.message.includes('already blocked')) {
        toast.error('Пользователь уже заблокирован');
      } else if (error.message.includes('Cannot block yourself')) {
        toast.error('Нельзя заблокировать самого себя');
      } else {
        toast.error(error.message || 'Не удалось заблокировать пользователя');
      }
    }
  };

  const handleRestoreUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите разблокировать этого пользователя?')) return;

    try {
      console.log('🔧 [UsersManagement] Starting user restoration for:', userId);
      await adminService.restoreUser(userId, currentUser!.id);
      console.log('✅ [UsersManagement] User restoration completed, reloading users');
      await loadUsers();
      onStatsUpdate();
      toast.success('Пользователь восстановлен');
    } catch (error: any) {
      console.error('Failed to restore user:', error);
      toast.error(error.message || 'Не удалось восстановить пользователя');
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      await roleService.assignRole(userId, newRole, currentUser!.id);
      await loadUsers();
      toast.success(`Роль изменена на ${newRole === 'admin' ? 'Администратор' : newRole === 'moderator' ? 'Модератор' : 'Пользователь'}`);
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Failed to change role:', error);
      toast.error(error.message || 'Не удалось изменить роль');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-red-600" />;
      case 'moderator':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'moderator':
        return 'Модератор';
      default:
        return 'Пользователь';
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'moderator':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Управление пользователями</h2>
          <p className="text-sm text-gray-600">Просмотр и управление аккаунтами пользователей</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все роли</option>
            <option value="user">Пользователи</option>
            <option value="moderator">Модераторы</option>
            <option value="admin">Администраторы</option>
          </select>
          
          <label className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Удаленные</span>
          </label>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка пользователей...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата регистрации
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-400 rounded-full flex items-center justify-center">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.fullName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold">
                              {user.fullName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(user.userType as UserRole)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(user.userType as UserRole)}`}>
                          {getRoleLabel(user.userType as UserRole)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {(user as any).is_deleted === true ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">Заблокирован</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">Активен</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {userRole === 'admin' && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRoleModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Изменить роль"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        
                        {(user as any).is_deleted === true ? (
                          <button
                            onClick={() => handleRestoreUser(user.userId)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Разблокировать пользователя"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteUser(user.userId)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Заблокировать пользователя"
                            disabled={user.userId === currentUser?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Пользователи не найдены</h3>
            <p className="text-gray-600">Попробуйте изменить фильтры поиска</p>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Изменить роль</h3>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Изменить роль для: <strong>{selectedUser.fullName}</strong>
                </p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>
              
              <div className="space-y-3">
                {(['user', 'moderator', 'admin'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleChangeRole(selectedUser.userId, role)}
                    disabled={selectedUser.userId === currentUser?.id && role !== userRole}
                    className={`w-full p-3 border-2 rounded-lg transition-colors text-left ${
                      (selectedUser as any).role === role
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center space-x-3">
                      {getRoleIcon(role)}
                      <div>
                        <p className="font-medium text-gray-900">{getRoleLabel(role)}</p>
                        <p className="text-sm text-gray-600">
                          {role === 'admin' ? 'Полный доступ ко всем функциям' :
                           role === 'moderator' ? 'Модерация контента и пользователей' :
                           'Обычный пользователь платформы'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}