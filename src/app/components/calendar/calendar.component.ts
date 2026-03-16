import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { StorageService } from '../../services/storage.service';
import { Topic } from '../../models/topic.model';
import { StudySession } from '../../models/session.model';

export interface CalDay {
  date: Date;
  otherMonth: boolean;
  isToday: boolean;
  sessions: StudySession[];
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
  activeFilters = new Set<string>();
  days: CalDay[] = [];
  selectedDay: CalDay | null = null;
  weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  private subs = new Subscription();

  constructor(private storage: StorageService) {}

  ngOnInit(): void {
    this.subs.add(this.storage.topics$.subscribe(t => { this.topics = t; this.buildGrid(); }));
    this.subs.add(this.storage.sessions$.subscribe(s => { this.allSessions = s; this.buildGrid(); }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  get calTitle(): string {
    return this.calDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
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

  private buildGrid(): void {
    const y = this.calDate.getFullYear(), m = this.calDate.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const offset = (first.getDay() + 6) % 7;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sessions = this.filteredSessions();

    const cells: CalDay[] = [];
    for (let i = 0; i < offset; i++) {
      const d = new Date(y, m, 1 - (offset - i));
      cells.push(this.makeDay(d, true, today, sessions));
    }
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push(this.makeDay(new Date(y, m, d), false, today, sessions));
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(y, m + 1, cells.length - last.getDate() - offset + 1);
      cells.push(this.makeDay(d, true, today, sessions));
    }
    this.days = cells;
  }

  private makeDay(date: Date, otherMonth: boolean, today: Date, sessions: StudySession[]): CalDay {
    date.setHours(0, 0, 0, 0);
    return {
      date,
      otherMonth,
      isToday: date.getTime() === today.getTime(),
      sessions: sessions.filter(s => {
        const sd = new Date(s.start); sd.setHours(0, 0, 0, 0);
        return sd.getTime() === date.getTime();
      }),
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
    if (!this.selectedDay) return 'Click a day to see sessions';
    return this.selectedDay.date.toLocaleDateString('en', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  deleteSession(id: string): void {
    if (!confirm('Delete this session?')) return;
    this.storage.deleteSession(id);
  }
}
