import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TimerService } from '../../services/timer.service';
import { StorageService } from '../../services/storage.service';
import { Topic } from '../../models/topic.model';
import { StudySession } from '../../models/session.model';

interface DayBar { label: string; secs: number; isToday: boolean; }

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './main.component.html',
})
export class MainComponent implements OnInit, OnDestroy {
  // Timer state
  seconds = 0;
  running = false;
  selectedTopicId = '';
  note = '';
  mode: 'stopwatch' | 'timer' = 'stopwatch';
  timerMinutes = 25;
  timerSeconds = 0;
  timerFullscreen = false;

  // Data
  topics: Topic[] = [];
  recentSessions: StudySession[] = [];
  weekBars: DayBar[] = [];
  statTotal = '0m';
  statSessions = 0;
  statAverage = '0m';

  private subs = new Subscription();

  constructor(
    public timer: TimerService,
    public storage: StorageService
  ) {}

  ngOnInit(): void {
    this.subs.add(this.timer.seconds$.subscribe(s => (this.seconds = s)));
    this.subs.add(this.timer.running$.subscribe(r => (this.running = r)));
    this.subs.add(this.timer.mode$.subscribe(m => (this.mode = m)));
    this.subs.add(this.storage.topics$.subscribe(t => {
      this.topics = t;
      console.log('Main: Topics updated:', t);
    }));
    this.subs.add(this.storage.sessions$.subscribe(sessions => {
      console.log('Main: Sessions updated:', sessions);
      this.refreshStats();
    }));
    this.refreshStats();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleMode(): void {
    this.timer.setMode(this.mode === 'stopwatch' ? 'timer' : 'stopwatch');
  }

  toggleTimerMinimized(): void {
    this.timerFullscreen = !this.timerFullscreen;
  }

  start(): void {
    if (this.mode === 'timer') {
      const totalSeconds = this.timerMinutes * 60 + this.timerSeconds;
      this.timer.setInitialSeconds(totalSeconds);
    }
    this.timer.start(this.selectedTopicId || null, this.note);
  }

  stop(): void {
    this.timer.stop();
    this.note = '';
    this.selectedTopicId = '';
  }

  reset(): void {
    this.timer.reset();
  }

  deleteSession(id: string): void {
    this.storage.deleteSession(id);
  }

  get liveTopicName(): string {
    return this.topics.find(t => t.id === this.selectedTopicId)?.name || 'No topic';
  }

  // ── Format helpers ─────────────────────────────────────────────────
  formatTime(secs: number): string {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  formatHM(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  }

  topicColor(id: string | null): string {
    return this.topics.find(t => t.id === id)?.color ?? '#70708a';
  }

  topicName(id: string | null): string {
    return this.topics.find(t => t.id === id)?.name ?? 'No topic';
  }

  sessionDate(iso: string): string {
    return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: 'short' });
  }

  sessionTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Stats ──────────────────────────────────────────────────────────
  private refreshStats(): void {
    const sessions = this.storage.getSessions();
    const weekStart = this.getMonday();

    const weekSessions = sessions.filter(s => new Date(s.start) >= weekStart);
    const weekSecs = weekSessions.reduce((a, s) => a + s.duration, 0);
    this.statTotal = this.formatHM(weekSecs);
    this.statSessions = weekSessions.length;
    const avgSecs = Math.round(weekSecs / 7);
    this.statAverage = this.formatHM(avgSecs);
    this.weekBars = this.buildWeekBars(sessions, weekStart);
    this.recentSessions = sessions.slice().reverse().slice(0, 5);
  }

  private getMonday(): Date {
    const now = new Date();
    const d = new Date(now);
    d.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private buildWeekBars(sessions: StudySession[], weekStart: Date): DayBar[] {
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const todayIdx = (new Date().getDay() + 6) % 7;
    return labels.map((label, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const secs = sessions
        .filter(s => new Date(s.start).toDateString() === day.toDateString())
        .reduce((a, s) => a + s.duration, 0);
      return { label, secs, isToday: i === todayIdx };
    });
  }

  get maxBarSecs(): number {
    return Math.max(...this.weekBars.map(b => b.secs), 1);
  }

  barHeight(secs: number): number {
    return Math.max(4, (secs / this.maxBarSecs) * 100);
  }

  private calcStreak(sessions: StudySession[]): number {
    let streak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const has = sessions.some(s => new Date(s.start).toDateString() === d.toDateString());
      if (has) streak++; else break;
    }
    return streak;
  }
}
