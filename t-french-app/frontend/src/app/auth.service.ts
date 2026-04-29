import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

export interface User {
    id: number;
    fullName: string;
    email: string;
    role: 'Admin' | 'Teacher' | 'Student';
    avatarUrl?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly TOKEN_KEY = 'tf_token';
    private readonly USER_KEY = 'tf_user';
    private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());

    currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient, private router: Router) { }

    get currentUser(): User | null { return this.currentUserSubject.value; }
    get token(): string | null { return localStorage.getItem(this.TOKEN_KEY); }
    get isLoggedIn(): boolean { return !!this.token; }
    get isAdmin(): boolean { return this.currentUser?.role === 'Admin'; }
    get isTeacher(): boolean { return this.currentUser?.role === 'Teacher'; }

    register(data: { fullName: string; email: string; password: string; phoneNumber?: string }): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data)
            .pipe(tap(res => this.saveSession(res)));
    }

    login(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
            .pipe(tap(res => this.saveSession(res)));
    }

    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.currentUserSubject.next(null);
        this.router.navigate(['/auth/login']);
    }

    private saveSession(res: AuthResponse): void {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
    }

    private getStoredUser(): User | null {
        try {
            const raw = localStorage.getItem(this.USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }
}
