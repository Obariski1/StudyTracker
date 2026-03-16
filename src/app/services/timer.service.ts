import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { StorageService } from './storage.service';
import { StudySession } from '../models/session.model';

export type TimerMode = 'stopwatch' | 'timer';

@Injectable({ providedIn: 'root' })
export class TimerService implements OnDestroy {
  private _seconds$ = new BehaviorSubject<number>(0);
  private _running$ = new BehaviorSubject<boolean>(false);
  private _mode$ = new BehaviorSubject<TimerMode>('stopwatch');

  readonly seconds$ = this._seconds$.asObservable();
  readonly running$ = this._running$.asObservable();
  readonly mode$ = this._mode$.asObservable();

  private sub?: Subscription;
  private sessionStart?: Date;
  private topicId: string | null = null;
  private note = '';
  private initialSeconds = 0;

  constructor(private storage: StorageService) {}

  setMode(mode: TimerMode): void {
    if (this._running$.value) return;
    this._mode$.next(mode);
    this.reset();
  }

  setInitialSeconds(seconds: number): void {
    this.initialSeconds = seconds;
    this._seconds$.next(seconds);
  }

  start(topicId: string | null, note: string): void {
    if (this._running$.value) return;
    this.topicId = topicId;
    this.note = note;
    this.sessionStart = new Date();
    this._running$.next(true);
    
    this.sub = interval(1000).subscribe(() => {
      const current = this._seconds$.value;
      if (this._mode$.value === 'stopwatch') {
        this._seconds$.next(current + 1);
      } else {
        if (current > 0) {
          this._seconds$.next(current - 1);
        } else {
          this.stop();
        }
      }
    });
  }

  stop(): StudySession | null {
    if (!this._running$.value) return null;
    this.sub?.unsubscribe();
    this._running$.next(false);
    const duration = this._seconds$.value;
    
    // For timer mode, calculate how much time was actually used
    const actualDuration = this._mode$.value === 'stopwatch' 
      ? duration 
      : (this.initialSeconds - duration);
    
    this._seconds$.next(0);
    if (actualDuration < 5) return null;
    
    const session: StudySession = {
      id: Date.now().toString(),
      topicId: this.topicId,
      note: this.note,
      start: this.sessionStart!.toISOString(),
      end: new Date().toISOString(),
      duration: actualDuration,
    };
    
    // Save to database (fire and forget, but errors are logged)
    this.storage.saveSession(session).catch(error => 
      console.error('Failed to save session:', error)
    );
    
    return session;
  }

  reset(): void {
    this.sub?.unsubscribe();
    this._running$.next(false);
    this._seconds$.next(0);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
