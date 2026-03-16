import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabaseService = inject(SupabaseService);

  currentUser = signal<any>(null);
  isLoading = signal(true);

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    // Check for existing session on app start
    this.supabaseService.getCurrentUser().then(user => {
      this.currentUser.set(user);
      this.isLoading.set(false);
    });

    // Listen for auth state changes
    this.supabaseService.onAuthStateChange((user) => {
      this.currentUser.set(user);
      this.isLoading.set(false);
    });
  }

  async signIn(email: string, password: string) {
    const result = await this.supabaseService.signIn(email, password);
    if (result.user) {
      this.currentUser.set(result.user);
    }
    return result;
  }

  async signOut() {
    await this.supabaseService.signOut();
    this.currentUser.set(null);
  }

  isAuthenticated() {
    return this.currentUser() !== null;
  }
}
