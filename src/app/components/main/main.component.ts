import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TimerService } from '../../services/timer.service';
import { StorageService } from '../../services/storage.service';
import { TodosService } from '../../services/todos.service';
import { Topic } from '../../models/topic.model';
import { StudySession } from '../../models/session.model';
import { Todo } from '../../models/todo.model';

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
  timerHours = 0;
  timerMinutes = 25;
  timerFullscreen = false;

  // Session logging modal
  showSessionModal = false;
  showDeleteConfirm = false;
  deleteConfirmSessionId: string | null = null;
  loggedSessionDate = '';
  loggedSessionStartTime = '';
  loggedSessionEndTime = '';
  loggedSessionTopicId = '';
  loggedSessionNote = '';

  // Session editing modal
  showEditSessionModal = false;
  editingSessionId: string | null = null;
  editingSessionDate = '';
  editingSessionStartTime = '';
  editingSessionEndTime = '';
  editingSessionTopicId = '';
  editingSessionNote = '';

  // Data
  topics: Topic[] = [];
  recentSessions: StudySession[] = [];
  todaysTodos: Todo[] = [];
  todaysCompletedTodos: Todo[] = [];
  weekBars: DayBar[] = [];
  statTotal = '0m';
  statSessions = 0;
  statAverage = '0m';

  private subs = new Subscription();

  constructor(
    public timer: TimerService,
    public storage: StorageService,
    public todosService: TodosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.todosService.loadTodos();

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
    this.subs.add(this.todosService.todos$.subscribe(todos => {
      this.updateTodaysTodos(todos);
    }));
    this.refreshStats();
  }

  private updateTodaysTodos(todos: Todo[]): void {
    const today = this.getTodayDate();
    this.todaysTodos = todos.filter(t => t.dueDate === today && !t.completed);
    this.todaysCompletedTodos = todos.filter(t => t.dueDate === today && t.completed);
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
      const totalSeconds = this.timerHours * 3600 + this.timerMinutes * 60;
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
    this.deleteConfirmSessionId = id;
    this.showDeleteConfirm = true;
  }

  cancelDeleteSession(): void {
    this.showDeleteConfirm = false;
    this.deleteConfirmSessionId = null;
  }

  confirmDeleteSession(): void {
    if (this.deleteConfirmSessionId) {
      this.storage.deleteSession(this.deleteConfirmSessionId);
      this.cancelDeleteSession();
    }
  }

  openSessionModal(): void {
    this.loggedSessionDate = this.getLocalDateString(new Date());
    // Set default times (e.g., 13:00 to 13:25)
    this.loggedSessionStartTime = '13:00';
    this.loggedSessionEndTime = '13:25';
    this.loggedSessionTopicId = '';
    this.loggedSessionNote = '';
    this.showSessionModal = true;
  }

  closeSessionModal(): void {
    this.showSessionModal = false;
  }

  async logSession(): Promise<void> {
    if (!this.loggedSessionStartTime || !this.loggedSessionEndTime) return;

    const selectedDate = this.loggedSessionDate || this.getLocalDateString(new Date());
    const [year, month, day] = selectedDate.split('-').map(part => Number(part));
    
    // Parse start and end times (HH:MM format)
    const [startHour, startMin] = this.loggedSessionStartTime.split(':').map(Number);
    const [endHour, endMin] = this.loggedSessionEndTime.split(':').map(Number);
    
    const startDate = new Date(year, month - 1, day, startHour, startMin, 0, 0);
    const endDate = new Date(year, month - 1, day, endHour, endMin, 0, 0);
    
    const durationSeconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);
    
    const session: StudySession = {
      id: Date.now().toString(),
      topicId: this.loggedSessionTopicId || null,
      note: this.loggedSessionNote,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      duration: durationSeconds,
    };

    // Close immediately after clicking "Sitzung eintragen".
    this.closeSessionModal();

    try {
      await this.storage.saveSession(session);
    } catch (error) {
      console.error('Error logging session:', error);
    }
  }

  editSession(sessionId: string): void {
    const session = this.storage.getSessions().find(s => s.id === sessionId);
    if (!session) return;

    this.editingSessionId = sessionId;
    const startDate = new Date(session.start);
    const endDate = new Date(session.end);

    this.editingSessionDate = this.getLocalDateString(startDate);
    this.editingSessionStartTime = this.formatTimeInput(startDate);
    this.editingSessionEndTime = this.formatTimeInput(endDate);
    this.editingSessionTopicId = session.topicId || '';
    this.editingSessionNote = session.note || '';

    this.showEditSessionModal = true;
  }

  closeEditSessionModal(): void {
    this.showEditSessionModal = false;
    this.editingSessionId = null;
  }

  async saveSessionEdit(): Promise<void> {
    if (!this.editingSessionId || !this.editingSessionStartTime || !this.editingSessionEndTime) return;

    const [year, month, day] = this.editingSessionDate.split('-').map(part => Number(part));
    const [startHour, startMin] = this.editingSessionStartTime.split(':').map(Number);
    const [endHour, endMin] = this.editingSessionEndTime.split(':').map(Number);

    const startDate = new Date(year, month - 1, day, startHour, startMin, 0, 0);
    const endDate = new Date(year, month - 1, day, endHour, endMin, 0, 0);

    const durationSeconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);

    const updates: Partial<StudySession> = {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      duration: durationSeconds,
      topicId: this.editingSessionTopicId || null,
      note: this.editingSessionNote,
    };

    this.closeEditSessionModal();

    try {
      await this.storage.updateSession(this.editingSessionId, updates);
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }

  private formatTimeInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private getLocalDateString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

  sessionStartTime(session: StudySession): string {
    const startMs = new Date(session.start).getTime();
    const endMs = new Date(session.end).getTime();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || session.duration <= 0) {
      return this.sessionTime(session.start);
    }

    const expectedStartMs = endMs - session.duration * 1000;
    const driftMs = Math.abs(startMs - expectedStartMs);

    // If stored start/end are inconsistent, derive start from end - duration.
    if (driftMs > 2 * 60 * 1000) {
      return this.sessionTime(new Date(expectedStartMs).toISOString());
    }

    return this.sessionTime(session.start);
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
    const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
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

  editTodo(todo: Todo): void {
    this.todosService.setEditTodo(todo);
    this.router.navigate(['/todos']);
  }
}
