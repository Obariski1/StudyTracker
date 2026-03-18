import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { StudySession } from '../models/session.model';

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

  async updateSession(id: string, updates: Partial<StudySession>) {
    const payload: Record<string, string | number | null> = {};

    if (updates.topicId !== undefined) payload['topic_id'] = updates.topicId;
    if (updates.note !== undefined) payload['note'] = updates.note;
    if (updates.start !== undefined) payload['start'] = updates.start;
    if (updates.end !== undefined) payload['end'] = updates.end;
    if (updates.duration !== undefined) payload['duration'] = updates.duration;

    if (Object.keys(payload).length === 0) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('sessions')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data?.[0];
  }

  async deleteSession(id: string) {
    const { error } = await this.supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Authentication
  async signUp(email: string, password: string) {
    try {
      console.log('Supabase: Signing up user:', email);
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('Supabase Error (signUp):', error);
        throw error;
      }
      
      console.log('Supabase: User signed up:', data);
      return data;
    } catch (error) {
      console.error('Supabase Exception (signUp):', error);
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    try {
      console.log('Supabase: Signing in user:', email);
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Supabase Error (signIn):', error);
        throw error;
      }
      
      console.log('Supabase: User signed in:', data);
      return data;
    } catch (error) {
      console.error('Supabase Exception (signIn):', error);
      throw error;
    }
  }

  async signOut() {
    try {
      console.log('Supabase: Signing out user');
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase Error (signOut):', error);
        throw error;
      }
      
      console.log('Supabase: User signed out');
    } catch (error) {
      console.error('Supabase Exception (signOut):', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      // Prefer persisted session from local storage to keep users logged in on reload.
      const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
      if (sessionError) {
        console.error('Supabase Error (getSession):', sessionError);
      }

      if (sessionData.session?.user) {
        return sessionData.session.user;
      }

      const { data, error } = await this.supabase.auth.getUser();
      if (error) {
        console.error('Supabase Error (getCurrentUser):', error);
        return null;
      }

      return data.user;
    } catch (error) {
      console.error('Supabase Exception (getCurrentUser):', error);
      return null;
    }
  }

  onAuthStateChange(callback: (user: any) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }

  // Todos
  async getTodos() {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await this.supabase
        .from('todos')
        .select('id, title, description, topic_id, due_date, completed, created_at, updated_at')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      
      return data?.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        topicId: t.topic_id,
        dueDate: t.due_date,
        completed: t.completed,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })) || [];
    } catch (error) {
      console.error('Supabase Error (getTodos):', error);
      throw error;
    }
  }

  async addTodo(todo: any) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await this.supabase
        .from('todos')
        .insert([{
          title: todo.title,
          description: todo.description || null,
          topic_id: todo.topicId || null,
          due_date: todo.dueDate,
          user_id: user.id,
          completed: false
        }])
        .select();
      
      if (error) throw error;
      const created = data?.[0];
      if (!created) return null;

      return {
        id: created.id,
        title: created.title,
        description: created.description,
        topicId: created.topic_id,
        dueDate: created.due_date,
        completed: created.completed,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      };
    } catch (error) {
      console.error('Supabase Error (addTodo):', error);
      throw error;
    }
  }

  async updateTodo(id: string, todo: any) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await this.supabase
        .from('todos')
        .update({
          title: todo.title,
          description: todo.description,
          topic_id: todo.topicId,
          due_date: todo.dueDate,
          completed: todo.completed
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select();
      
      if (error) throw error;
      const updated = data?.[0];
      if (!updated) return null;

      return {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        topicId: updated.topic_id,
        dueDate: updated.due_date,
        completed: updated.completed,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };
    } catch (error) {
      console.error('Supabase Error (updateTodo):', error);
      throw error;
    }
  }

  async deleteTodo(id: string) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await this.supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Supabase Error (deleteTodo):', error);
      throw error;
    }
  }

  async getTodosByDate(date: string) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await this.supabase
        .from('todos')
        .select('id, title, description, topic_id, due_date, completed, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('due_date', date)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        topicId: t.topic_id,
        dueDate: t.due_date,
        completed: t.completed,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })) || [];
    } catch (error) {
      console.error('Supabase Error (getTodosByDate):', error);
      throw error;
    }
  }
}
