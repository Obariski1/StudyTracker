import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Todo } from '../models/todo.model';

@Injectable({ providedIn: 'root' })
export class TodosService {
  todos$ = new BehaviorSubject<Todo[]>([]);
  editTodo$ = new BehaviorSubject<Todo | null>(null);

  constructor(private supabase: SupabaseService) {
    this.loadTodos();
  }

  async loadTodos() {
    try {
      const todos = await this.supabase.getTodos();
      this.todos$.next(todos);
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  }

  async addTodo(title: string, dueDate: string, topicId: string | null, description?: string) {
    try {
      const todo = await this.supabase.addTodo({
        title,
        description,
        topicId,
        dueDate
      });
      if (todo) {
        const current = this.todos$.value;
        this.todos$.next([...current, todo].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      }
      return todo;
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  }

  async updateTodo(id: string, updates: Partial<Todo>) {
    try {
      const current = this.todos$.value;
      const todo = current.find(t => t.id === id);
      if (todo) {
        const updated = await this.supabase.updateTodo(id, { ...todo, ...updates });
        if (!updated) {
          await this.loadTodos();
          return;
        }
        this.todos$.next(current.map(t => t.id === id ? updated : t));
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  async deleteTodo(id: string) {
    try {
      await this.supabase.deleteTodo(id);
      const current = this.todos$.value;
      this.todos$.next(current.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  getTodaysDate() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  }

  getTodaysTodos() {
    const today = this.getTodaysDate();
    return this.todos$.value.filter(t => t.dueDate === today && !t.completed);
  }

  setEditTodo(todo: Todo) {
    this.editTodo$.next(todo);
  }

  clearEditTodo() {
    this.editTodo$.next(null);
  }
}
