import { supabase } from '../core/supabase';
import { PlatformUpdate, PlatformEvent } from '../core/types';

export class ContentManagementService {

  async createUpdate(updateData: Partial<PlatformUpdate>, createdBy: string): Promise<PlatformUpdate> {
    const { data, error } = await supabase
      .from('platform_updates')
      .insert({
        ...updateData,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUpdate(updateId: string, updates: Partial<PlatformUpdate>, updatedBy: string): Promise<PlatformUpdate> {
    const { data, error } = await supabase
      .from('platform_updates')
      .update(updates)
      .eq('id', updateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteUpdate(updateId: string, deletedBy: string): Promise<void> {
    const { error } = await supabase
      .from('platform_updates')
      .delete()
      .eq('id', updateId);

    if (error) throw error;
  }

  async getAllUpdates(filters?: {
    type?: string;
    isPublished?: boolean;
  }): Promise<PlatformUpdate[]> {
    let query = supabase.from('platform_updates').select('*');

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.isPublished !== undefined) {
      query = query.eq('is_published', filters.isPublished);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get updates:', error);
      return [];
    }

    return data || [];
  }

  async getPublishedUpdates(): Promise<PlatformUpdate[]> {
    return this.getAllUpdates({ isPublished: true });
  }

  async createEvent(eventData: Partial<PlatformEvent>, createdBy: string): Promise<PlatformEvent> {
    const { data, error } = await supabase
      .from('platform_events')
      .insert({
        ...eventData,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateEvent(eventId: string, updates: Partial<PlatformEvent>, updatedBy: string): Promise<PlatformEvent> {
    const { data, error } = await supabase
      .from('platform_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteEvent(eventId: string, deletedBy: string): Promise<void> {
    const { error } = await supabase
      .from('platform_events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  }

  async getAllEvents(filters?: {
    type?: string;
    isPublished?: boolean;
  }): Promise<PlatformEvent[]> {
    let query = supabase.from('platform_events').select('*');

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.isPublished !== undefined) {
      query = query.eq('is_published', filters.isPublished);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get events:', error);
      return [];
    }

    return data || [];
  }

  async getPublishedEvents(): Promise<PlatformEvent[]> {
    return this.getAllEvents({ isPublished: true });
  }
}

export const contentManagementService = new ContentManagementService();
