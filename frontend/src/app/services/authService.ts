import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthResponse, RegisterRequest, User } from 'src/app/interface';
import { RouterConstant } from 'src/app/constants/RouterConstant';
import { StorageKey, UserRole } from 'src/app/constants/enum';
import { uriAuth } from './Uri/RequestUri/uriAuth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());

  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem(StorageKey.token);
  }

  get isLoggedIn(): boolean {
    const token = this.token;
    if (!token) return false;

    try {
      const payload = JSON.parse(this.decodeBase64Url(token.split('.')[1]));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === UserRole.Admin;
  }

  get isTeacher(): boolean {
    return this.currentUser?.role === UserRole.Teacher;
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(uriAuth.REGISTER, data).pipe(tap(res => this.saveSession(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(uriAuth.LOGIN, { email, password }).pipe(tap(res => this.saveSession(res)));
  }

  logout(): void {
    localStorage.removeItem(StorageKey.token);
    localStorage.removeItem(StorageKey.user);
    this.currentUserSubject.next(null);
    this.router.navigate(['/' + RouterConstant.signIn]);
  }

  /** Keep navigation/header identity in sync after a profile edit. */
  updateCurrentUser(changes: Partial<User>): void {
    const current = this.currentUser;
    if (!current) return;
    const updated = { ...current, ...changes };
    localStorage.setItem(StorageKey.user, JSON.stringify(updated));
    this.currentUserSubject.next(updated);
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem(StorageKey.token, res.token);
    localStorage.setItem(StorageKey.user, JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }

  private getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(StorageKey.user);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private decodeBase64Url(value: string): string {
    const normalised = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalised.padEnd(Math.ceil(normalised.length / 4) * 4, '=');
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
  }
}
