import React, { useState, useEffect } from 'react';
import { supportService, TicketWithMessages, SupportMessage } from '../../../services/supportService';
import { useAuth } from '../../../hooks/useAuth';
import {
  MessageCircle,
  Clock,
  User,
  Send,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
  Search,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export function SupportManagement() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketWithMessages[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  useEffect(() => {
    if (selectedTicket) {
      loadTicketDetails(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      let loadedTickets: TicketWithMessages[];

      if (filterStatus === 'all') {
        loadedTickets = await supportService.getAllTickets();
      } else {
        loadedTickets = await supportService.getTicketsByStatus(filterStatus as any);
      }

      setTickets(loadedTickets);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      toast.error('Не удалось загрузить обращения');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      const ticketDetails = await supportService.getTicketById(ticketId);
      if (ticketDetails) {
        setSelectedTicket(ticketDetails);
      }
    } catch (error) {
      console.error('Failed to load ticket details:', error);
      toast.error('Не удалось загрузить детали обращения');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket || !user?.id) return;

    setIsSending(true);
    try {
      await supportService.addMessage(selectedTicket.id, user.id, replyMessage, true);
      setReplyMessage('');

      await loadTicketDetails(selectedTicket.id);

      if (selectedTicket.status === 'open') {
        await supportService.updateTicketStatus(selectedTicket.id, 'in_progress');
      }

      toast.success('Ответ отправлен');
      await loadTickets();
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Не удалось отправить ответ');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      await supportService.updateTicketStatus(ticketId, status as any);
      toast.success('Статус обновлен');
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        await loadTicketDetails(ticketId);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Не удалось обновить статус');
    }
  };

  const handleAssignToMe = async (ticketId: string) => {
    if (!user?.id) return;

    try {
      await supportService.assignTicket(ticketId, user.id);
      toast.success('Обращение назначено на вас');
      await loadTickets();
      if (selectedTicket?.id === ticketId) {
        await loadTicketDetails(ticketId);
      }
    } catch (error) {
      console.error('Failed to assign ticket:', error);
      toast.error('Не удалось назначить обращение');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'resolved':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'closed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Открыто';
      case 'in_progress':
        return 'В работе';
      case 'resolved':
        return 'Решено';
      case 'closed':
        return 'Закрыто';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'normal':
        return 'text-blue-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Управление обращениями</h2>
          <p className="text-sm text-gray-600">Просмотр и ответы на обращения пользователей</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/3 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по теме..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Все обращения</option>
              <option value="open">Открытые</option>
              <option value="in_progress">В работе</option>
              <option value="resolved">Решенные</option>
              <option value="closed">Закрытые</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Обращений не найдено</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedTicket?.id === ticket.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                      {ticket.subject}
                    </h3>
                    <span className={`text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority === 'urgent' && '🔴'}
                      {ticket.priority === 'high' && '🟠'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <MessageCircle className="w-3 h-3" />
                      <span>{ticket.message_count}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:w-2/3">
          {selectedTicket ? (
            <div className="bg-gray-50 rounded-lg p-6 h-full flex flex-col">
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedTicket.subject}
                    </h3>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedTicket.status)}`}>
                        {getStatusLabel(selectedTicket.status)}
                      </span>
                      <span className={`text-sm font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                        Приоритет: {selectedTicket.priority === 'urgent' ? 'Срочно' :
                         selectedTicket.priority === 'high' ? 'Высокий' :
                         selectedTicket.priority === 'normal' ? 'Обычный' : 'Низкий'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center space-x-4 mt-4">
                  {selectedTicket.status !== 'closed' && (
                    <>
                      {!selectedTicket.assigned_to && (
                        <button
                          onClick={() => handleAssignToMe(selectedTicket.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                        >
                          Взять в работу
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
                        className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Решено</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}
                        className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 transition-colors flex items-center space-x-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Закрыть</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {selectedTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.is_staff_response
                        ? 'bg-blue-50 border border-blue-200 ml-8'
                        : 'bg-white border border-gray-200 mr-8'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {message.is_staff_response ? 'Поддержка' : 'Пользователь'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.message}</p>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="border-t border-gray-200 pt-4">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Введите ответ..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex items-center justify-end mt-3 space-x-2">
                    <button
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim() || isSending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSending ? 'Отправка...' : 'Отправить ответ'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Выберите обращение
                </h3>
                <p className="text-gray-600">
                  Выберите обращение из списка слева, чтобы просмотреть детали и ответить
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
