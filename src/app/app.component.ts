import { Component, inject, ElementRef, HostListener, ViewChild, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (authService.currentUser()) {
      <nav [class.hidden]="!showNav">
        <div class="logo">Philine's <span>Lern Tracker</span></div>
        <div class="nav-right">
          <a class="nav-btn" routerLink="/main" routerLinkActive="active">⏱ Hauptseite</a>
          <a class="nav-btn" routerLink="/calendar" routerLinkActive="active">📅 Kalender</a>
          <a class="nav-btn" routerLink="/todos" routerLinkActive="active">📋 Todos</a>
          <a class="nav-btn" routerLink="/topics" routerLinkActive="active">📚 Themen</a>
          <button class="logout-btn" (click)="logout()">🚪 Logout</button>
        </div>
      </nav>
    }
    <main #scrollContainer (scroll)="onScroll($event)">
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
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: var(--bg);
      z-index: 100;
      transform: translateY(0);
      transition: transform 0.3s ease;
    }

    nav.hidden {
      transform: translateY(-250%);
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

    .top-sentinel {
      height: 1px;
      width: 100%;
      pointer-events: none;
    }

    main {
      flex: 1;
      overflow-y: auto;
      padding-top: 60px;
    }
  `]
})
export class AppComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('scrollContainer', { static: true }) private scrollContainer!: ElementRef<HTMLElement>;

  showNav = true;
  private lastScrollTop = 0;

  ngOnInit() {
    // Show nav initially
    this.showNav = true;
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.updateNavVisibility(this.getScrollTop());
  }

  onScroll(event: Event) {
    const target = event.target as HTMLElement;
    this.updateNavVisibility(target.scrollTop);
  }

  private getScrollTop(): number {
    // Prefer the container scroll first (mobile/small screens)
    const containerScroll = this.scrollContainer?.nativeElement?.scrollTop ?? 0;
    if (containerScroll > 0) {
      return containerScroll;
    }
    
    // Fall back to window scroll (desktop)
    const windowScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    return windowScroll;
  }

  private updateNavVisibility(scrollTop: number) {
    // Always show nav at the very top (0-5px)
    if (scrollTop <= 5) {
      this.showNav = true;
      this.lastScrollTop = scrollTop;
      return;
    }

    // Hide on any downward scroll, show on upward scroll
    const delta = scrollTop - this.lastScrollTop;
    if (delta > 0) {
      // scrolling down - hide immediately
      this.showNav = false;
    } else if (delta < 0) {
      // scrolling up - show immediately
      this.showNav = true;
    }

    this.lastScrollTop = scrollTop;
  }

  async logout() {
    if (confirm('Are you sure you want to logout?')) {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    }
  }
}

