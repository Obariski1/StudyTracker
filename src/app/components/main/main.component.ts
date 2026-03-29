import { ChangeDetectorRef, Component, OnInit, OnDestroy, ViewRef } from '@angular/core';
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

interface DayBar { label: string; secsLearning: number; secsLecture: number; isToday: boolean; dateIso: string; }

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './main.component.html',
})
export class MainComponent implements OnInit, OnDestroy {
  private readonly fullscreenBodyClass = 'timer-fullscreen-active';
  private readonly appLocale = 'de-CH';
  private readonly appTimeZone = 'Europe/Berlin';
  private readonly sessionDriftToleranceMs = 2 * 60 * 1000;

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
  selectedWeekOffset = 0;
  selectedWeekLabel = '';
  selectedWeekDayIso: string | null = null;
  displayedSessions: StudySession[] = [];
  statTotal = '0m';
  statAverage = '0m';
  statLectureTotal = '0m';
  statWeeklyAverage = '0h 0min';

  private subs = new Subscription();

  constructor(
    public timer: TimerService,
    public storage: StorageService,
    public todosService: TodosService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.todosService.loadTodos();

    this.subs.add(this.timer.seconds$.subscribe(s => (this.seconds = s)));
    this.subs.add(this.timer.running$.subscribe(r => (this.running = r)));
    this.subs.add(this.timer.mode$.subscribe(m => (this.mode = m)));
    this.subs.add(this.storage.topics$.subscribe(t => {
      this.topics = t;
      console.log('Main: Topics updated:', t);
      this.scheduleViewUpdate();
    }));
    this.subs.add(this.storage.sessions$.subscribe(sessions => {
      console.log('Main: Sessions updated:', sessions);
      this.refreshStats();
      this.scheduleViewUpdate();
    }));
    this.subs.add(this.todosService.todos$.subscribe(todos => {
      this.updateTodaysTodos(todos);
      this.scheduleViewUpdate();
    }));
    this.refreshStats();
    this.scheduleViewUpdate();
  }

  private updateTodaysTodos(todos: Todo[]): void {
    const today = this.getTodayDate();
    this.todaysTodos = todos.filter(t => t.dueDate === today && !t.completed);
    this.todaysCompletedTodos = todos.filter(t => t.dueDate === today && t.completed);
    this.scheduleViewUpdate();
  }

  private getTodayDate(): string {
    return new Date().toLocaleDateString('sv-SE', { timeZone: this.appTimeZone });
  }

  ngOnDestroy(): void {
    this.setTimerFullscreenMode(false);
    this.subs.unsubscribe();
  }

  toggleMode(): void {
    this.timer.setMode(this.mode === 'stopwatch' ? 'timer' : 'stopwatch');
  }

  toggleTimerMinimized(): void {
    if (this.timerFullscreen) {
      this.setTimerFullscreenMode(false);
      return;
    }

    if (this.running) {
      this.setTimerFullscreenMode(true);
    }
  }

  private setTimerFullscreenMode(enabled: boolean): void {
    this.timerFullscreen = enabled;

    if (enabled) {
      document.body.classList.add(this.fullscreenBodyClass);
    } else {
      document.body.classList.remove(this.fullscreenBodyClass);
    }
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

    const editingSessionId = this.editingSessionId;
    this.closeEditSessionModal();

    try {
      await this.storage.updateSession(editingSessionId, updates);
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

  formatHMVerbose(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}min`;
  }

  topicColor(id: string | null): string {
    return this.topics.find(t => t.id === id)?.color ?? '#70708a';
  }

  topicName(id: string | null): string {
    return this.topics.find(t => t.id === id)?.name ?? 'No topic';
  }

  sessionDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.appLocale, {
      day: '2-digit',
      month: 'short',
      timeZone: this.appTimeZone,
    });
  }

  sessionTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(this.appLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: this.appTimeZone,
    });
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
    if (driftMs > this.sessionDriftToleranceMs) {
      return this.sessionTime(new Date(expectedStartMs).toISOString());
    }

    return this.sessionTime(session.start);
  }

  get sessionsCardTitle(): string {
    if (!this.selectedWeekDayIso) {
      return 'Sitzungen dieser Woche';
    }

    const selectedBar = this.weekBars.find(bar => bar.dateIso === this.selectedWeekDayIso);
    return selectedBar ? `Sitzungen · ${selectedBar.label}` : 'Sitzungen';
  }

  toggleWeekDayFilter(bar: DayBar): void {
    this.selectedWeekDayIso = this.selectedWeekDayIso === bar.dateIso ? null : bar.dateIso;
    this.refreshDisplayedSessions();
  }

  previousWeek(): void {
    this.selectedWeekOffset += 1;
    this.selectedWeekDayIso = null;
    this.refreshStats();
  }

  nextWeek(): void {
    if (!this.canGoNextWeek) {
      return;
    }

    this.selectedWeekOffset -= 1;
    this.selectedWeekDayIso = null;
    this.refreshStats();
  }

  get canGoNextWeek(): boolean {
    return this.selectedWeekOffset > 0;
  }

  clearWeekDayFilter(): void {
    this.selectedWeekDayIso = null;
    this.refreshDisplayedSessions();
  }

  isWeekDaySelected(bar: DayBar): boolean {
    return this.selectedWeekDayIso === bar.dateIso;
  }

  // ── Stats ──────────────────────────────────────────────────────────
  private refreshStats(): void {
    const sessions = this.storage.getSessions();
    const weekStart = this.getMondayForOffset(this.selectedWeekOffset);
    const weekEndExclusive = new Date(weekStart);
    weekEndExclusive.setDate(weekStart.getDate() + 7);
    const weekStartIso = this.toDateIsoInTimeZone(weekStart, this.appTimeZone);
    const weekEndExclusiveIso = this.toDateIsoInTimeZone(weekEndExclusive, this.appTimeZone);
    const lectureTopicIds = this.topics.filter(t => t.isLectureType).map(t => t.id);

    const weekSessions = sessions.filter(s => {
      const sessionDayIso = this.toDateIsoInTimeZone(s.start, this.appTimeZone);
      return sessionDayIso >= weekStartIso && sessionDayIso < weekEndExclusiveIso;
    });
    
    // Only count learning sessions for statistics (exclude lecture types)
    const learningOnlySessions = weekSessions.filter(s => s.topicId === null || !lectureTopicIds.includes(s.topicId));
    const weekSecs = learningOnlySessions.reduce((a, s) => a + s.duration, 0);
    this.statTotal = this.formatHM(weekSecs);
    const avgSecs = Math.round(weekSecs / 7);
    this.statAverage = this.formatHM(avgSecs);
    const lectureSecs = weekSessions.filter(s => s.topicId !== null && lectureTopicIds.includes(s.topicId)).reduce((a, s) => a + s.duration, 0);
    this.statLectureTotal = this.formatHM(lectureSecs);
    this.statWeeklyAverage = this.formatHMVerbose(this.calculateWeeklyAverageSeconds(sessions, lectureTopicIds));
    this.selectedWeekLabel = this.buildWeekLabel(weekStart);
    this.weekBars = this.buildWeekBars(sessions, weekStart);
    this.recentSessions = weekSessions
      .slice()
      .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
      .slice(0, 5);
    this.refreshDisplayedSessions();
    this.scheduleViewUpdate();
  }

  private scheduleViewUpdate(): void {
    queueMicrotask(() => {
      const viewRef = this.cdr as ViewRef;
      if (!viewRef.destroyed) {
        this.cdr.detectChanges();
      }
    });
  }

  private getMondayForOffset(weekOffset: number): Date {
    const now = new Date();
    const d = new Date(now);
    d.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    d.setDate(d.getDate() - weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private buildWeekLabel(weekStart: Date): string {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startLabel = weekStart.toLocaleDateString(this.appLocale, {
      day: '2-digit',
      month: '2-digit',
      timeZone: this.appTimeZone,
    });
    const endLabel = weekEnd.toLocaleDateString(this.appLocale, {
      day: '2-digit',
      month: '2-digit',
      timeZone: this.appTimeZone,
    });

    return `${startLabel} - ${endLabel}`;
  }

  private buildWeekBars(sessions: StudySession[], weekStart: Date): DayBar[] {
    const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const todayIso = this.toDateIsoInTimeZone(new Date(), this.appTimeZone);
    const lectureTopics = this.topics.filter(t => t.isLectureType).map(t => t.id);

    return labels.map((label, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayIso = this.toDateIsoInTimeZone(day, this.appTimeZone);
      
      const daySessions = sessions.filter(s => this.toDateIsoInTimeZone(s.start, this.appTimeZone) === dayIso);
      
      const secsLearning = daySessions
        .filter(s => s.topicId === null || !lectureTopics.includes(s.topicId))
        .reduce((a, s) => a + s.duration, 0);
      
      const secsLecture = daySessions
        .filter(s => s.topicId !== null && lectureTopics.includes(s.topicId))
        .reduce((a, s) => a + s.duration, 0);

      return { label, secsLearning, secsLecture, isToday: dayIso === todayIso, dateIso: dayIso };
    });
  }

  private refreshDisplayedSessions(): void {
    if (!this.selectedWeekDayIso) {
      this.displayedSessions = this.recentSessions;
      return;
    }

    this.displayedSessions = this.storage
      .getSessions()
      .filter(s => this.toDateIsoInTimeZone(s.start, this.appTimeZone) === this.selectedWeekDayIso)
      .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
  }

  private calculateWeeklyAverageSeconds(sessions: StudySession[], lectureTopicIds?: string[]): number {
    if (sessions.length === 0) {
      return 0;
    }

    const lectureIds = lectureTopicIds || [];
    const learningOnlySessions = sessions.filter(s => s.topicId === null || !lectureIds.includes(s.topicId));
    
    const weeklyTotals = new Map<string, number>();

    for (const session of learningOnlySessions) {
      const weekKey = this.getWeekKeyInTimeZone(session.start);
      weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) ?? 0) + session.duration);
    }

    const totals = Array.from(weeklyTotals.values());
    if (totals.length === 0) {
      return 0;
    }
    const totalSeconds = totals.reduce((acc, value) => acc + value, 0);
    return Math.round(totalSeconds / totals.length);
  }

  private getWeekKeyInTimeZone(iso: string): string {
    const localIsoDate = this.toDateIsoInTimeZone(iso, this.appTimeZone);
    const [year, month, day] = localIsoDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  private toDateIsoInTimeZone(value: string | Date, timeZone: string): string {
    const dateValue = value instanceof Date ? value : new Date(value);
    return dateValue.toLocaleDateString('sv-SE', { timeZone });
  }

  get maxBarSecs(): number {
    const maxPerBar = this.weekBars.map(b => b.secsLearning + b.secsLecture);
    return Math.max(...maxPerBar, 1);
  }

  barHeight(secs: number): number {
    return Math.max(4, (secs / this.maxBarSecs) * 100);
  }

  learningPx(bar: DayBar): number {
    const total = bar.secsLearning + bar.secsLecture;
    if (total === 0) return 4;
    return (bar.secsLearning / total) * this.barHeight(total);
  }

  lecturePx(bar: DayBar): number {
    const total = bar.secsLearning + bar.secsLecture;
    if (total === 0) return 0;
    return (bar.secsLecture / total) * this.barHeight(total);
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
