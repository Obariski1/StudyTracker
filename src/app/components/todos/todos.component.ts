import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { TodosService } from '../../services/todos.service';
import { StorageService } from '../../services/storage.service';
import { Todo } from '../../models/todo.model';
import { Topic } from '../../models/topic.model';

@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-todos">
      <div class="todos-header">
        <h1 class="page-title">My Todos</h1>
      </div>

      <div class="todos-content">
        <!-- Active Todos List -->
        <div class="card">
          <h2 class="card-title">Alle Todos</h2>
          
          <div *ngIf="getIncompleteTodos((todos$ | async) || []).length === 0" style="color: var(--muted); text-align: center; padding: 40px 20px;">
            Keine aktiven Todos!
          </div>

          <div *ngFor="let todo of getIncompleteTodos((todos$ | async) || [])" class="todo-item" [class.completed]="todo.completed" [class.overdue]="isOverdue(todo)" (click)="editTodo(todo)">
            <input 
              type="checkbox" 
              [checked]="todo.completed"
              (change)="toggleTodo(todo)"
              (click)="$event.stopPropagation()"
              class="todo-checkbox">
            
            <div class="todo-content">
              <div class="todo-title">{{ todo.title }}</div>
              <div class="todo-meta">
                <span class="todo-date" [class.overdue]="isOverdue(todo)">📅 {{ formatDate(todo.dueDate) }}</span>
                <span class="todo-overdue" *ngIf="isOverdue(todo)">⚠ Fällig</span>
                <span *ngIf="todo.topicId" class="todo-topic" [style.background]="getTopicColor(todo.topicId)">
                  {{ getTopicName(todo.topicId) }}
                </span>
              </div>
              <div *ngIf="todo.description" class="todo-desc">{{ todo.description }}</div>
            </div>

            <div class="todo-actions" (click)="$event.stopPropagation()">
              <button class="btn-delete" (click)="deleteTodo(todo.id)">🗑️</button>
            </div>
          </div>
        </div>

        <!-- Completed Todos Section -->
        <div class="card" *ngIf="getCompletedTodos((todos$ | async) || []).length > 0">
          <button class="completed-toggle" (click)="showCompletedDropdown = !showCompletedDropdown">
            <span class="toggle-icon">{{ showCompletedDropdown ? '▼' : '▶' }}</span>
            Abgeschlossene Todos ({{ getCompletedTodos((todos$ | async) || []).length }})
          </button>
          
          <div *ngIf="showCompletedDropdown">
            <div *ngFor="let todo of getCompletedTodos((todos$ | async) || [])" class="todo-item completed" (click)="editTodo(todo)">
              <input 
                type="checkbox" 
                [checked]="true"
                (change)="toggleTodo(todo)"
                (click)="$event.stopPropagation()"
                class="todo-checkbox">
              
              <div class="todo-content">
                <div class="todo-title">{{ todo.title }}</div>
                <div class="todo-meta">
                  <span class="todo-date">📅 {{ formatDate(todo.dueDate) }}</span>
                  <span *ngIf="todo.topicId" class="todo-topic" [style.background]="getTopicColor(todo.topicId)">
                    {{ getTopicName(todo.topicId) }}
                  </span>
                </div>
                <div *ngIf="todo.description" class="todo-desc">{{ todo.description }}</div>
              </div>

              <div class="todo-actions" (click)="$event.stopPropagation()">
                <button class="btn-delete" (click)="deleteTodo(todo.id)">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button class="btn-add-bottom" (click)="openModal()">
        + Aufgabe hinzufügen
      </button>

      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()"></div>

      <!-- Delete Confirmation Modal -->
      <div class="modal-overlay" *ngIf="showDeleteConfirm" (click)="cancelDelete()"></div>
      <div class="modal confirm-modal" *ngIf="showDeleteConfirm">
        <div class="modal-header">
          <h2 class="modal-title">Bestätigung</h2>
        </div>
        <div class="modal-body">
          <p style="font-size: 14px; color: var(--text); margin-bottom: 20px;">Willst du diesen Todo wirklich löschen?</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-add" (click)="confirmDeleteAction()">Ja, löschen</button>
            <button type="button" class="btn btn-cancel" (click)="cancelDelete()">Abbrechen</button>
          </div>
        </div>
      </div>

      <div class="modal" *ngIf="showModal">
        <div class="modal-header">
          <h2 class="modal-title">{{ editingTodoId ? 'Todo bearbeiten' : 'Neue Aufgabe' }}</h2>
          <button class="modal-close" type="button" (click)="closeModal()">✕</button>
        </div>

        <form class="modal-form" (ngSubmit)="addNewTodo()" #form="ngForm">
          <div style="margin-bottom: 16px;">
            <label class="form-label">Titel</label>
            <input
              class="form-control"
              [(ngModel)]="newTodo.title"
              name="title"
              placeholder=""
              required>
          </div>

          <div style="margin-bottom: 16px;">
            <label class="form-label">Beschreibung</label>
            <textarea
              class="form-control note-input"
              [(ngModel)]="newTodo.description"
              name="description"
              placeholder=""></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <label class="form-label">Fälligkeitsdatum</label>
              <input
                class="form-control"
                type="date"
                [(ngModel)]="newTodo.dueDate"
                name="dueDate"
                required>
            </div>

            <div>
              <label class="form-label">Themen</label>
              <select class="form-control" [(ngModel)]="newTodo.topicId" name="topicId">
                <option value="">— Kein Thema —</option>
                <option *ngFor="let t of (topics$ | async)" [value]="t.id">{{ t.name }}</option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn btn-add" [disabled]="!form.valid">
              {{ editingTodoId ? 'Änderungen speichern' : 'Aufgabe hinzufügen' }}
            </button>
            <button type="button" class="btn btn-cancel" (click)="closeModal()">Abbrechen</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-todos {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 60px);
      padding: 92px 32px 0;
      animation: fadeIn .3s ease;
    }

    .todos-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0 24px 0;
    }

    .todos-content {
      flex: 1;
      overflow-y: auto;
      padding-right: 8px;
      margin-bottom: 84px;
    }

    .todos-content::-webkit-scrollbar {
      width: 6px;
    }

    .todos-content::-webkit-scrollbar-track {
      background: transparent;
    }

    .todos-content::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 3px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 800;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--muted);
      text-transform: uppercase;
      margin-bottom: 20px;
    }

    .completed-toggle {
      width: 100%;
      padding: 12px 16px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-family: 'Syne', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all .2s;
    }

    .completed-toggle:hover {
      border-color: var(--accent2);
      background: var(--surface);
    }

    .toggle-icon {
      font-size: 10px;
      color: var(--muted);
    }

    .form-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      color: var(--muted);
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .form-control {
      width: 100%;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface2);
      color: var(--text);
      font-family: 'Syne', sans-serif;
      font-size: 14px;
      outline: none;
      transition: border-color .2s;
    }

    .form-control:focus {
      border-color: var(--accent2);
    }

    .note-input {
      resize: none;
      min-height: 80px;
      margin-top: 0;
    }

    .btn {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      border: none;
      font-family: 'Syne', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all .15s;
      letter-spacing: .5px;
    }

    .btn-add {
      background: var(--accent);
      color: var(--bg);
    }

    .btn-add:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .btn-add:disabled {
      opacity: .35;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: var(--surface2);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-add-bottom {
      position: fixed;
      bottom: 20px;
      left: 32px;
      right: 32px;
      width: calc(100% - 64px);
      padding: 14px 16px;
      border-radius: 10px;
      border: 2px solid var(--accent);
      background: var(--bg);
      color: var(--accent);
      font-family: 'Syne', sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: .4px;
      cursor: pointer;
      transition: all .2s;
      z-index: 10;
    }

    .btn-add-bottom:hover {
      background: var(--surface);
      border-color: var(--accent);
    }

    .todo-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: var(--surface2);
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 12px;
      transition: all .2s;
      cursor: pointer;
    }

    .todo-item:hover {
      border-color: var(--accent);
      background: var(--surface);
    }

    .todo-item.completed {
      opacity: 0.6;
    }

    .todo-item.completed .todo-title {
      text-decoration: line-through;
      color: var(--muted);
    }

    .todo-item.overdue {
      border-color: var(--accent3);
      background: rgba(249, 115, 22, 0.08);
    }

    .todo-item.overdue:hover {
      border-color: var(--accent3);
      background: rgba(249, 115, 22, 0.12);
    }

    .todo-checkbox {
      width: 20px;
      height: 20px;
      min-width: 20px;
      min-height: 20px;
      margin-top: 2px;
      cursor: pointer;
      accent-color: var(--accent);
      flex-shrink: 0;
      appearance: none;
      -webkit-appearance: none;
      border: 2px solid var(--accent);
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .2s;
    }

    .todo-checkbox:hover {
      border-color: var(--accent2);
    }

    .todo-checkbox:checked {
      background: var(--accent);
      border-color: var(--accent);
    }

    .todo-checkbox:checked::after {
      content: '✓';
      color: white;
      font-size: 12px;
      font-weight: bold;
    }

    .todo-content {
      flex: 1;
    }

    .todo-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 6px;
    }

    .todo-desc {
      font-size: 12px;
      color: var(--muted);
      font-style: italic;
      margin-top: 6px;
    }

    .todo-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .todo-date {
      font-size: 11px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
    }

    .todo-date.overdue {
      color: var(--accent3);
      font-weight: 700;
    }

    .todo-overdue {
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      background: var(--accent3);
      padding: 2px 8px;
      border-radius: 999px;
      letter-spacing: .3px;
      text-transform: uppercase;
    }

    .todo-topic {
      font-size: 10px;
      font-weight: 600;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .btn-delete {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all .2s;
      flex-shrink: 0;
    }

    .todo-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn-delete:hover {
      border-color: var(--accent3);
      color: var(--accent3);
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 998;
    }

    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(560px, calc(100vw - 32px));
      max-height: calc(100vh - 48px);
      overflow: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      z-index: 999;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
    }

    .modal-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      cursor: pointer;
    }

    .modal-form {
      padding: 20px;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
    }

    .modal-body {
      padding: 20px;
    }

    .confirm-modal {
      width: min(400px, calc(100vw - 32px));
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class TodosComponent implements OnInit {
  todos$: Observable<Todo[]>;
  topics$: Observable<Topic[]>;
  showModal = false;
  editingTodoId: string | null = null;
  showDeleteConfirm = false;
  deleteConfirmTodoId: string | null = null;
  showCompletedDropdown = false;

  newTodo = {
    title: '',
    description: '',
    dueDate: this.getTodayDate(),
    topicId: null as string | null
  };

  private topicMap = new Map<string, any>();

  constructor(
    private todosService: TodosService,
    private storage: StorageService
  ) {
    this.todos$ = this.todosService.todos$;
    this.topics$ = this.storage.topics$;
    this.topics$.subscribe((topics: Topic[]) => {
      this.topicMap.clear();
      topics.forEach(t => this.topicMap.set(t.id, t));
    });
  }

  ngOnInit() {
    this.todosService.loadTodos();
    
    // Listen for edit requests from other components (e.g., Main page)
    this.todosService.editTodo$.subscribe((todo) => {
      if (todo) {
        this.editTodo(todo);
        this.todosService.clearEditTodo();
      }
    });
  }

  getIncompleteTodos(todos: Todo[]): Todo[] {
    return todos.filter(t => !t.completed);
  }

  getCompletedTodos(todos: Todo[]): Todo[] {
    return todos.filter(t => t.completed);
  }

  confirmDelete(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.deleteConfirmTodoId = id;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteConfirmTodoId = null;
  }

  confirmDeleteAction(): void {
    if (this.deleteConfirmTodoId) {
      this.todosService.deleteTodo(this.deleteConfirmTodoId);
      this.cancelDelete();
    }
  }

  openModal() {
    this.editingTodoId = null;
    this.resetForm();
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingTodoId = null;
    this.resetForm();
  }

  editTodo(todo: Todo) {
    this.editingTodoId = todo.id;
    this.newTodo = {
      title: todo.title,
      description: todo.description || '',
      dueDate: todo.dueDate,
      topicId: todo.topicId
    };
    this.showModal = true;
  }

  async addNewTodo() {
    if (!this.newTodo.title || !this.newTodo.dueDate) return;

    try {
      if (this.editingTodoId) {
        await this.todosService.updateTodo(this.editingTodoId, {
          title: this.newTodo.title,
          description: this.newTodo.description,
          dueDate: this.newTodo.dueDate,
          topicId: this.newTodo.topicId
        });
      } else {
        await this.todosService.addTodo(
          this.newTodo.title,
          this.newTodo.dueDate,
          this.newTodo.topicId,
          this.newTodo.description
        );
      }

      this.closeModal();
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  }

  async toggleTodo(todo: Todo) {
    try {
      await this.todosService.updateTodo(todo.id, { completed: !todo.completed });
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  }

  isOverdue(todo: Todo): boolean {
    if (todo.completed || !todo.dueDate) return false;
    return todo.dueDate < this.getTodayDate();
  }

  async deleteTodo(id: string) {
    this.confirmDelete(id);
  }

  formatDate(date: string): string {
    const d = new Date(date + 'T00:00:00');
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }

  getTopicName(topicId: string): string {
    return this.topicMap.get(topicId)?.name || 'N/A';
  }

  getTopicColor(topicId: string): string {
    return this.topicMap.get(topicId)?.color || '#f472b6';
  }

  private resetForm(): void {
    this.newTodo = {
      title: '',
      description: '',
      dueDate: this.getTodayDate(),
      topicId: null
    };
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
}
