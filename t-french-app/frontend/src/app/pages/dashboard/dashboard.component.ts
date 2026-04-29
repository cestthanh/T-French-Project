import { Component, OnInit, HostListener } from '@angular/core';
import { AuthService } from '../../auth.service';
import { DashboardStatsService } from '../../dashboard-stats.service';
import { AdminService, AdminStats } from '../../admin.service';

interface StatCard {
  icon: string; label: string; value: string | number;
  color: string; badge?: boolean;
}

@Component({
  selector: 'app-dashboard',
  template: `
<div class="dashboard-layout" [class.sidebar-open]="sidebarOpen">

  <!-- Mobile overlay -->
  <div class="overlay" *ngIf="sidebarOpen && isMobile" (click)="sidebarOpen=false"></div>

  <!-- ── SIDEBAR ──────────────────────────────────────────────────── -->
  <nav class="sidenav" [class.collapsed]="!sidebarOpen && isMobile">
    <div class="sidenav-header">
      <span class="brand">🇫🇷 T-French</span>
      <div class="user-avatar">{{ initial }}</div>
      <div class="user-name">{{ auth.currentUser?.fullName }}</div>
      <span class="role-badge {{ auth.currentUser?.role?.toLowerCase() }}">
        {{ auth.currentUser?.role }}
      </span>
    </div>

    <mat-nav-list class="nav-list">
      <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link"
         [routerLinkActiveOptions]="{exact:true}" (click)="closeSidebarMobile()">
        <mat-icon matListItemIcon>dashboard</mat-icon>
        <span matListItemTitle>Tổng quan</span>
      </a>

      <a mat-list-item routerLink="/dashboard/assignments" routerLinkActive="active-link"
         (click)="closeSidebarMobile()">
        <mat-icon matListItemIcon>assignment</mat-icon>
        <span matListItemTitle>Bài tập</span>
        <span class="notif-badge" *ngIf="pendingCount > 0">{{ pendingCount }}</span>
      </a>

      <a mat-list-item routerLink="/dashboard/resources" routerLinkActive="active-link"
         (click)="closeSidebarMobile()">
        <mat-icon matListItemIcon>folder_open</mat-icon>
        <span matListItemTitle>Tài liệu</span>
      </a>

      <a mat-list-item routerLink="/dashboard/bookings" routerLinkActive="active-link"
         (click)="closeSidebarMobile()">
        <mat-icon matListItemIcon>calendar_month</mat-icon>
        <span matListItemTitle>Đặt lịch</span>
        <span class="notif-badge green" *ngIf="upcomingBookings > 0">{{ upcomingBookings }}</span>
      </a>

      <a mat-list-item routerLink="/dashboard/profile" routerLinkActive="active-link"
         (click)="closeSidebarMobile()">
        <mat-icon matListItemIcon>manage_accounts</mat-icon>
        <span matListItemTitle>Hồ sơ</span>
      </a>

      <a mat-list-item *ngIf="auth.isAdmin" routerLink="/dashboard/admin"
         routerLinkActive="active-link" (click)="closeSidebarMobile()">
        <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
        <span matListItemTitle>Quản trị</span>
      </a>
    </mat-nav-list>

    <div class="sidenav-footer">
      <a routerLink="/home" mat-stroked-button class="home-btn">
        <mat-icon>home</mat-icon> Trang chủ
      </a>
      <button mat-stroked-button color="warn" (click)="auth.logout()" class="logout-btn">
        <mat-icon>logout</mat-icon> Đăng xuất
      </button>
    </div>
  </nav>

  <!-- ── MAIN CONTENT ─────────────────────────────────────────────── -->
  <div class="main-wrap">
    <!-- Mobile topbar -->
    <header class="mobile-topbar" *ngIf="isMobile">
      <button mat-icon-button (click)="sidebarOpen=!sidebarOpen">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="mobile-brand">🇫🇷 T-French</span>
      <button mat-icon-button routerLink="/dashboard/profile">
        <mat-icon>account_circle</mat-icon>
      </button>
    </header>

    <main class="main-content">
      <!-- Welcome banner -->
      <div class="welcome-banner">
        <div class="welcome-text">
          <h2>Xin chào, <span class="name-highlight">{{ auth.currentUser?.fullName }}</span>! 👋</h2>
          <p>{{ welcomeSubtitle }}</p>
        </div>
        <div class="welcome-role">
          <span class="role-badge-lg {{ auth.currentUser?.role?.toLowerCase() }}">
            <mat-icon>{{ roleIcon }}</mat-icon>
            {{ auth.currentUser?.role }}
          </span>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div class="skeleton-grid" *ngIf="loading">
        <div class="skeleton-card" *ngFor="let i of [1,2,3,4]">
          <div class="skeleton-icon"></div>
          <div class="skeleton-body">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line long"></div>
          </div>
        </div>
      </div>

      <!-- Live stats cards -->
      <div class="stats-grid" *ngIf="!loading">
        <div class="stat-card" *ngFor="let s of statCards" [style.--accent]="s.color">
          <div class="stat-icon-wrap"><mat-icon>{{ s.icon }}</mat-icon></div>
          <div class="stat-body">
            <div class="stat-value">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
          <span class="urgent-dot" *ngIf="s.badge && +s.value > 0"></span>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="quick-actions">
        <h3>Truy cập nhanh</h3>
        <div class="action-grid">
          <a routerLink="/dashboard/assignments" class="action-btn">
            <mat-icon>assignment</mat-icon><span>Bài tập</span>
          </a>
          <a routerLink="/dashboard/resources" class="action-btn">
            <mat-icon>folder_open</mat-icon><span>Tài liệu</span>
          </a>
          <a routerLink="/dashboard/bookings" class="action-btn">
            <mat-icon>calendar_month</mat-icon><span>Đặt lịch</span>
          </a>
          <a routerLink="/courses" class="action-btn" target="_self">
            <mat-icon>school</mat-icon><span>Khoá học</span>
          </a>
        </div>
      </div>

      <!-- Router outlet for sub-routes -->
      <router-outlet></router-outlet>
    </main>
  </div>
</div>
  `,
  styles: [`
    :host { display:block; }
    .dashboard-layout { display:flex; min-height:100vh; position:relative; }
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:99; }

    /* ── Sidebar ── */
    .sidenav {
      width:260px; background:#fff; border-right:1px solid var(--border);
      display:flex; flex-direction:column; position:sticky; top:0; height:100vh;
      overflow-y:auto; flex-shrink:0; transition:transform .25s ease; z-index:100;
    }
    @media (max-width:768px) {
      .sidenav { position:fixed; left:0; top:0; height:100%; transform:translateX(-100%); box-shadow:4px 0 24px rgba(0,0,0,.15); }
      .sidenav:not(.collapsed) { transform:translateX(0); }
      .dashboard-layout.sidebar-open .sidenav { transform:translateX(0); }
    }
    .sidenav-header { padding:20px 16px; border-bottom:1px solid var(--border); text-align:center; background:linear-gradient(135deg,#3949ab,#5c6bc0); color:#fff; }
    .brand { font-size:1.1rem; font-weight:700; display:block; margin-bottom:10px; }
    .user-avatar { width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,.25); color:#fff; font-size:1.4rem; font-weight:800; display:flex; align-items:center; justify-content:center; margin:0 auto 8px; border:2px solid rgba(255,255,255,.5); }
    .user-name { font-weight:600; font-size:.95rem; margin-bottom:6px; }
    .role-badge { display:inline-block; font-size:.7rem; font-weight:700; padding:3px 10px; border-radius:10px; background:rgba(255,255,255,.2); }
    .role-badge.admin   { background:#e8f5e9; color:#2e7d32; }
    .role-badge.teacher { background:#fff3e0; color:#e65100; }
    .role-badge.student { background:#e3f2fd; color:#1565c0; }
    .nav-list { flex:1; padding:8px; }
    .nav-list a { border-radius:8px; margin-bottom:2px; transition:.15s; position:relative; }
    .nav-list a:hover { background:rgba(57,73,171,.06); }
    .active-link { background:rgba(57,73,171,.1) !important; color:#3949ab !important; font-weight:600; }
    .active-link mat-icon { color:#3949ab !important; }
    .notif-badge { position:absolute; right:12px; background:#ef5350; color:#fff; font-size:.65rem; font-weight:700; padding:1px 6px; border-radius:10px; }
    .notif-badge.green { background:#43a047; }
    .sidenav-footer { padding:16px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px; }
    .logout-btn, .home-btn { width:100%; }

    /* ── Main ── */
    .main-wrap { flex:1; display:flex; flex-direction:column; min-width:0; }
    .mobile-topbar {
      display:none; padding:8px 12px; background:#fff; border-bottom:1px solid var(--border);
      align-items:center; gap:8px; position:sticky; top:0; z-index:10;
    }
    @media (max-width:768px) { .mobile-topbar { display:flex; } }
    .mobile-brand { flex:1; font-weight:700; font-size:1rem; }
    .main-content { padding:24px; background:var(--bg,#f5f6fa); flex:1; }
    @media (max-width:768px) { .main-content { padding:16px; } }

    /* ── Welcome banner ── */
    .welcome-banner { background:#fff; border-radius:16px; padding:24px 28px; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(0,0,0,.05); }
    @media (max-width:600px) { .welcome-banner { flex-direction:column; gap:12px; text-align:center; } }
    .welcome-banner h2 { font-size:1.35rem; font-weight:700; margin:0 0 4px; }
    .welcome-banner p  { color:var(--text-muted); margin:0; font-size:.9rem; }
    .name-highlight { color:#3949ab; }
    .role-badge-lg { display:flex; align-items:center; gap:6px; font-size:.85rem; font-weight:700; padding:8px 16px; border-radius:12px; white-space:nowrap; }
    .role-badge-lg.admin   { background:#e8f5e9; color:#2e7d32; }
    .role-badge-lg.teacher { background:#fff3e0; color:#e65100; }
    .role-badge-lg.student { background:#e3f2fd; color:#1565c0; }
    .role-badge-lg mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }

    /* ── Stats ── */
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-bottom:28px; }
    .stat-card { background:#fff; border-radius:14px; padding:20px; display:flex; align-items:center; gap:16px; box-shadow:0 2px 12px rgba(0,0,0,.05); border-left:4px solid var(--accent,#3949ab); position:relative; transition:.2s; }
    .stat-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.1); }
    .stat-icon-wrap { width:44px; height:44px; border-radius:10px; background:var(--accent,#3949ab); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .stat-icon-wrap mat-icon { color:#fff; font-size:1.3rem; width:1.3rem; height:1.3rem; }
    .stat-value { font-size:1.6rem; font-weight:800; line-height:1; margin-bottom:4px; }
    .stat-label { font-size:.75rem; color:var(--text-muted); }
    .urgent-dot { position:absolute; top:12px; right:12px; width:10px; height:10px; border-radius:50%; background:#ef5350; animation:pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    /* ── Skeleton ── */
    .skeleton-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-bottom:28px; }
    .skeleton-card { background:#fff; border-radius:14px; padding:20px; display:flex; align-items:center; gap:16px; box-shadow:0 2px 8px rgba(0,0,0,.04); }
    .skeleton-icon { width:44px; height:44px; border-radius:10px; background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; flex-shrink:0; }
    .skeleton-body { flex:1; }
    .skeleton-line { height:12px; border-radius:6px; background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; margin-bottom:8px; }
    .skeleton-line.short { width:60%; }
    .skeleton-line.long  { width:85%; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* ── Quick actions ── */
    .quick-actions { background:#fff; border-radius:14px; padding:20px 24px; box-shadow:0 2px 12px rgba(0,0,0,.05); }
    .quick-actions h3 { font-size:1rem; font-weight:700; margin:0 0 16px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.5px; font-size:.8rem; }
    .action-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media (max-width:600px) { .action-grid { grid-template-columns:repeat(2,1fr); } }
    .action-btn { display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px; border-radius:12px; background:#f8f9ff; border:1px solid #e8eaf6; text-decoration:none; color:#3949ab; font-size:.85rem; font-weight:600; transition:.15s; }
    .action-btn:hover { background:#e8eaf6; transform:translateY(-2px); }
    .action-btn mat-icon { font-size:1.6rem; width:1.6rem; height:1.6rem; }
  `]
})
export class DashboardComponent implements OnInit {
  loading = true;
  statCards: StatCard[] = [];
  pendingCount = 0;
  upcomingBookings = 0;
  isMobile = window.innerWidth < 769;
  sidebarOpen = false;

  get initial(): string {
    return (this.auth.currentUser?.fullName ?? 'U')[0].toUpperCase();
  }

  get roleIcon(): string {
    const r = this.auth.currentUser?.role;
    return r === 'Admin' ? 'admin_panel_settings' : r === 'Teacher' ? 'school' : 'person';
  }

  get welcomeSubtitle(): string {
    const r = this.auth.currentUser?.role;
    if (r === 'Admin')   return 'Quản lý và giám sát toàn bộ nền tảng T-French.';
    if (r === 'Teacher') return 'Quản lý bài tập, tài liệu và lịch dạy của bạn.';
    return 'Theo dõi tiến trình học tập và lịch học của bạn.';
  }

  @HostListener('window:resize')
  onResize() { this.isMobile = window.innerWidth < 769; }

  closeSidebarMobile() { if (this.isMobile) this.sidebarOpen = false; }

  constructor(
    public auth: AuthService,
    private statsService: DashboardStatsService,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    const role = this.auth.currentUser?.role;
    if (role === 'Admin') {
      this.adminService.getStats().subscribe({
        next: (s) => {
          this.statCards = [
            { icon: 'people',        label: 'Người dùng',    value: s.totalUsers,      color: '#3949ab' },
            { icon: 'school',        label: 'Học viên',      value: s.totalStudents,   color: '#00897b' },
            { icon: 'assignment',    label: 'Bài tập',       value: s.totalAssignments,color: '#7b1fa2' },
            { icon: 'grading',       label: 'Chờ chấm',      value: s.pendingGrading,  color: '#c62828', badge: true },
            { icon: 'calendar_month',label: 'Lịch đã đặt',  value: s.totalBookings,   color: '#1565c0' },
            { icon: 'article',       label: 'Bài blog',      value: s.publishedPosts,  color: '#2e7d32' },
          ];
          this.loading = false;
        },
        error: () => this.loading = false
      });
    } else {
      this.statsService.getStats().subscribe({
        next: (s) => {
          if (role === 'Student') {
            this.pendingCount    = s.pendingAssignments;
            this.upcomingBookings = s.upcomingBookings;
            this.statCards = [
              { icon: 'library_books',  label: 'Khoá học đang học',   value: s.enrolledCourses,      color: '#3949ab' },
              { icon: 'assignment_late',label: 'Bài chưa nộp',        value: s.pendingAssignments,   color: '#c62828', badge: true },
              { icon: 'warning',        label: 'Bài quá hạn',         value: s.overdueAssignments,   color: '#e65100', badge: true },
              { icon: 'star',           label: 'Bài đã được chấm',    value: s.gradedSubmissions,    color: '#2e7d32' },
              { icon: 'calendar_month', label: 'Lịch học sắp tới',    value: s.upcomingBookings,     color: '#1565c0' },
              { icon: 'folder_open',    label: 'Tài liệu có thể xem', value: s.accessibleResources,  color: '#00897b' },
            ];
          } else { // Teacher
            this.pendingCount    = s.pendingGrading;
            this.upcomingBookings = s.upcomingBookings;
            this.statCards = [
              { icon: 'library_books',  label: 'Khoá học của bạn',  value: s.myCourses,       color: '#3949ab' },
              { icon: 'people',         label: 'Học viên',           value: s.totalStudents,   color: '#00897b' },
              { icon: 'grading',        label: 'Bài chờ chấm',      value: s.pendingGrading,  color: '#c62828', badge: true },
              { icon: 'calendar_month', label: 'Lịch dạy sắp tới',  value: s.upcomingBookings,color: '#1565c0' },
            ];
          }
          this.loading = false;
        },
        error: () => this.loading = false
      });
    }
  }
}
