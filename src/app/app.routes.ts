import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'main', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'main',
    loadComponent: () =>
      import('./components/main/main.component').then(m => m.MainComponent),
    canActivate: [authGuard],
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./components/calendar/calendar.component').then(m => m.CalendarComponent),
    canActivate: [authGuard],
  },
  {
    path: 'topics',
    loadComponent: () =>
      import('./components/topics/topics.component').then(m => m.TopicsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'todos',
    loadComponent: () =>
      import('./components/todos/todos.component').then(m => m.TodosComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'main' },
];
