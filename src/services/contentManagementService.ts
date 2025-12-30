import { supabase, TABLES } from '../core/supabase';
import { PlatformUpdate, PlatformEvent } from '../core/types';
import { roleService } from './roleService';
import { adminService } from './adminService';

export class ContentManagementService {

  // Updates Management
  async createUpdate(updateData: Partial<PlatformUpdate>, createdBy: string): Promise<PlatformUpdate> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(createdBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const newUpdate = {
        title: updateData.title,
        description: updateData.description,
        content: updateData.content,
        type: updateData.type || 'feature',
        is_important: updateData.isImportant || false,
        published_at: updateData.publishedAt || new Date().toISOString(),
        is_published: updateData.isPublished ?? true,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.PLATFORM_UPDATES)
        .insert([newUpdate])
        .select()
        .single();

      if (error) throw error;

      // Log the action
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

  async updateUpdate(updateId: string, updates: Partial<PlatformUpdate>, updatedBy: string): Promise<PlatformUpdate> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(updatedBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const updateData = {
        title: updates.title,
        description: updates.description,
        content: updates.content,
        type: updates.type,
        is_important: updates.isImportant,
        published_at: updates.publishedAt,
        is_published: updates.isPublished,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.PLATFORM_UPDATES)
        .update(updateData)
        .eq('id', updateId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await adminService.logAction(updatedBy, 'update_updated', 'platform_updates', updateId, {
        updated_fields: Object.keys(updates)
      });

      return this.transformUpdateFromDatabase(data);
    } catch (error) {
      console.error('Failed to update update:', error);
      throw error;
    }
  }

  async deleteUpdate(updateId: string, deletedBy: string): Promise<void> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(deletedBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const { error } = await supabase
        .from(TABLES.PLATFORM_UPDATES)
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      // Log the action
      await adminService.logAction(deletedBy, 'update_deleted', 'platform_updates', updateId);
    } catch (error) {
      console.error('Failed to delete update:', error);
      throw error;
    }
  }

  async getAllUpdates(filters?: {
    type?: string;
    isPublished?: boolean;
  }): Promise<PlatformUpdate[]> {
    try {
      let query = supabase
        .from(TABLES.PLATFORM_UPDATES)
        .select('*');

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      if (filters?.isPublished !== undefined) {
        query = query.eq('is_published', filters.isPublished);
      }

      query = query.order('published_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(update => this.transformUpdateFromDatabase(update));
    } catch (error) {
      console.error('Failed to get all updates:', error);
      throw error;
    }
  }

  async getPublishedUpdates(): Promise<PlatformUpdate[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PLATFORM_UPDATES)
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return data.map(update => this.transformUpdateFromDatabase(update));
    } catch (error) {
      console.error('Failed to get published updates:', error);
      return [];
    }
  }

  // Events Management
  async createEvent(eventData: Partial<PlatformEvent>, createdBy: string): Promise<PlatformEvent> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(createdBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const newEvent = {
        title: eventData.title,
        description: eventData.description,
        content: eventData.content,
        type: eventData.type || 'announcement',
        participant_count: eventData.participantCount || 0,
        published_at: eventData.publishedAt || new Date().toISOString(),
        is_published: eventData.isPublished ?? true,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.PLATFORM_EVENTS)
        .insert([newEvent])
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await adminService.logAction(createdBy, 'event_created', 'platform_events', data.id, {
        title: eventData.title,
        type: eventData.type
      });

      return this.transformEventFromDatabase(data);
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, updates: Partial<PlatformEvent>, updatedBy: string): Promise<PlatformEvent> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(updatedBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const updateData = {
        title: updates.title,
        description: updates.description,
        content: updates.content,
        type: updates.type,
        participant_count: updates.participantCount,
        published_at: updates.publishedAt,
        is_published: updates.isPublished,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLES.PLATFORM_EVENTS)
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await adminService.logAction(updatedBy, 'event_updated', 'platform_events', eventId, {
        updated_fields: Object.keys(updates)
      });

      return this.transformEventFromDatabase(data);
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string, deletedBy: string): Promise<void> {
    try {
      // Check permissions
      const hasPermission = await roleService.checkPermission(deletedBy, 'moderator');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const { error } = await supabase
        .from(TABLES.PLATFORM_EVENTS)
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Log the action
      await adminService.logAction(deletedBy, 'event_deleted', 'platform_events', eventId);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  async getAllEvents(filters?: {
    type?: string;
    isPublished?: boolean;
  }): Promise<PlatformEvent[]> {
    try {
      let query = supabase
        .from(TABLES.PLATFORM_EVENTS)
        .select('*');

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      if (filters?.isPublished !== undefined) {
        query = query.eq('is_published', filters.isPublished);
      }

      query = query.order('published_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(event => this.transformEventFromDatabase(event));
    } catch (error) {
      console.error('Failed to get all events:', error);
      throw error;
    }
  }

  async getPublishedEvents(): Promise<PlatformEvent[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PLATFORM_EVENTS)
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return data.map(event => this.transformEventFromDatabase(event));
    } catch (error) {
      console.error('Failed to get published events:', error);
      return [];
    }
  }

  // Transform functions

  private transformUpdateFromDatabase(dbData: any): PlatformUpdate {
    return {
      id: dbData.id,
      title: dbData.title,
      description: dbData.description,
      content: dbData.content,
      type: dbData.type,
      isImportant: dbData.is_important,
      publishedAt: dbData.published_at,
      isPublished: dbData.is_published,
      createdBy: dbData.created_by,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformEventFromDatabase(dbData: any): PlatformEvent {
    return {
      id: dbData.id,
      title: dbData.title,
      description: dbData.description,
      content: dbData.content,
      type: dbData.type,
      participantCount: dbData.participant_count,
      publishedAt: dbData.published_at,
      isPublished: dbData.is_published,
      createdBy: dbData.created_by,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const contentManagementService = new ContentManagementService();