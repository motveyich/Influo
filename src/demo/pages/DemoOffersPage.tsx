import React from 'react';
import { Check, X, Calendar, DollarSign, Eye } from 'lucide-react';
import { useDemoToast } from '../DemoToast';
import { mockOffers, demoToastMessages } from '../mockData';

export function DemoOffersPage() {
  const { showToast, ToastContainer } = useDemoToast();

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Предложения о сотрудничестве
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Управляйте предложениями от брендов
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => showToast('В полной версии здесь отображается общее количество полученных предложений.')}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Всего предложений</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">12</p>
        </div>
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => showToast('Ожидающие — это предложения, которые требуют вашего решения.')}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ожидают ответа</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">8</p>
        </div>
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => showToast('Принятые предложения переходят в активные сделки с контрактами и платежами.')}
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Принято</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-500">4</p>
        </div>
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {mockOffers.map((offer) => (
          <div
            key={offer.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
          >
            <div className="flex flex-col lg:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {offer.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      От: {offer.brand}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                    Ожидает
                  </span>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {offer.description}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Бюджет: {offer.budget}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Дедлайн: {new Date(offer.deadline).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Получено: {new Date(offer.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>

              <div className="flex lg:flex-col gap-2">
                <button
                  onClick={() => showToast(demoToastMessages.acceptOffer)}
                  className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Принять</span>
                </button>
                <button
                  onClick={() => showToast(demoToastMessages.rejectOffer)}
                  className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Отклонить</span>
                </button>
                <button
                  onClick={() => showToast('В реальной версии здесь открывается детальная информация о предложении с полными условиями сотрудничества.')}
                  className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Детали</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
          Как работают предложения?
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li className="flex items-start">
            <span className="mr-2">1.</span>
            <span>Бренды отправляют вам предложения на основе вашего профиля и статистики</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">2.</span>
            <span>Вы рассматриваете условия и можете принять или отклонить предложение</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">3.</span>
            <span>После принятия создаётся контракт и открывается чат для обсуждения деталей</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">4.</span>
            <span>Платёж проходит через платформу после выполнения работы</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
