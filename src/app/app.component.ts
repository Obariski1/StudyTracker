import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <div class="logo">Philine's <span>Lern Tracker</span></div>
      <a class="nav-btn" routerLink="/main" routerLinkActive="active">⏱ Hauptseite</a>
      <a class="nav-btn" routerLink="/calendar" routerLinkActive="active">📅 Kalender</a>
      <a class="nav-btn" routerLink="/topics" routerLinkActive="active">📚 Themen</a>
    </nav>
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
