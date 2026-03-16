import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Topics
  async getTopics() {
    try {
      console.log('Supabase: Fetching topics...');
      const { data, error } = await this.supabase
        .from('topics')
        .select('id, name, desc, color')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase Error (getTopics):', error);
        throw error;
      }
      
      console.log('Supabase: Topics fetched:', data);
      return data?.map(t => ({
        id: t.id,
        name: t.name,
        desc: t.desc,
        color: t.color
      })) || [];
    } catch (error) {
      console.error('Supabase Exception (getTopics):', error);
      throw error;
    }
  }

  async addTopic(topic: any) {
    try {
      console.log('Supabase: Adding topic:', topic);
      const { data, error } = await this.supabase
        .from('topics')
        .insert([{
          name: topic.name,
          desc: topic.desc,
          color: topic.color
        }])
        .select();
      
      if (error) {
        console.error('Supabase Error (addTopic):', error);
        throw error;
      }
      
      console.log('Supabase: Topic added:', data);
      return data?.[0];
    } catch (error) {
      console.error('Supabase Exception (addTopic):', error);
      throw error;
    }
  }

  async updateTopic(id: string, topic: any) {
    const { data, error } = await this.supabase
      .from('topics')
      .update({
        name: topic.name,
        desc: topic.desc,
        color: topic.color
      })
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  }

  async deleteTopic(id: string) {
    const { error } = await this.supabase
      .from('topics')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Sessions
  async getSessions() {
    try {
      console.log('Supabase: Fetching sessions...');
      const { data, error } = await this.supabase
        .from('sessions')
        .select('id, topic_id, note, start, end, duration')
        .order('start', { ascending: false });
      
      if (error) {
        console.error('Supabase Error (getSessions):', error);
        throw error;
      }
      
      console.log('Supabase: Sessions fetched:', data);
      return data?.map(s => ({
        id: s.id,
        topicId: s.topic_id,
        note: s.note,
        start: s.start,
        end: s.end,
        duration: s.duration
      })) || [];
    } catch (error) {
      console.error('Supabase Exception (getSessions):', error);
      throw error;
    }
  }

  async addSession(session: any) {
    try {
      console.log('Supabase: Adding session:', session);
      const { data, error } = await this.supabase
        .from('sessions')
        .insert([{
          id: session.id,
          topic_id: session.topicId,
          note: session.note,
          start: session.start,
          end: session.end,
          duration: session.duration
        }])
        .select();
      
      if (error) {
        console.error('Supabase Error (addSession):', error);
        throw error;
      }
      
      console.log('Supabase: Session added:', data);
      return data?.[0];
    } catch (error) {
      console.error('Supabase Exception (addSession):', error);
      throw error;
    }
  }

  async deleteSession(id: string) {
    const { error } = await this.supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}
