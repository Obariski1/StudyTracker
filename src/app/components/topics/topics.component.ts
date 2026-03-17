import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { StorageService } from '../../services/storage.service';
import { TodosService } from '../../services/todos.service';
import { Topic } from '../../models/topic.model';
import { StudySession } from '../../models/session.model';
import { Todo } from '../../models/todo.model';
import { TopicModalComponent } from '../shared/topic-modal/topic-modal.component';

@Component({
  selector: 'app-topics',
  standalone: true,
  imports: [CommonModule, TopicModalComponent],
  templateUrl: './topics.component.html',
})
export class TopicsComponent implements OnInit, OnDestroy {
  topics: Topic[] = [];
  sessions: StudySession[] = [];
  todos: Todo[] = [];
  showModal = false;
  editingTopic: Topic | null = null;

  private subs = new Subscription();

  constructor(
    private storage: StorageService,
    private todosService: TodosService
  ) {}

  ngOnInit(): void {
    this.subs.add(this.storage.topics$.subscribe(t => (this.topics = t)));
    this.subs.add(this.storage.sessions$.subscribe(s => (this.sessions = s)));
    this.subs.add(this.todosService.todos$.subscribe(t => (this.todos = t)));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  openModal(topic?: Topic): void {
    this.editingTopic = topic ?? null;
    this.showModal = true;
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
}
