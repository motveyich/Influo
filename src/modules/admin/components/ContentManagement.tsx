import React, { useState, useEffect } from 'react';
import { PlatformUpdate, PlatformEvent } from '../../../core/types';
import { contentManagementService } from '../../../services/contentManagementService';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Bell,
  Calendar,
  Filter,
  Search,
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

type ContentType = 'updates' | 'events';

const getTabIcon = (tab: ContentType) => {
  switch (tab) {
    case 'updates':
      return <Bell className="w-4 h-4" />;
    case 'events':
      return <Calendar className="w-4 h-4" />;
  }
};

const getTabLabel = (tab: ContentType) => {
  switch (tab) {
    case 'updates':
      return 'Обновления';
    case 'events':
      return 'События';
  }
};

interface ContentManagementProps {
  onStatsUpdate: () => void;
}

export function ContentManagement({ onStatsUpdate }: ContentManagementProps) {
  const [activeTab, setActiveTab] = useState<ContentType>('updates');
  const [updates, setUpdates] = useState<PlatformUpdate[]>([]);
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'unpublished'>('all');

  const { user } = useAuth();

  useEffect(() => {
    loadContent();
  }, [activeTab, publishedFilter]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      
      const isPublished = publishedFilter === 'all' ? undefined : publishedFilter === 'published';
      
      if (activeTab === 'updates') {
        const updatesData = await contentManagementService.getAllUpdates({ isPublished });
        setUpdates(updatesData);
      } else if (activeTab === 'events') {
        const eventsData = await contentManagementService.getAllEvents({ isPublished });
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
      toast.error('Не удалось загрузить контент');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот элемент?')) return;

    try {
      if (activeTab === 'updates') {
        await contentManagementService.deleteUpdate(itemId, user!.id);
      } else if (activeTab === 'events') {
        await contentManagementService.deleteEvent(itemId, user!.id);
      }

      await loadContent();
      onStatsUpdate();
      toast.success('Элемент удален');
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      toast.error(error.message || 'Не удалось удалить элемент');
    }
  };

  const handleTogglePublished = async (item: any) => {
    try {
      const updates = { isPublished: !item.isPublished };
      
      if (activeTab === 'updates') {
        await contentManagementService.updateUpdate(item.id, updates, user!.id);
      } else if (activeTab === 'events') {
        await contentManagementService.updateEvent(item.id, updates, user!.id);
      }

      await loadContent();
      toast.success(item.isPublished ? 'Скрыто с главной страницы' : 'Опубликовано на главной странице');
    } catch (error: any) {
      console.error('Failed to toggle published status:', error);
      toast.error(error.message || 'Не удалось изменить статус публикации');
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'updates':
        return updates.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      case 'events':
        return events.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      default:
        return [];
    }
  };

  const getItemIcon = (item: any) => {
    if (activeTab === 'updates') {
      return <Bell className="w-4 h-4 text-purple-600" />;
    } else {
      return <Calendar className="w-4 h-4 text-green-600" />;
    }
  };

  const filteredData = getCurrentData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Управление контентом</h2>
          <p className="text-sm text-gray-600">Управление обновлениями и событиями платформы</p>
        </div>
        
        <button
          onClick={handleCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Создать {getTabLabel(activeTab).toLowerCase()}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {(['updates', 'events'] as ContentType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {getTabIcon(tab)}
              <span>{getTabLabel(tab)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Поиск ${getTabLabel(activeTab).toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={publishedFilter}
          onChange={(e) => setPublishedFilter(e.target.value as any)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">Все</option>
          <option value="published">Опубликованные</option>
          <option value="unpublished">Неопубликованные</option>
        </select>
      </div>

      {/* Content List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка контента...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12">
            {getTabIcon(activeTab)}
            <div className="w-12 h-12 text-gray-400 mx-auto mb-4">
              {getTabIcon(activeTab)}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {getTabLabel(activeTab)} не найдены
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || publishedFilter !== 'all' 
                ? 'Попробуйте изменить фильтры поиска'
                : `Создайте первую запись в разделе ${getTabLabel(activeTab).toLowerCase()}`
              }
            </p>
            <button
              onClick={handleCreate}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Создать {getTabLabel(activeTab).toLowerCase()}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredData.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getItemIcon(item)}
                      <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.isPublished 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.isPublished ? 'Опубликовано' : 'Черновик'}
                      </span>
                      
                      {activeTab === 'news' && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          (item as PlatformNews).category === 'industry' ? 'bg-blue-100 text-blue-700' :
                          (item as PlatformNews).category === 'platform' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {(item as PlatformNews).category === 'industry' ? 'Индустрия' :
                           (item as PlatformNews).category === 'platform' ? 'Платформа' :
                           'Тренды'}
                        </span>
                      )}
                      
                      {activeTab === 'updates' && (item as PlatformUpdate).isImportant && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Важно
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {activeTab === 'updates' ? (item as PlatformUpdate).description :
                       (item as PlatformEvent).description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        Опубликовано: {new Date(item.publishedAt).toLocaleDateString('ru-RU')}
                      </span>
                      <span>
                        Создано: {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                      {activeTab === 'events' && (item as PlatformEvent).participantCount && (
                        <span>
                          Участников: {(item as PlatformEvent).participantCount}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleTogglePublished(item)}
                      className={`p-2 rounded-md transition-colors ${
                        item.isPublished
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={item.isPublished ? 'Скрыть' : 'Опубликовать'}
                    >
                      {item.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Редактировать"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content Modal */}
      <ContentModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        contentType={activeTab}
        editingItem={editingItem}
        onSaved={() => {
          loadContent();
          onStatsUpdate();
          setShowModal(false);
          setEditingItem(null);
        }}
      />
    </div>
  );
}

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: ContentType;
  editingItem?: any;
  onSaved: () => void;
}

function ContentModal({ isOpen, onClose, contentType, editingItem, onSaved }: ContentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    description: '',
    content: '',
    url: '',
    source: '',
    category: 'industry',
    type: 'feature',
    isImportant: false,
    participantCount: 0,
    publishedAt: new Date().toISOString().split('T')[0],
    isPublished: true
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        title: editingItem.title || '',
        summary: editingItem.summary || '',
        description: editingItem.description || '',
        content: editingItem.content || '',
        url: editingItem.url || '',
        source: editingItem.source || '',
        category: editingItem.category || 'industry',
        type: editingItem.type || 'feature',
        isImportant: editingItem.isImportant || false,
        participantCount: editingItem.participantCount || 0,
        publishedAt: editingItem.publishedAt ? editingItem.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0],
        isPublished: editingItem.isPublished ?? true
      });
    } else {
      setFormData({
        title: '',
        summary: '',
        description: '',
        content: '',
        url: '',
        source: '',
        category: 'industry',
        type: 'feature',
        isImportant: false,
        participantCount: 0,
        publishedAt: new Date().toISOString().split('T')[0],
        isPublished: true
      });
    }
    setErrors({});
  }, [editingItem, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Заголовок обязателен';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание обязательно';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки перед сохранением');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        ...formData,
        publishedAt: new Date(formData.publishedAt).toISOString()
      };

      if (editingItem) {
        // Update existing item
        if (contentType === 'updates') {
          await contentManagementService.updateUpdate(editingItem.id, data, user!.id);
        } else if (contentType === 'events') {
          await contentManagementService.updateEvent(editingItem.id, data, user!.id);
        }
        toast.success('Элемент обновлен');
      } else {
        // Create new item
        if (contentType === 'updates') {
          await contentManagementService.createUpdate(data, user!.id);
        } else if (contentType === 'events') {
          await contentManagementService.createEvent(data, user!.id);
        }
        toast.success('Элемент создан');
      }

      onSaved();
    } catch (error: any) {
      console.error('Failed to save item:', error);
      toast.error(error.message || 'Не удалось сохранить элемент');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingItem ? 'Редактировать' : 'Создать'} {getTabLabel(contentType).toLowerCase()}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Введите заголовок"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Описание обновления или события"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.description}
              </p>
            )}
          </div>


          {/* Type (for updates/events) */}
          {contentType === 'updates' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип обновления
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="feature">Новая функция</option>
                <option value="improvement">Улучшение</option>
                <option value="announcement">Объявление</option>
                <option value="maintenance">Техническое обслуживание</option>
              </select>
            </div>
          )}

          {contentType === 'events' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип события
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="campaign_launch">Запуск кампании</option>
                  <option value="achievement">Достижение</option>
                  <option value="contest">Конкурс</option>
                  <option value="milestone">Веха</option>
                  <option value="announcement">Объявление</option>
                  <option value="maintenance">Техническое обслуживание</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество участников
                </label>
                <input
                  type="number"
                  value={formData.participantCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, participantCount: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          )}


          {/* Published Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата публикации
            </label>
            <input
              type="date"
              value={formData.publishedAt}
              onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Полный текст (опционально)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Полный текст статьи или подробное описание"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Опубликовать на главной странице</span>
            </label>

            {contentType === 'updates' && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isImportant}
                  onChange={(e) => setFormData(prev => ({ ...prev, isImportant: e.target.checked }))}
                  className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Важное обновление</span>
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}