import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { CreatePlatformUpdateDto, UpdatePlatformUpdateDto, CreatePlatformEventDto, UpdatePlatformEventDto } from './dto';

@Injectable()
export class ContentManagementService {
  constructor(private supabase: SupabaseService) {}

  async createPlatformUpdate(userId: string, dto: CreatePlatformUpdateDto) {
    const { data, error } = await this.supabase.getClient()
      .from('platform_updates')
      .insert({
        ...dto,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePlatformUpdate(updateId: string, userId: string, isAdmin: boolean, dto: UpdatePlatformUpdateDto) {
    if (!isAdmin) {
      const { data: existing } = await this.supabase.getClient()
        .from('platform_updates')
        .select('created_by')
        .eq('id', updateId)
        .single();

      if (!existing || existing.created_by !== userId) {
        throw new ForbiddenException('You can only update your own updates');
      }
    }

    const { data, error } = await this.supabase.getClient()
      .from('platform_updates')
      .update(dto)
      .eq('id', updateId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundException('Update not found');
    return data;
  }

  async deletePlatformUpdate(updateId: string, userId: string, isAdmin: boolean) {
    if (!isAdmin) {
      const { data: existing } = await this.supabase.getClient()
        .from('platform_updates')
        .select('created_by')
        .eq('id', updateId)
        .single();

      if (!existing || existing.created_by !== userId) {
        throw new ForbiddenException('You can only delete your own updates');
      }
    }

    const { error } = await this.supabase.getClient()
      .from('platform_updates')
      .delete()
      .eq('id', updateId);

    if (error) throw error;
    return { message: 'Update deleted successfully' };
  }

  async getPlatformUpdates(filters?: { type?: string; priority?: string; is_published?: boolean }) {
    let query = this.supabase.getClient()
      .from('platform_updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.is_published !== undefined) {
      query = query.eq('is_published', filters.is_published);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getPublishedUpdates() {
    const { data, error } = await this.supabase.getClient()
      .from('platform_updates')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createPlatformEvent(userId: string, dto: CreatePlatformEventDto) {
    const { data, error } = await this.supabase.getClient()
      .from('platform_events')
      .insert({
        ...dto,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePlatformEvent(eventId: string, userId: string, isAdmin: boolean, dto: UpdatePlatformEventDto) {
    if (!isAdmin) {
      const { data: existing } = await this.supabase.getClient()
        .from('platform_events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      if (!existing || existing.created_by !== userId) {
        throw new ForbiddenException('You can only update your own events');
      }
    }

    const { data, error } = await this.supabase.getClient()
      .from('platform_events')
      .update(dto)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundException('Event not found');
    return data;
  }

  async deletePlatformEvent(eventId: string, userId: string, isAdmin: boolean) {
    if (!isAdmin) {
      const { data: existing } = await this.supabase.getClient()
        .from('platform_events')
        .select('created_by')
        .eq('id', eventId)
        .single();

      if (!existing || existing.created_by !== userId) {
        throw new ForbiddenException('You can only delete your own events');
      }
    }

    const { error } = await this.supabase.getClient()
      .from('platform_events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return { message: 'Event deleted successfully' };
  }

  async getPlatformEvents(filters?: { event_type?: string; is_published?: boolean }) {
    let query = this.supabase.getClient()
      .from('platform_events')
      .select('*')
      .order('start_date', { ascending: false });

    if (filters?.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters?.is_published !== undefined) {
      query = query.eq('is_published', filters.is_published);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getPublishedEvents() {
    const { data, error } = await this.supabase.getClient()
      .from('platform_events')
      .select('*')
      .eq('is_published', true)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
