import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Topic } from '../models/topic.model';
import { StudySession } from '../models/session.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  // Reactive streams so components auto-update
  private _topics$ = new BehaviorSubject<Topic[]>([]);
  private _sessions$ = new BehaviorSubject<StudySession[]>([]);
  private _isLoading$ = new BehaviorSubject<boolean>(true);

  readonly topics$ = this._topics$.asObservable();
  readonly sessions$ = this._sessions$.asObservable();
  readonly isLoading$ = this._isLoading$.asObservable();

  constructor(private supabase: SupabaseService) {
    this.initializeData();
  }

  private async initializeData() {
    this._isLoading$.next(true);
    try {
      await this.loadTopics();
      await this.loadSessions();
    } catch (error) {
      console.error('Failed to initialize data:', error);
    } finally {
      this._isLoading$.next(false);
    }
  }

  // ── Topics ────────────────────────────────────────────────────────
  private async loadTopics(): Promise<void> {
    try {
      const data = await this.supabase.getTopics();
      console.log('Storage: Topics loaded successfully:', data);
      this._topics$.next(data || []);
    } catch (error) {
      console.error('Failed to load topics:', error);
      this._topics$.next([]);
    }
  }

  getTopics(): Topic[] {
    return this._topics$.value;
  }

  async saveTopic(topic: Topic): Promise<void> {
    try {
      // Optimistic update: add/update locally immediately
      const list = this.getTopics();
      const idx = list.findIndex(t => t.id === topic.id);
      const isNewTopic = idx < 0;
      
      if (isNewTopic) {
        list.push(topic);
      } else {
        list[idx] = topic;
      }
      this._topics$.next([...list]);
      console.log('Storage: Topic saved locally:', topic);
      
      // Update database in background
      if (isNewTopic) {
        await this.supabase.addTopic(topic);
      } else {
        await this.supabase.updateTopic(topic.id, topic);
      }
      console.log('Storage: Topic saved to database:', topic);
    } catch (error) {
      console.error('Failed to save topic:', error);
      // Reload to revert optimistic update on error
      await this.loadTopics();
    }
  }

  async deleteTopic(id: string): Promise<void> {
    try {
      // Optimistic update: remove from local state immediately
      const updatedTopics = this.getTopics().filter(t => t.id !== id);
      this._topics$.next(updatedTopics);
      console.log('Storage: Topic deleted locally:', id);
      
      // Update database in background
      await this.supabase.deleteTopic(id);
      
      // Unlink sessions that had this topic
      const sessions = this.getSessions().map(s =>
        s.topicId === id ? { ...s, topicId: null } : s
      );
      this._sessions$.next(sessions);
      
      console.log('Storage: Topic deleted from database:', id);
    } catch (error) {
      console.error('Failed to delete topic:', error);
      // Reload to revert optimistic update on error
      await this.loadTopics();
      await this.loadSessions();
    }
  }

  // ── Sessions ─────────────────────────────────────────────────────
  private async loadSessions(): Promise<void> {
    try {
      const data = await this.supabase.getSessions();
      console.log('Storage: Sessions loaded successfully:', data);
      this._sessions$.next(data || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      this._sessions$.next([]);
    }
  }

  getSessions(): StudySession[] {
    return this._sessions$.value;
  }

  async saveSession(session: StudySession): Promise<void> {
    try {
      // Optimistic update: add locally immediately
      const list = this.getSessions();
      console.log('Storage: Before saving, sessions count:', list.length);
      list.unshift(session);  // Add to front (most recent)
      this._sessions$.next([...list]);
      console.log('Storage: Session saved locally, new count:', list.length, session);
      
      // Update database in background
      await this.supabase.addSession(session);
      
      console.log('Storage: Session saved to database:', session);
    } catch (error) {
      console.error('Failed to save session:', error);
      // Reload to revert optimistic update on error
      await this.loadSessions();
    }
  }

  async updateSession(id: string, updates: Partial<StudySession>): Promise<void> {
    try {
      // Optimistic update: update locally immediately
      const list = this.getSessions();
      const index = list.findIndex(s => s.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        this._sessions$.next([...list]);
        console.log('Storage: Session updated locally:', id);
      }
      
      // Update database in background
      // For now, assume supabase service has an updateSession method
      if ('updateSession' in this.supabase) {
        await (this.supabase as any).updateSession(id, updates);
        console.log('Storage: Session updated in database:', id);
      }
    } catch (error) {
      console.error('Failed to update session:', error);
      // Reload to revert optimistic update on error
      await this.loadSessions();
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      // Optimistic update: remove from local state immediately
      const updatedSessions = this.getSessions().filter(s => s.id !== id);
      this._sessions$.next(updatedSessions);
      console.log('Storage: Session deleted locally:', id);
      
      // Update database in background
      await this.supabase.deleteSession(id);
      
      console.log('Storage: Session deleted from database:', id);
    } catch (error) {
      console.error('Failed to delete session:', error);
      // Reload to revert optimistic update on error
      await this.loadSessions();
    }
  }
}
