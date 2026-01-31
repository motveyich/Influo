import { api } from '../core/api';
import { PlatformUpdate, PlatformEvent } from '../core/types';
import { roleService } from './roleService';
import { adminService } from './adminService';

export class ContentManagementService {

  async createUpdate(updateData: Partial<PlatformUpdate>, createdBy: string): Promise<PlatformUpdate> {
    try {
      const hasPermission = await roleService.checkPermission(createdBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const data = await api.post('/content-management/updates', updateData);

      await adminService.logAction(createdBy, 'update_created', 'platform_updates', data.id, {
        title: updateData.title,
        type: updateData.type
      });

      return this.transformUpdateFromDatabase(data);
    } catch (error) {
      console.error('Failed to create update:', error);
      throw error;
    }
  }

  async updateUpdate(updateId: string, updateData: Partial<PlatformUpdate>, userId: string): Promise<PlatformUpdate> {
    try {
      const hasPermission = await roleService.checkPermission(userId, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const data = await api.patch(`/content-management/updates/${updateId}`, updateData);

      await adminService.logAction(userId, 'update_updated', 'platform_updates', updateId, {
        changes: updateData
      });

      return this.transformUpdateFromDatabase(data);
    } catch (error) {
      console.error('Failed to update update:', error);
      throw error;
    }
  }

  async deleteUpdate(updateId: string, userId: string): Promise<void> {
    try {
      const hasPermission = await roleService.checkPermission(userId, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      await api.delete(`/content-management/updates/${updateId}`);

      await adminService.logAction(userId, 'update_deleted', 'platform_updates', updateId);
    } catch (error) {
      console.error('Failed to delete update:', error);
      throw error;
    }
  }

  async getUpdates(filters?: { type?: string; priority?: string; isPublished?: boolean }): Promise<PlatformUpdate[]> {
    try {
      const params: any = {};
      if (filters?.type) params.type = filters.type;
      if (filters?.priority) params.priority = filters.priority;
      if (filters?.isPublished !== undefined) params.is_published = filters.isPublished;

      const data = await api.get('/content-management/updates', { params });
      return data.map(this.transformUpdateFromDatabase);
    } catch (error) {
      console.error('Failed to get updates:', error);
      return [];
    }
  }

  async getAllUpdates(filters?: { isPublished?: boolean }): Promise<PlatformUpdate[]> {
    return this.getUpdates(filters);
  }

  async getPublishedUpdates(): Promise<PlatformUpdate[]> {
    try {
      const data = await api.get('/content-management/updates/published');
      return data.map(this.transformUpdateFromDatabase);
    } catch (error) {
      console.error('Failed to get published updates:', error);
      return [];
    }
  }

  async createEvent(eventData: Partial<PlatformEvent>, createdBy: string): Promise<PlatformEvent> {
    try {
      const hasPermission = await roleService.checkPermission(createdBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const data = await api.post('/content-management/events', eventData);

      await adminService.logAction(createdBy, 'event_created', 'platform_events', data.id, {
        title: eventData.title,
        event_type: eventData.type
      });

      return this.transformEventFromDatabase(data);
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, eventData: Partial<PlatformEvent>, userId: string): Promise<PlatformEvent> {
    try {
      const hasPermission = await roleService.checkPermission(userId, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const data = await api.patch(`/content-management/events/${eventId}`, eventData);

      await adminService.logAction(userId, 'event_updated', 'platform_events', eventId, {
        changes: eventData
      });

      return this.transformEventFromDatabase(data);
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    try {
      const hasPermission = await roleService.checkPermission(userId, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      await api.delete(`/content-management/events/${eventId}`);

      await adminService.logAction(userId, 'event_deleted', 'platform_events', eventId);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  async getEvents(filters?: { eventType?: string; isPublished?: boolean }): Promise<PlatformEvent[]> {
    try {
      const params: any = {};
      if (filters?.eventType) params.event_type = filters.eventType;
      if (filters?.isPublished !== undefined) params.is_published = filters.isPublished;

      const data = await api.get('/content-management/events', { params });
      return data.map(this.transformEventFromDatabase);
    } catch (error) {
      console.error('Failed to get events:', error);
      return [];
    }
  }

  async getAllEvents(filters?: { isPublished?: boolean }): Promise<PlatformEvent[]> {
    return this.getEvents(filters);
  }

  async getPublishedEvents(): Promise<PlatformEvent[]> {
    try {
      const data = await api.get('/content-management/events/published');
      return data.map(this.transformEventFromDatabase);
    } catch (error) {
      console.error('Failed to get published events:', error);
      return [];
    }
  }

  private transformUpdateFromDatabase(data: any): PlatformUpdate {
    return {
      id: data.id,
      title: data.title,
      summary: data.summary,
      description: data.content || data.description || data.summary || '',
      content: data.content,
      type: data.type,
      priority: data.priority,
      url: data.url,
      source: data.source,
      isImportant: data.is_important || false,
      publishedAt: data.published_at || data.created_at,
      isPublished: data.is_published ?? false,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private transformEventFromDatabase(data: any): PlatformEvent {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.event_type || data.type,
      participantCount: data.participant_count || 0,
      publishedAt: data.published_at || data.start_date || data.created_at,
      isPublished: data.is_published ?? false,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const contentManagementService = new ContentManagementService();
