import { Component } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
    selector: 'app-navbar',
    template: `
<nav class="navbar">
  <div class="container nav-inner">
    <!-- Brand -->
    <a class="brand" routerLink="/">
      <svg width="32" height="22" viewBox="0 0 48 32" style="border-radius:3px;flex-shrink:0">
        <rect x="0"  width="16" height="32" fill="#002395"/>
        <rect x="16" width="16" height="32" fill="#fff"/>
        <rect x="32" width="16" height="32" fill="#ED2939"/>
      </svg>
      T-French
    </a>

    <!-- Main links -->
    <div class="nav-links">
      <a routerLink="/home"    routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Trang chủ</a>
      <a routerLink="/courses" routerLinkActive="active">Khoá học</a>
      <a routerLink="/blog"    routerLinkActive="active">Blog</a>
    </div>

    <!-- Guest buttons -->
    <div class="nav-auth" *ngIf="!auth.isLoggedIn">
      <a routerLink="/auth/login"    class="btn-outline">Đăng nhập</a>
      <a routerLink="/auth/register" class="btn-filled">Đăng ký miễn phí</a>
    </div>

    <!-- Logged-in area -->
    <div class="nav-auth user-area" *ngIf="auth.isLoggedIn">
      <span class="user-greeting">
        <div class="user-dot">{{ initial }}</div>
        {{ auth.currentUser?.fullName }}
      </span>
      <a routerLink="/dashboard" class="btn-outline">
        <mat-icon>dashboard</mat-icon> Dashboard
      </a>
      <button class="btn-logout" (click)="auth.logout()" title="Đăng xuất">
        <mat-icon>logout</mat-icon>
      </button>
    </div>
  </div>
</nav>
    `,
    styles: [`
    .navbar {
      position: sticky; top: 0; z-index: 200;
      background: rgba(255,255,255,.96);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(57,73,171,.1);
      box-shadow: 0 2px 16px rgba(57,73,171,.06);
    }
    .nav-inner {
      display: flex; align-items: center; gap: 20px; height: 64px;
    }
    .brand {
      display: flex; align-items: center; gap: 8px;
      font-size: 1.15rem; font-weight: 800; color: #3949ab;
      text-decoration: none; white-space: nowrap; flex-shrink: 0;
    }
    .nav-links {
      display: flex; gap: 2px; flex: 1;
    }
    @media (max-width: 640px) { .nav-links { display: none; } }
    .nav-links a {
      padding: 6px 14px; border-radius: 8px;
      color: #424242; text-decoration: none;
      font-weight: 500; font-size: .9rem;
      transition: background .15s, color .15s;
    }
    .nav-links a:hover, .nav-links a.active {
      background: rgba(57,73,171,.08); color: #3949ab;
    }
    .nav-auth { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .btn-outline {
      padding: 7px 16px; border-radius: 8px; border: 1.5px solid #c5cae9;
      color: #3949ab; font-size: .85rem; font-weight: 600;
      text-decoration: none; background: transparent; cursor: pointer;
      display: flex; align-items: center; gap: 4px;
      transition: background .15s, border-color .15s;
    }
    .btn-outline mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .btn-outline:hover { background: #e8eaf6; border-color: #3949ab; text-decoration: none; }
    .btn-filled {
      padding: 7px 18px; border-radius: 8px;
      background: linear-gradient(135deg, #3949ab, #5c6bc0);
      color: #fff; font-size: .85rem; font-weight: 600; text-decoration: none;
      box-shadow: 0 2px 8px rgba(57,73,171,.3);
      transition: transform .15s, box-shadow .15s;
    }
    .btn-filled:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(57,73,171,.4); text-decoration: none; }
    .user-area { gap: 10px; }
    .user-greeting {
      display: flex; align-items: center; gap: 8px;
      font-size: .85rem; font-weight: 500; color: #424242;
    }
    @media (max-width: 900px) { .user-greeting { display: none; } }
    .user-dot {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #3949ab, #5c6bc0);
      color: #fff; font-size: .8rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .btn-logout {
      width: 36px; height: 36px; border-radius: 8px; border: 1.5px solid #ef9a9a;
      background: transparent; color: #e53935; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .btn-logout mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .btn-logout:hover { background: #ffebee; }
    `]
})
export class NavbarComponent {
    constructor(public auth: AuthService) {}
    get initial(): string { return (this.auth.currentUser?.fullName ?? 'U')[0].toUpperCase(); }
}
