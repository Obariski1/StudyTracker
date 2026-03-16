import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (authService.currentUser()) {
      <nav>
        <div class="logo">Philine's <span>Lern Tracker</span></div>
        <div class="nav-right">
          <a class="nav-btn" routerLink="/main" routerLinkActive="active">⏱ Hauptseite</a>
          <a class="nav-btn" routerLink="/calendar" routerLinkActive="active">📅 Kalender</a>
          <a class="nav-btn" routerLink="/topics" routerLinkActive="active">📚 Themen</a>
          <button class="logout-btn" (click)="logout()">🚪 Logout</button>
        </div>
      </nav>
    }
    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      border-bottom: 2px solid #f0f0f0;
      gap: 20px;
    }

    .logo {
      font-size: 20px;
      font-weight: bold;
      color: #333;
      white-space: nowrap;
    }

    .logo span {
      color: #f472b6;
    }

    .nav-right {
      display: flex;
      gap: 10px;
      margin-left: auto;
      align-items: center;
    }

    .nav-btn {
      padding: 8px 16px;
      border-radius: 5px;
      text-decoration: none;
      color: #666;
      font-weight: 500;
      transition: all 0.3s;
      font-size: 14px;
    }

    .nav-btn:hover {
      background: #f0f0f0;
      color: #333;
    }

    .nav-btn.active {
      background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%);
      color: white;
    }

    .logout-btn {
      padding: 8px 16px;
      background: #f472b6;
      color: white;
      border: none;
      border-radius: 5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 14px;
      white-space: nowrap;
    }

    .logout-btn:hover {
      background: #ec4899;
      transform: translateY(-2px);
    }

    main {
      flex: 1;
      overflow-y: auto;
    }
  `]
})
export class AppComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  async logout() {
    if (confirm('Are you sure you want to logout?')) {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    }
  }
}

