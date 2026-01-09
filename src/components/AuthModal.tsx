import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import toast from 'react-hot-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { signIn, signUp } = useAuth();
  const { t } = useTranslation();

  useBodyScrollLock(isOpen);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value.trim()) return t('profile.validation.emailRequired');
        if (!/\S+@\S+\.\S+/.test(value)) return t('profile.validation.emailInvalid');
        return '';
      case 'password':
        if (!value.trim()) return 'Пароль обязателен';
        if (value.length < 6) return t('auth.passwordTooShort');
        return '';
      case 'confirmPassword':
        if (mode === 'signup' && value !== password) return 'Пароли не совпадают';
        return '';
      case 'username':
        if (mode === 'signup' && !value.trim()) return 'Полное имя обязательно';
        if (mode === 'signup' && value.length < 2) return 'Минимум 2 символа';
        if (mode === 'signup' && value.length > 100) return 'Максимум 100 символов';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    if (name === 'email') setEmail(value);
    else if (name === 'password') setPassword(value);
    else if (name === 'confirmPassword') setConfirmPassword(value);
    else if (name === 'username') setUsername(value);

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    const fields = ['email', 'password'];
    if (mode === 'signup') {
      fields.push('confirmPassword', 'username');
    }

    fields.forEach(field => {
      newTouched[field] = true;
      const value = field === 'email' ? email
        : field === 'password' ? password
        : field === 'confirmPassword' ? confirmPassword
        : username;
      const error = validateField(field, value);
      if (error) newErrors[field] = error;
    });

    setTouched(newTouched);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.name === 'AccountBlockedError') {
            setErrors({ email: error.message });
          } else if (error.message.includes('Invalid login credentials')) {
            setErrors({ email: t('auth.invalidCredentials') });
          } else if (error.message.includes('Email not confirmed')) {
            setErrors({ email: t('auth.emailNotConfirmed') });
          } else {
            setErrors({ email: error.message });
          }
        } else {
          toast.success(t('auth.signInSuccess'));
          onClose();
        }
      } else {
        const { data, error } = await signUp(email, password, username);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error(t('auth.userAlreadyExists'));
            setMode('signin');
          } else if (error.message.includes('Password should be at least')) {
            toast.error(t('auth.passwordTooShort'));
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(t('auth.accountCreated'));
          onClose();
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast.error(t('auth.authFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setErrors({});
    setTouched({});
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={(e) => handleBlur('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t('profile.placeholders.email')}
              />
            </div>
            {touched.email && errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Полное имя
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleFieldChange('username', e.target.value)}
                  onBlur={(e) => handleBlur('username', e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Введите ваше полное имя"
                />
              </div>
              {touched.username && errors.username && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.username}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                onBlur={(e) => handleBlur('password', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Введите ваш пароль"
              />
            </div>
            {touched.password && errors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.password}
              </p>
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  onBlur={(e) => handleBlur('confirmPassword', e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Подтвердите ваш пароль"
                />
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('common.loading') : mode === 'signin' ? t('auth.signIn') : t('auth.createAccount')}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-gray-600">
            {mode === 'signin' ? t('auth.noAccount') : t('auth.alreadyHaveAccount')}
            <button
              onClick={switchMode}
              className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
            >
              {mode === 'signin' ? t('auth.signUpLink') : t('auth.signInLink')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}