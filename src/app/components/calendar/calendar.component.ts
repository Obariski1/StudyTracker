import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule],
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

  private subs = new Subscription();

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
    return this.calDate.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });
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

  formatHM(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  }

  sessionTimeRange(s: StudySession): string {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(s.start)} – ${fmt(s.end)}`;
  }

  get selectedDayTitle(): string {
    if (!this.selectedDay) return 'Wähle einen Tag aus, um Einträge zu sehen';
    return this.selectedDay.date.toLocaleDateString('de-CH', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
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

  confirmDelete(): void {
    if (!this.deleteConfirmId) return;
    
    if (this.deleteConfirmType === 'session') {
      this.storage.deleteSession(this.deleteConfirmId);
    } else if (this.deleteConfirmType === 'todo') {
      this.todosService.deleteTodo(this.deleteConfirmId);
    }
    
    this.cancelDelete();
    // Reset selectedDay and rebuild grid to update view
    this.selectedDay = null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteConfirmId = null;
    this.deleteConfirmType = null;
  }

  editSession(id: string): void {
    // Navigate to main page or emit event to edit session
    // For now, log the session to console
    const session = this.allSessions.find(s => s.id === id);
    console.log('Edit session:', session);
    // In a real app, you might navigate to main and pre-select the session for editing
    // or use a shared service to communicate between components
  }
}
