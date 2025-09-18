import React, { useState } from 'react';
import { UserSettings } from '../../../core/types';
import { 
  Shield, 
  Key, 
  Smartphone, 
  LogOut, 
  Eye, 
  EyeOff, 
  Trash2, 
  UserX,
  AlertTriangle,
  CheckCircle,
  X,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SecuritySettingsProps {
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings>;
  changePassword: (current: string, newPassword: string) => Promise<void>;
  enableTwoFactor: () => Promise<{ qrCode: string; secret: string }>;
  disableTwoFactor: (code: string) => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  deactivateAccount: (reason?: string) => Promise<void>;
  deleteAccount: (confirmationText: string) => Promise<void>;
  userId: string;
}

export function SecuritySettings({ 
  settings, 
  onUpdateSettings, 
  changePassword,
  enableTwoFactor,
  disableTwoFactor,
  signOutAllDevices,
  deactivateAccount,
  deleteAccount,
  userId 
}: SecuritySettingsProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  
  const handlePrivacyUpdate = async (field: keyof UserSettings['privacy'], value: boolean) => {
    try {
      await onUpdateSettings({
        privacy: {
          ...settings.privacy,
          [field]: value
        }
      });
      toast.success('Настройки приватности обновлены');
    } catch (error) {
      toast.error('Не удалось обновить настройки приватности');
    }
  };

  const handleSignOutAllDevices = async () => {
    if (!confirm('Выйти со всех устройств? Вам потребуется войти заново.')) return;

    try {
      await signOutAllDevices();
      toast.success('Выход со всех устройств выполнен');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось выйти со всех устройств');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Безопасность</h2>
        <p className="text-sm text-gray-600">Управление безопасностью и приватностью аккаунта</p>
      </div>

      {/* Password Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Key className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-md font-medium text-gray-900">Пароль</h3>
              <p className="text-sm text-gray-600">
                Последнее изменение: {new Date(settings.security.passwordLastChanged).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Изменить пароль
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Smartphone className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="text-md font-medium text-gray-900">Двухфакторная аутентификация</h3>
              <p className="text-sm text-gray-600">
                {settings.security.twoFactorEnabled 
                  ? 'Включена - дополнительная защита активна'
                  : 'Отключена - рекомендуем включить для безопасности'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => setShow2FAModal(true)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              settings.security.twoFactorEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {settings.security.twoFactorEnabled ? 'Отключить 2FA' : 'Включить 2FA'}
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <LogOut className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="text-md font-medium text-gray-900">Активные сессии</h3>
              <p className="text-sm text-gray-600">
                Управление устройствами, с которых выполнен вход
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOutAllDevices}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Выйти со всех устройств
          </button>
        </div>

        {/* Sessions List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Текущее устройство</p>
                <p className="text-xs text-gray-600">
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Браузер'} • 
                  Сейчас активен
                </p>
              </div>
            </div>
            <span className="text-xs text-green-600 font-medium">Активна</span>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Eye className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900">Настройки приватности</h3>
            <p className="text-sm text-gray-600">Контроль видимости личной информации</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Скрыть email адрес</p>
              <p className="text-xs text-gray-600">Email не будет виден другим пользователям</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.hideEmail}
                onChange={(e) => handlePrivacyUpdate('hideEmail', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Скрыть номер телефона</p>
              <p className="text-xs text-gray-600">Телефон не будет виден другим пользователям</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.hidePhone}
                onChange={(e) => handlePrivacyUpdate('hidePhone', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Скрыть социальные сети</p>
              <p className="text-xs text-gray-600">Ссылки на соцсети не будут видны другим</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.hideSocialMedia}
                onChange={(e) => handlePrivacyUpdate('hideSocialMedia', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="text-md font-medium text-red-900">Опасная зона</h3>
            <p className="text-sm text-red-700">Необратимые действия с аккаунтом</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Временно деактивировать аккаунт</p>
              <p className="text-xs text-red-700">Скрыть профиль, сохранив возможность восстановления</p>
            </div>
            <button
              onClick={() => setShowDeactivateModal(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <UserX className="w-4 h-4" />
              <span>Деактивировать</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Удалить аккаунт навсегда</p>
              <p className="text-xs text-red-700">Полное удаление всех данных без возможности восстановления</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить аккаунт</span>
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onPasswordChanged={() => {
          setShowPasswordModal(false);
          toast.success('Пароль успешно изменен');
        }}
        changePassword={changePassword}
      />

      {/* 2FA Modal */}
      <TwoFactorModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        isEnabled={settings.security.twoFactorEnabled}
        onToggle={() => {
          setShow2FAModal(false);
          toast.success(settings.security.twoFactorEnabled ? '2FA отключена' : '2FA включена');
        }}
        enableTwoFactor={enableTwoFactor}
        disableTwoFactor={disableTwoFactor}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteAccount}
      />

      {/* Deactivate Account Modal */}
      <DeactivateAccountModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={deactivateAccount}
      />
    </div>
  );
}

// Password Change Modal Component
interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: () => void;
  changePassword: (current: string, newPassword: string) => Promise<void>;
}

function PasswordChangeModal({ isOpen, onClose, onPasswordChanged, changePassword }: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Введите текущий пароль';
    }

    if (!newPassword) {
      newErrors.newPassword = 'Введите новый пароль';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Пароль должен содержать минимум 6 символов';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      onPasswordChanged();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось изменить пароль');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Изменить пароль</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текущий пароль
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.currentPassword ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Новый пароль
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.newPassword ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подтвердите новый пароль
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Изменение...' : 'Изменить пароль'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Two-Factor Authentication Modal
interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  onToggle: () => void;
  enableTwoFactor: () => Promise<{ qrCode: string; secret: string }>;
  disableTwoFactor: (code: string) => Promise<void>;
}

function TwoFactorModal({ isOpen, onClose, isEnabled, onToggle, enableTwoFactor, disableTwoFactor }: TwoFactorModalProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'setup' | 'disable'>('confirm');

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const result = await enableTwoFactor();
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStep('setup');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось включить 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!verificationCode) {
      toast.error('Введите код подтверждения');
      return;
    }

    setIsLoading(true);
    try {
      await disableTwoFactor(verificationCode);
      onToggle();
      setVerificationCode('');
    } catch (error: any) {
      toast.error(error.message || 'Не удалось отключить 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onToggle();
    setStep('confirm');
    setQrCode('');
    setSecret('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEnabled ? 'Отключить 2FA' : 'Включить 2FA'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'confirm' && (
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-6">
                {isEnabled 
                  ? 'Вы уверены, что хотите отключить двухфакторную аутентификацию?'
                  : 'Включить двухфакторную аутентификацию для дополнительной безопасности?'
                }
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={isEnabled ? () => setStep('disable') : handleEnable}
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2 rounded-md text-white transition-colors disabled:opacity-50 ${
                    isEnabled 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isLoading ? 'Обработка...' : isEnabled ? 'Отключить' : 'Включить'}
                </button>
              </div>
            </div>
          )}

          {step === 'setup' && (
            <div className="text-center">
              <h4 className="text-md font-medium text-gray-900 mb-4">Настройка 2FA</h4>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600 mb-2">QR-код для приложения аутентификации:</p>
                <div className="w-32 h-32 bg-white border border-gray-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xs text-gray-500">QR-код</span>
                </div>
                <p className="text-xs text-gray-600">Секретный ключ: {secret}</p>
              </div>
              <button
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Завершить настройку
              </button>
            </div>
          )}

          {step === 'disable' && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Отключение 2FA</h4>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Код из приложения аутентификации
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Назад
                </button>
                <button
                  onClick={handleDisable}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Отключение...' : 'Отключить 2FA'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Delete Account Modal
interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmationText: string) => Promise<void>;
}

function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onConfirm(confirmationText);
    } catch (error: any) {
      toast.error(error.message || 'Не удалось удалить аккаунт');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-red-900">Удалить аккаунт</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Внимание!</h4>
                <p className="text-sm text-red-700 mt-1">
                  Это действие необратимо. Все ваши данные будут удалены навсегда.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Введите <strong>DELETE</strong> для подтверждения:
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="DELETE"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={handleDelete}
              disabled={confirmationText !== 'DELETE' || isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Удаление...' : 'Удалить аккаунт'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Deactivate Account Modal
interface DeactivateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}

function DeactivateAccountModal({ isOpen, onClose, onConfirm }: DeactivateAccountModalProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDeactivate = async () => {
    setIsLoading(true);
    try {
      await onConfirm(reason || undefined);
    } catch (error: any) {
      toast.error(error.message || 'Не удалось деактивировать аккаунт');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-yellow-900">Деактивировать аккаунт</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              Ваш профиль будет скрыт, но данные сохранятся. Вы сможете восстановить аккаунт позже.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Причина деактивации (необязательно):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="Расскажите, почему вы деактивируете аккаунт..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={handleDeactivate}
              disabled={isLoading}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Деактивация...' : 'Деактивировать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}