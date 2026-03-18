import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StorageService } from '../../services/storage.service';
import { TodosService } from '../../services/todos.service';
import { Topic } from '../../models/topic.model';
import { StudySession } from '../../models/session.model';
import { Todo } from '../../models/todo.model';

export interface CalDay {
  date: Date;
  otherMonth: boolean;
  isToday: boolean;
  sessions: StudySession[];
  todos: Todo[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
})
export class CalendarComponent implements OnInit, OnDestroy {
  calDate = new Date();
  topics: Topic[] = [];
  allSessions: StudySession[] = [];
  allTodos: Todo[] = [];
  activeFilters = new Set<string>();
  days: CalDay[] = [];
  selectedDay: CalDay | null = null;
  weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  
  // Delete confirmation modal
  showDeleteConfirm = false;
  deleteConfirmId: string | null = null;
  deleteConfirmType: 'session' | 'todo' | null = null;

  // Session editing modal
  showEditSessionModal = false;
  editingSessionId: string | null = null;
  editingSessionDate = '';
  editingSessionStartTime = '';
  editingSessionEndTime = '';
  editingSessionTopicId = '';
  editingSessionNote = '';

  // Todo editing modal
  showEditTodoModal = false;
  editingTodoId: string | null = null;
  editingTodoTitle = '';
  editingTodoDescription = '';
  editingTodoDueDate = '';
  editingTodoTopicId = '';
  editingTodoCompleted = false;

  private subs = new Subscription();
  private readonly appLocale = 'de-CH';
  private readonly appTimeZone = 'Europe/Berlin';
  private readonly sessionDriftToleranceMs = 2 * 60 * 1000;

  constructor(
    private storage: StorageService,
    private todosService: TodosService
  ) {}

  ngOnInit(): void {
    this.todosService.loadTodos();

    this.subs.add(this.storage.topics$.subscribe(t => { this.topics = t; this.buildGrid(); }));
    this.subs.add(this.storage.sessions$.subscribe(s => { this.allSessions = s; this.buildGrid(); }));
    this.subs.add(this.todosService.todos$.subscribe(t => { this.allTodos = t; this.buildGrid(); }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  get calTitle(): string {
    return this.calDate.toLocaleDateString(this.appLocale, {
      month: 'long',
      year: 'numeric',
      timeZone: this.appTimeZone,
    });
  }

  prev(): void { this.calDate = new Date(this.calDate.getFullYear(), this.calDate.getMonth() - 1, 1); this.buildGrid(); }
  next(): void { this.calDate = new Date(this.calDate.getFullYear(), this.calDate.getMonth() + 1, 1); this.buildGrid(); }
  today(): void { this.calDate = new Date(); this.buildGrid(); }

  toggleFilter(id: string | null): void {
    if (id === null) { this.activeFilters.clear(); }
    else {
      if (this.activeFilters.has(id)) this.activeFilters.delete(id);
      else this.activeFilters.add(id);
    }
    this.buildGrid();
    if (this.selectedDay) {
      const updated = this.days.find(d => d.date.toDateString() === this.selectedDay!.date.toDateString());
      this.selectedDay = updated ?? null;
    }
  }

  isFilterActive(id: string | null): boolean {
    return id === null ? this.activeFilters.size === 0 : this.activeFilters.has(id);
  }

  topicFilterStyle(t: Topic): object {
    if (this.activeFilters.has(t.id)) {
      return { background: t.color + '22', 'border-color': t.color, color: t.color };
    }
    return {};
  }

  private filteredSessions(): StudySession[] {
    if (this.activeFilters.size === 0) return this.allSessions;
    return this.allSessions.filter(s => s.topicId && this.activeFilters.has(s.topicId));
  }

  private filteredTodos(): Todo[] {
    if (this.activeFilters.size === 0) return this.allTodos;
    return this.allTodos.filter(t => t.topicId && this.activeFilters.has(t.topicId));
  }

  private buildGrid(): void {
    const y = this.calDate.getFullYear(), m = this.calDate.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const offset = (first.getDay() + 6) % 7;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sessions = this.filteredSessions();
    const todos = this.filteredTodos();

    const cells: CalDay[] = [];
    for (let i = 0; i < offset; i++) {
      const d = new Date(y, m, 1 - (offset - i));
      cells.push(this.makeDay(d, true, today, sessions, todos));
    }
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push(this.makeDay(new Date(y, m, d), false, today, sessions, todos));
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(y, m + 1, cells.length - last.getDate() - offset + 1);
      cells.push(this.makeDay(d, true, today, sessions, todos));
    }
    this.days = cells;

    if (this.selectedDay) {
      const updated = this.days.find(d => d.date.getTime() === this.selectedDay!.date.getTime());
      this.selectedDay = updated ?? null;
    }
  }

  private makeDay(
    date: Date,
    otherMonth: boolean,
    today: Date,
    sessions: StudySession[],
    todos: Todo[]
  ): CalDay {
    date.setHours(0, 0, 0, 0);
    // Use local timezone, not UTC conversion
    const dayIso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    return {
      date,
      otherMonth,
      isToday: date.getTime() === today.getTime(),
      sessions: sessions.filter(s => {
        const sd = new Date(s.start); sd.setHours(0, 0, 0, 0);
        return sd.getTime() === date.getTime();
      }),
      todos: todos.filter(t => t.dueDate === dayIso),
    };
  }

  selectDay(day: CalDay): void { this.selectedDay = day; }

  isSelected(day: CalDay): boolean {
    return !!this.selectedDay && this.selectedDay.date.getTime() === day.date.getTime();
  }

  topicColor(id: string | null): string {
    return this.topics.find(t => t.id === id)?.color ?? '#70708a';
  }

  topicName(id: string | null): string {
    return this.topics.find(t => t.id === id)?.name ?? 'No topic';
  }

  isTodoOverdue(todo: Todo): boolean {
    if (todo.completed || !todo.dueDate) return false;
    return todo.dueDate < this.getTodayIso();
  }

  formatHM(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  }

  sessionTimeRange(s: StudySession): string {
    const startIso = this.normalizedSessionStartIso(s);
    return `${this.formatSessionTime(startIso)} – ${this.formatSessionTime(s.end)}`;
  }

  private formatSessionTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(this.appLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: this.appTimeZone,
    });
  }

  private normalizedSessionStartIso(session: StudySession): string {
    const startMs = new Date(session.start).getTime();
    const endMs = new Date(session.end).getTime();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || session.duration <= 0) {
      return session.start;
    }

    const expectedStartMs = endMs - session.duration * 1000;
    const driftMs = Math.abs(startMs - expectedStartMs);

    if (driftMs > this.sessionDriftToleranceMs) {
      return new Date(expectedStartMs).toISOString();
    }

    return session.start;
  }

  get selectedDayTitle(): string {
    if (!this.selectedDay) return 'Wähle einen Tag aus, um Einträge zu sehen';
    return this.selectedDay.date.toLocaleDateString(this.appLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: this.appTimeZone,
    });
  }

  deleteSession(id: string): void {
    this.deleteConfirmId = id;
    this.deleteConfirmType = 'session';
    this.showDeleteConfirm = true;
  }

  deleteTodo(id: string): void {
    this.deleteConfirmId = id;
    this.deleteConfirmType = 'todo';
    this.showDeleteConfirm = true;
  }

  async confirmDelete(): Promise<void> {
    if (!this.deleteConfirmId || !this.deleteConfirmType) return;

    const deletingId = this.deleteConfirmId;
    const deletingType = this.deleteConfirmType;
    const selectedDayTime = this.selectedDay?.date.getTime() ?? null;

    // Optimistic calendar update so deletion is visible immediately.
    if (deletingType === 'session') {
      this.allSessions = this.allSessions.filter(s => s.id !== deletingId);
    } else {
      this.allTodos = this.allTodos.filter(t => t.id !== deletingId);
    }
    this.buildGrid();
    this.restoreSelectedDay(selectedDayTime);
    this.cancelDelete();

    try {
      if (deletingType === 'session') {
        await this.storage.deleteSession(deletingId);
      } else {
        await this.todosService.deleteTodo(deletingId);
      }
    } catch (error) {
      console.error('Delete failed in calendar:', error);
      if (deletingType === 'todo') {
        await this.todosService.loadTodos();
      }
    }
  }

  private restoreSelectedDay(selectedDayTime: number | null): void {
    if (selectedDayTime === null) {
      this.selectedDay = null;
      return;
    }

    this.selectedDay = this.days.find(d => d.date.getTime() === selectedDayTime) ?? null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteConfirmId = null;
    this.deleteConfirmType = null;
  }

  editSession(session: StudySession): void {
    const startDate = new Date(session.start);
    const endDate = new Date(session.end);

    this.editingSessionId = session.id;
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

    if (durationSeconds <= 0) return;

    const updates: Partial<StudySession> = {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      duration: durationSeconds,
      topicId: this.editingSessionTopicId || null,
      note: this.editingSessionNote,
    };

    this.closeEditSessionModal();
    await this.storage.updateSession(this.editingSessionId, updates);
  }

  editTodo(todo: Todo): void {
    this.editingTodoId = todo.id;
    this.editingTodoTitle = todo.title;
    this.editingTodoDescription = todo.description || '';
    this.editingTodoDueDate = todo.dueDate;
    this.editingTodoTopicId = todo.topicId || '';
    this.editingTodoCompleted = todo.completed;
    this.showEditTodoModal = true;
  }

  closeEditTodoModal(): void {
    this.showEditTodoModal = false;
    this.editingTodoId = null;
  }

  async saveTodoEdit(): Promise<void> {
    if (!this.editingTodoId || !this.editingTodoTitle.trim() || !this.editingTodoDueDate) return;

    const updates: Partial<Todo> = {
      title: this.editingTodoTitle.trim(),
      description: this.editingTodoDescription.trim(),
      dueDate: this.editingTodoDueDate,
      topicId: this.editingTodoTopicId || null,
      completed: this.editingTodoCompleted,
    };

    this.closeEditTodoModal();
    await this.todosService.updateTodo(this.editingTodoId, updates);
  }

  private formatTimeInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private getLocalDateString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private getTodayIso(): string {
    return new Date().toLocaleDateString('sv-SE', { timeZone: this.appTimeZone });
  }
}
