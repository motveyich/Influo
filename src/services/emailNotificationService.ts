import { profileService } from '../modules/profiles/services/profileService';

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
    let userData;
    try {
      userData = await profileService.getProfile(userId);
      if (!userData?.email) {
        console.error('User profile or email not found');
        return;
      }
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return;
    }

    const notificationTypeMapping: Record<NotificationType, keyof typeof userData.settings.notifications.email> = {
      platform_update: 'marketing',
      new_application: 'applications',
      new_review: 'reviews',
      new_message: 'messages'
    };

    const settingKey = notificationTypeMapping[type];
    const emailEnabled = userData.settings?.notifications?.email?.[settingKey];

    if (!emailEnabled) {
      console.log(`Email notifications disabled for ${type} by user ${userId}`);
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-notification`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: userData.email,
          subject,
          type,
          data: {
            ...data,
            userName: userData.email.split('@')[0]
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email notification');
      }

      console.log(`Email notification sent to ${userData.email}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
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
