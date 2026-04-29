import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <!-- Show Material toolbar ONLY on dashboard (private) routes -->
    <mat-toolbar color="primary" *ngIf="showToolbar" class="app-toolbar">
      <span class="brand">🇫🇷 T-French</span>
      <span class="spacer"></span>
      <button mat-icon-button [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #userMenu="matMenu">
        <button mat-menu-item routerLink="/dashboard"><mat-icon>dashboard</mat-icon> Dashboard</button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon> Đăng xuất</button>
      </mat-menu>
    </mat-toolbar>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .app-toolbar { position: sticky; top: 0; z-index: 100; }
    .brand       { font-weight: 700; font-size: 1.2rem; }
    .spacer      { flex: 1; }
  `]
})
export class AppComponent {
  showToolbar = false;

  constructor(public auth: AuthService, private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      // Show toolbar only on dashboard/* routes
      this.showToolbar = (e.urlAfterRedirects as string).startsWith('/dashboard');
    });
  }
}
