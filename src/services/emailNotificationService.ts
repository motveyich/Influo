import { supabase } from '../core/supabase';

export interface EmailNotificationData {
  userName?: string;
  content?: string;
  campaignName?: string;
  rating?: number;
  senderName?: string;
}

export type NotificationType = 'platform_update' | 'new_application' | 'new_review' | 'new_message';

class EmailNotificationService {
  private async sendEmail(
    userId: string,
    type: NotificationType,
    subject: string,
    data: EmailNotificationData
  ): Promise<void> {
    try {
      await supabase.functions.invoke('send-email-notification', {
        body: {
          userId,
          type,
          subject,
          data
        }
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  async sendPlatformUpdateNotification(userId: string, updateContent: string): Promise<void> {
    await this.sendEmail(
      userId,
      'platform_update',
      'Обновление платформы',
      { content: updateContent }
    );
  }

  async sendNewApplicationNotification(
    userId: string,
    campaignName: string,
    applicantInfo: string
  ): Promise<void> {
    await this.sendEmail(
      userId,
      'new_application',
      'Новая заявка на сотрудничество',
      {
        campaignName,
        content: applicantInfo
      }
    );
  }

  async sendNewReviewNotification(
    userId: string,
    rating: number,
    reviewText: string
  ): Promise<void> {
    await this.sendEmail(
      userId,
      'new_review',
      'Новый отзыв о вашей работе',
      {
        rating,
        content: reviewText
      }
    );
  }

  async sendNewMessageNotification(
    userId: string,
    senderName: string,
    messagePreview: string
  ): Promise<void> {
    await this.sendEmail(
      userId,
      'new_message',
      `Новое сообщение от ${senderName}`,
      {
        senderName,
        content: messagePreview
      }
    );
  }
}

export const emailNotificationService = new EmailNotificationService();
