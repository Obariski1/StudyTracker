import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { StorageService } from '../../services/storage.service';
import { TodosService } from '../../services/todos.service';
import { Topic } from '../../models/topic.model';
import { StudySession } from '../../models/session.model';
import { Todo } from '../../models/todo.model';
import { TopicModalComponent } from '../shared/topic-modal/topic-modal.component';

interface TopicGroup {
  label: string;
  topics: Topic[];
}

@Component({
  selector: 'app-topics',
  standalone: true,
  imports: [CommonModule, FormsModule, TopicModalComponent],
  templateUrl: './topics.component.html',
})
export class TopicsComponent implements OnInit, OnDestroy {
  topics: Topic[] = [];
  sessions: StudySession[] = [];
  todos: Todo[] = [];
  showModal = false;
  editingTopic: Topic | null = null;
  currentSemesterLabel = 'Ohne Semester';
  selectedCurrentSemester = 'auto';

  private readonly currentSemesterStorageKey = 'studyTracker.currentSemesterLabel';
  private openSemesters = new Set<string>();

  private subs = new Subscription();

  constructor(
    private storage: StorageService,
    private todosService: TodosService
  ) {}

  ngOnInit(): void {
    const storedCurrentSemester = localStorage.getItem(this.currentSemesterStorageKey);
    if (storedCurrentSemester && storedCurrentSemester.trim()) {
      this.selectedCurrentSemester = storedCurrentSemester;
    }

    this.subs.add(this.storage.topics$.subscribe(t => {
      this.topics = t;
      this.syncSemesterFolders();
    }));
    this.subs.add(this.storage.sessions$.subscribe(s => (this.sessions = s)));
    this.subs.add(this.todosService.todos$.subscribe(t => (this.todos = t)));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  get currentSemesterChoices(): string[] {
    return this.topicGroups.map(group => group.label);
  }

  get topicGroups(): TopicGroup[] {
    const grouped = new Map<string, Topic[]>();

    for (const topic of this.topics) {
      const semester = topic.semester?.trim() || 'Ohne Semester';
      const current = grouped.get(semester) ?? [];
      current.push(topic);
      grouped.set(semester, current);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => this.compareSemesterLabels(a, b))
      .map(([label, topics]) => ({
        label,
        topics,
      }));
  }

  semesterSessionCount(label: string): number {
    const topicIds = this.topicIdsForSemester(label);
    return this.sessions.filter(session => session.topicId !== null && topicIds.has(session.topicId)).length;
  }

  semesterTodoCount(label: string): number {
    const topicIds = this.topicIdsForSemester(label);
    return this.todos.filter(todo => todo.topicId !== null && topicIds.has(todo.topicId)).length;
  }

  semesterTotalTime(label: string): string {
    const topicIds = this.topicIdsForSemester(label);
    const secs = this.sessions
      .filter(session => session.topicId !== null && topicIds.has(session.topicId))
      .reduce((acc, session) => acc + session.duration, 0);

    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  openModal(topic?: Topic): void {
    this.editingTopic = topic ?? null;
    this.showModal = true;
  }

  toggleSemester(label: string): void {
    if (this.openSemesters.has(label)) {
      this.openSemesters.delete(label);
      return;
    }

    this.openSemesters.add(label);
  }

  isSemesterOpen(label: string): boolean {
    return this.openSemesters.has(label);
  }

  isCurrentSemester(label: string): boolean {
    return label === this.currentSemesterLabel;
  }

  setCurrentSemesterSelection(value: string): void {
    this.selectedCurrentSemester = value;
    localStorage.setItem(this.currentSemesterStorageKey, value);
    this.syncSemesterFolders();
  }

  closeModal(): void { this.showModal = false; this.editingTopic = null; }

  deleteTopic(t: Topic): void {
    if (!confirm(`Delete topic "${t.name}"? Sessions will be kept but unlinked.`)) return;
    this.storage.deleteTopic(t.id);
  }

  sessionCount(topicId: string): number {
    return this.sessions.filter(s => s.topicId === topicId).length;
  }

  todoCount(topicId: string): number {
    return this.todos.filter(t => t.topicId === topicId).length;
  }

  totalTime(topicId: string): string {
    const secs = this.sessions
      .filter(s => s.topicId === topicId)
      .reduce((a, s) => a + s.duration, 0);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  private compareSemesterLabels(a: string, b: string): number {
    const aOrder = this.semesterOrder(a);
    const bOrder = this.semesterOrder(b);

    if (aOrder === bOrder) {
      return a.localeCompare(b, 'de');
    }

    return bOrder - aOrder;
  }

  private semesterOrder(label: string): number {
    if (label === 'Ohne Semester') {
      return Number.MAX_SAFE_INTEGER;
    }

    const match = label.match(/\d+/);
    if (!match) {
      return Number.MAX_SAFE_INTEGER - 1;
    }

    return Number(match[0]);
  }

  private topicIdsForSemester(label: string): Set<string> {
    const topicIds = this.topics
      .filter(topic => (topic.semester?.trim() || 'Ohne Semester') === label)
      .map(topic => topic.id);

    return new Set(topicIds);
  }

  private syncSemesterFolders(): void {
    const groups = this.topicGroups;
    const labels = new Set(groups.map(group => group.label));

    for (const openLabel of [...this.openSemesters]) {
      if (!labels.has(openLabel)) {
        this.openSemesters.delete(openLabel);
      }
    }

    if (this.selectedCurrentSemester !== 'auto' && labels.has(this.selectedCurrentSemester)) {
      this.currentSemesterLabel = this.selectedCurrentSemester;
    } else {
      if (this.selectedCurrentSemester !== 'auto' && !labels.has(this.selectedCurrentSemester)) {
        this.selectedCurrentSemester = 'auto';
        localStorage.setItem(this.currentSemesterStorageKey, 'auto');
      }
      this.currentSemesterLabel = this.detectCurrentSemesterLabel(groups);
    }

    this.openSemesters.add(this.currentSemesterLabel);
  }

  private detectCurrentSemesterLabel(groups: TopicGroup[]): string {
    const semesterGroups = groups
      .filter(group => group.label !== 'Ohne Semester')
      .map(group => ({
        label: group.label,
        order: this.semesterOrder(group.label),
      }))
      .filter(group => Number.isFinite(group.order));

    if (semesterGroups.length === 0) {
      return groups[0]?.label ?? 'Ohne Semester';
    }

    semesterGroups.sort((a, b) => a.order - b.order);
    return semesterGroups[semesterGroups.length - 1].label;
  }
}
