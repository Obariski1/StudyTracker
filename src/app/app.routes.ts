import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'main', pathMatch: 'full' },
  {
    path: 'main',
    loadComponent: () =>
      import('./components/main/main.component').then(m => m.MainComponent),
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./components/calendar/calendar.component').then(m => m.CalendarComponent),
  },
  {
    path: 'topics',
    loadComponent: () =>
      import('./components/topics/topics.component').then(m => m.TopicsComponent),
  },
  { path: '**', redirectTo: 'main' },
];
