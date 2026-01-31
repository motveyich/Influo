import { ChatMessage } from '../../../core/types';

export type ConversationStage = 'initial' | 'negotiation' | 'active' | 'completion' | 'unknown';

export interface LocalAISuggestion {
  id: string;
  type: 'template' | 'checklist' | 'warning' | 'tip';
  category: 'greeting' | 'negotiation' | 'confirmation' | 'payment' | 'completion' | 'general';
  title: string;
  content: string;
  priority: number;
  conditions?: string[];
}

export interface ConversationAnalysis {
  stage: ConversationStage;
  messageCount: number;
  hasAgreement: boolean;
  hasPriceDiscussion: boolean;
  hasDeadline: boolean;
  hasDeliverables: boolean;
  missingElements: string[];
  risks: string[];
  suggestions: LocalAISuggestion[];
}

export class AILocalRules {
  analyzeConversation(messages: ChatMessage[], currentUserId: string): ConversationAnalysis {
    const stage = this.detectStage(messages);
    const messageCount = messages.length;

    const textContent = messages.map(m => m.content.toLowerCase()).join(' ');

    const hasAgreement = this.checkForAgreement(textContent);
    const hasPriceDiscussion = this.checkForPrice(textContent);
    const hasDeadline = this.checkForDeadline(textContent);
    const hasDeliverables = this.checkForDeliverables(textContent);

    const missingElements = this.identifyMissingElements({
      hasAgreement,
      hasPriceDiscussion,
      hasDeadline,
      hasDeliverables,
      stage
    });

    const risks = this.identifyRisks(messages, textContent);
    const suggestions = this.generateSuggestions(stage, {
      hasAgreement,
      hasPriceDiscussion,
      hasDeadline,
      hasDeliverables,
      messageCount
    });

    return {
      stage,
      messageCount,
      hasAgreement,
      hasPriceDiscussion,
      hasDeadline,
      hasDeliverables,
      missingElements,
      risks,
      suggestions
    };
  }

  private detectStage(messages: ChatMessage[]): ConversationStage {
    if (messages.length <= 3) return 'initial';

    const textContent = messages.map(m => m.content.toLowerCase()).join(' ');

    const completionKeywords = ['завершили', 'готово', 'выполнено', 'спасибо за сотрудничество', 'оплачено'];
    const negotiationKeywords = ['цена', 'стоимость', 'бюджет', 'условия', 'срок', 'deadline', 'deliverables'];
    const activeKeywords = ['начинаем', 'приступаем', 'договорились', 'согласен', 'deal', 'в работе'];

    if (completionKeywords.some(kw => textContent.includes(kw))) return 'completion';
    if (activeKeywords.some(kw => textContent.includes(kw))) return 'active';
    if (negotiationKeywords.some(kw => textContent.includes(kw))) return 'negotiation';

    return messages.length > 5 ? 'negotiation' : 'initial';
  }

  private checkForAgreement(text: string): boolean {
    const agreementKeywords = [
      'договорились', 'согласен', 'согласна', 'deal', 'ok', 'окей',
      'принято', 'подходит', 'устраивает', 'да, давайте'
    ];
    return agreementKeywords.some(kw => text.includes(kw));
  }

  private checkForPrice(text: string): boolean {
    const priceKeywords = ['₽', '$', 'руб', 'рублей', 'dollars', 'цена', 'стоимость', 'бюджет', 'оплата', 'payment'];
    const hasNumbers = /\d+/.test(text);
    return hasNumbers && priceKeywords.some(kw => text.includes(kw));
  }

  private checkForDeadline(text: string): boolean {
    const deadlineKeywords = [
      'дней', 'недел', 'месяц', 'срок', 'deadline', 'до ',
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return deadlineKeywords.some(kw => text.includes(kw));
  }

  private checkForDeliverables(text: string): boolean {
    const deliverablesKeywords = [
      'пост', 'видео', 'stories', 'сторис', 'рилс', 'reels',
      'контент', 'публикация', 'интеграция', 'размещение'
    ];
    return deliverablesKeywords.some(kw => text.includes(kw));
  }

  private identifyMissingElements(elements: {
    hasAgreement: boolean;
    hasPriceDiscussion: boolean;
    hasDeadline: boolean;
    hasDeliverables: boolean;
    stage: ConversationStage;
  }): string[] {
    const missing: string[] = [];

    if (elements.stage === 'negotiation' || elements.stage === 'active') {
      if (!elements.hasPriceDiscussion) missing.push('Обсуждение цены/бюджета');
      if (!elements.hasDeadline) missing.push('Сроки выполнения');
      if (!elements.hasDeliverables) missing.push('Что именно нужно сделать');
    }

    if (elements.stage === 'active' && !elements.hasAgreement) {
      missing.push('Явное подтверждение договоренностей');
    }

    return missing;
  }

  private identifyRisks(messages: ChatMessage[], text: string): string[] {
    const risks: string[] = [];

    if (messages.length > 10 && !this.checkForAgreement(text)) {
      risks.push('Долгое обсуждение без явного согласия - уточните договоренности');
    }

    if (this.checkForPrice(text) && !this.checkForDeadline(text)) {
      risks.push('Обсуждается оплата, но не указаны сроки');
    }

    const vaguePhrases = ['возможно', 'может быть', 'посмотрим', 'постараюсь'];
    if (vaguePhrases.some(phrase => text.includes(phrase))) {
      risks.push('Присутствуют неопределенные формулировки');
    }

    if (!this.checkForDeliverables(text) && messages.length > 5) {
      risks.push('Не конкретизировано, что нужно сделать');
    }

    return risks;
  }

  private generateSuggestions(
    stage: ConversationStage,
    context: {
      hasAgreement: boolean;
      hasPriceDiscussion: boolean;
      hasDeadline: boolean;
      hasDeliverables: boolean;
      messageCount: number;
    }
  ): LocalAISuggestion[] {
    const suggestions: LocalAISuggestion[] = [];
    let id = 1;

    switch (stage) {
      case 'initial':
        suggestions.push({
          id: `sugg_${id++}`,
          type: 'template',
          category: 'greeting',
          title: 'Представьтесь',
          content: 'Здравствуйте! Меня заинтересовало ваше предложение. Расскажите подробнее об условиях сотрудничества?',
          priority: 10
        });
        suggestions.push({
          id: `sugg_${id++}`,
          type: 'tip',
          category: 'general',
          title: 'Совет',
          content: 'Начните с уточнения базовых условий: что нужно сделать, сроки и бюджет',
          priority: 8
        });
        break;

      case 'negotiation':
        if (!context.hasPriceDiscussion) {
          suggestions.push({
            id: `sugg_${id++}`,
            type: 'template',
            category: 'negotiation',
            title: 'Обсудить бюджет',
            content: 'Какой бюджет вы закладываете на этот проект?',
            priority: 10
          });
        }

        if (!context.hasDeadline) {
          suggestions.push({
            id: `sugg_${id++}`,
            type: 'template',
            category: 'negotiation',
            title: 'Уточнить сроки',
            content: 'Какие сроки выполнения вы рассматриваете?',
            priority: 9
          });
        }

        if (!context.hasDeliverables) {
          suggestions.push({
            id: `sugg_${id++}`,
            type: 'template',
            category: 'negotiation',
            title: 'Уточнить детали',
            content: 'Давайте конкретизируем: какой формат контента вам нужен и сколько публикаций?',
            priority: 9
          });
        }

        suggestions.push({
          id: `sugg_${id++}`,
          type: 'checklist',
          category: 'negotiation',
          title: 'Чек-лист переговоров',
          content: 'Убедитесь что обсудили: формат контента, количество, сроки, бюджет, условия оплаты',
          priority: 7
        });
        break;

      case 'active':
        if (!context.hasAgreement) {
          suggestions.push({
            id: `sugg_${id++}`,
            type: 'warning',
            category: 'confirmation',
            title: 'Зафиксируйте договоренности',
            content: 'Рекомендуем четко зафиксировать все договоренности перед началом работы',
            priority: 10
          });

          suggestions.push({
            id: `sugg_${id++}`,
            type: 'template',
            category: 'confirmation',
            title: 'Подтвердить условия',
            content: 'Отлично! Подведу итог наших договоренностей: [перечислите согласованные условия]. Все верно?',
            priority: 9
          });
        }

        suggestions.push({
          id: `sugg_${id++}`,
          type: 'tip',
          category: 'general',
          title: 'Совет',
          content: 'Держите партнера в курсе прогресса работы',
          priority: 6
        });
        break;

      case 'completion':
        suggestions.push({
          id: `sugg_${id++}`,
          type: 'template',
          category: 'completion',
          title: 'Завершить сделку',
          content: 'Работа завершена. Буду рад(а) сотрудничеству в будущем!',
          priority: 8
        });

        suggestions.push({
          id: `sugg_${id++}`,
          type: 'tip',
          category: 'general',
          title: 'Не забудьте',
          content: 'Попросите оставить отзыв после завершения сотрудничества',
          priority: 7
        });
        break;
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  getSummary(messages: ChatMessage[]): string {
    const analysis = this.analyzeConversation(messages, '');

    const parts: string[] = [];

    parts.push(`Этап: ${this.getStageLabel(analysis.stage)}`);
    parts.push(`Сообщений: ${analysis.messageCount}`);

    if (analysis.hasAgreement) parts.push('Есть согласие');
    if (analysis.hasPriceDiscussion) parts.push('Обсуждена цена');
    if (analysis.hasDeadline) parts.push('Указаны сроки');
    if (analysis.hasDeliverables) parts.push('Определены задачи');

    if (analysis.missingElements.length > 0) {
      parts.push(`\nНе хватает: ${analysis.missingElements.join(', ')}`);
    }

    if (analysis.risks.length > 0) {
      parts.push(`\nВнимание: ${analysis.risks[0]}`);
    }

    return parts.join('\n');
  }

  private getStageLabel(stage: ConversationStage): string {
    switch (stage) {
      case 'initial': return 'Начало общения';
      case 'negotiation': return 'Обсуждение условий';
      case 'active': return 'Активное сотрудничество';
      case 'completion': return 'Завершение';
      default: return 'Неизвестно';
    }
  }

  getQuickReplies(stage: ConversationStage): string[] {
    switch (stage) {
      case 'initial':
        return [
          'Интересное предложение! Расскажите подробнее',
          'Какие условия сотрудничества?',
          'Спасибо за обращение. Давайте обсудим детали'
        ];

      case 'negotiation':
        return [
          'Меня устраивают эти условия',
          'Можем обсудить другой вариант?',
          'Давайте зафиксируем договоренности'
        ];

      case 'active':
        return [
          'Работа в процессе, держу в курсе',
          'Отправил(а) материалы на проверку',
          'Есть вопрос по проекту'
        ];

      case 'completion':
        return [
          'Работа завершена, жду обратной связи',
          'Спасибо за сотрудничество!',
          'Буду рад(а) продолжить работу'
        ];

      default:
        return [
          'Спасибо за сообщение',
          'Понятно, согласен(на)',
          'Хорошо, давайте так и сделаем'
        ];
    }
  }
}

export const aiLocalRules = new AILocalRules();
