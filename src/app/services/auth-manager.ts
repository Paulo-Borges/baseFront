import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { IUser } from '../models/IUser';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthManager {
  private readonly apiUrl = 'http://localhost:7277/api';

  private currentUser = signal<IUser | null>(null);
  private token = signal<string | null>(null);

  user = this.currentUser.asReadonly();
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadUserFromLocalStorage();
  }

  login(email: string, password: string): Observable<{ token: string; user: IUser }> {
    return this.http
      .post<{ token: string; user: IUser }>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((response) => {
          this.currentUser.set(response.user);
          this.token.set(response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
        }),
      );
  }

  logout(): void {
    this.currentUser.set(null);
    this.token.set(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.token();
  }

  private loadUserFromLocalStorage(): void {
    const userJson = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');

    if (userJson && token) {
      try {
        const user: IUser = JSON.parse(userJson);
        this.currentUser.set(user);
        this.token.set(token);
      } catch {
        this.logout();
      }
    }
  }
}
