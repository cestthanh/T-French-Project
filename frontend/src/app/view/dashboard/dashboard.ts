import { Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from 'src/app/services/authService';
import { DashboardService } from 'src/app/services/dashboardService';
import { AdminService } from 'src/app/services/adminService';
import { StatTone } from 'src/app/components/baseControl/stat/stat';

interface NavItem { path: string; label: string; icon: string; exact?: boolean; adminOnly?: boolean; staffOnly?: boolean; }
interface StatCard { icon: string; label: string; value: string | number; tone: StatTone; urgent?: boolean; }

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.html',
    standalone: false
})
export class Dashboard implements OnInit {
  loading = true;
  statCards: StatCard[] = [];
  pendingCount = 0;
  upcomingBookings = 0;
  isMobile = window.innerWidth < 1024;
  sidebarOpen = false;
  isOverview = true;

  readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Tổng quan', icon: 'layout-dashboard', exact: true },
    { path: '/dashboard/assignments', label: 'Bài tập', icon: 'clipboard-list' },
    { path: '/dashboard/quizzes', label: 'Bài kiểm tra', icon: 'clipboard-check' },
    { path: '/dashboard/resources', label: 'Tài liệu', icon: 'folder-open' },
    { path: '/dashboard/bookings', label: 'Đặt lịch', icon: 'calendar-days' },
    { path: '/dashboard/classes', label: 'Khoá & lớp', icon: 'school', staffOnly: true },
    { path: '/dashboard/profile', label: 'Hồ sơ', icon: 'user-cog' },
    { path: '/dashboard/admin', label: 'Quản trị', icon: 'shield-check', adminOnly: true },
  ];

  readonly quickActions = [
    { path: '/dashboard/assignments', label: 'Bài tập', icon: 'clipboard-list', tone: 'primary-soft' as const, iconClass: 'text-primary' },
    { path: '/dashboard/quizzes', label: 'Bài kiểm tra', icon: 'clipboard-check', tone: 'primary-soft' as const, iconClass: 'text-primary' },
    { path: '/dashboard/resources', label: 'Tài liệu', icon: 'folder-open', tone: 'secondary-soft' as const, iconClass: 'text-secondary' },
    { path: '/dashboard/bookings', label: 'Đặt lịch', icon: 'calendar-days', tone: 'accent-soft' as const, iconClass: 'text-accent-dark' },
    // 'white', not 'muted' — the dashboard canvas is bg-muted, so a muted card
    // would dissolve into the page.
    { path: '/courses', label: 'Khoá học', icon: 'graduation-cap', tone: 'white' as const, iconClass: 'text-ink' },
  ];

  get visibleNav(): NavItem[] {
    return this.nav.filter(item =>
      (!item.adminOnly || this.auth.isAdmin) &&
      (!item.staffOnly || this.auth.isAdmin || this.auth.currentUser?.role === 'Teacher'));
  }

  get initial(): string {
    return (this.auth.currentUser?.fullName ?? 'U')[0].toUpperCase();
  }

  get roleTone(): 'danger-soft' | 'accent-soft' | 'primary-soft' {
    const role = this.auth.currentUser?.role;
    if (role === 'Admin') return 'danger-soft';
    if (role === 'Teacher') return 'accent-soft';
    return 'primary-soft';
  }

  get roleIcon(): string {
    const role = this.auth.currentUser?.role;
    if (role === 'Admin') return 'shield-check';
    if (role === 'Teacher') return 'graduation-cap';
    return 'user';
  }

  get welcomeSubtitle(): string {
    const role = this.auth.currentUser?.role;
    if (role === 'Admin') return 'Quản lý và giám sát toàn bộ nền tảng T-French.';
    if (role === 'Teacher') return 'Quản lý bài tập, tài liệu và lịch dạy của bạn.';
    return 'Theo dõi tiến trình học tập và lịch học của bạn.';
  }

  /** Returns undefined (falsy) rather than 0 so `*ngIf ... as` hides empty badges. */
  badgeFor(path: string): number | undefined {
    if (path === '/dashboard/assignments') return this.pendingCount || undefined;
    if (path === '/dashboard/bookings') return this.upcomingBookings || undefined;
    return undefined;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 1024;
    if (!this.isMobile) this.sidebarOpen = false;
  }

  closeOnMobile(): void {
    if (this.isMobile) this.sidebarOpen = false;
  }

  constructor(
    public auth: AuthService,
    private statsService: DashboardService,
    private adminService: AdminService,
    private router: Router,
  ) {
    this.isOverview = this.router.url === '/dashboard';
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => (this.isOverview = (e as NavigationEnd).urlAfterRedirects === '/dashboard'));
  }

  ngOnInit(): void {
    const role = this.auth.currentUser?.role;

    if (role === 'Admin') {
      this.adminService.getStats().subscribe({
        next: s => {
          this.statCards = [
            { icon: 'users', label: 'Người dùng', value: s.totalUsers, tone: 'primary' },
            { icon: 'graduation-cap', label: 'Học viên', value: s.totalStudents, tone: 'secondary' },
            { icon: 'clipboard-list', label: 'Bài tập', value: s.totalAssignments, tone: 'dark' },
            { icon: 'clipboard-check', label: 'Chờ chấm', value: s.pendingGrading, tone: 'danger', urgent: true },
            { icon: 'calendar-days', label: 'Lịch đã đặt', value: s.totalBookings, tone: 'primary' },
            { icon: 'newspaper', label: 'Bài blog', value: s.publishedPosts, tone: 'accent' },
          ];
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
      return;
    }

    this.statsService.getStats().subscribe({
      next: s => {
        if (role === 'Student') {
          this.pendingCount = s.pendingAssignments ?? 0;
          this.upcomingBookings = s.upcomingBookings ?? 0;
          this.statCards = [
            { icon: 'book-open', label: 'Khoá học đang học', value: s.enrolledCourses ?? 0, tone: 'primary' },
            { icon: 'clipboard-x', label: 'Bài chưa nộp', value: s.pendingAssignments ?? 0, tone: 'danger', urgent: true },
            { icon: 'triangle-alert', label: 'Bài quá hạn', value: s.overdueAssignments ?? 0, tone: 'accent', urgent: true },
            { icon: 'star', label: 'Bài đã được chấm', value: s.gradedSubmissions ?? 0, tone: 'secondary' },
            { icon: 'calendar-days', label: 'Lịch học sắp tới', value: s.upcomingBookings ?? 0, tone: 'primary' },
            { icon: 'folder-open', label: 'Tài liệu có thể xem', value: s.accessibleResources ?? 0, tone: 'dark' },
          ];
        } else {
          this.pendingCount = s.pendingGrading ?? 0;
          this.upcomingBookings = s.upcomingBookings ?? 0;
          this.statCards = [
            { icon: 'book-open', label: 'Khoá học của bạn', value: s.myCourses ?? 0, tone: 'primary' },
            { icon: 'users', label: 'Học viên', value: s.totalStudents ?? 0, tone: 'secondary' },
            { icon: 'clipboard-check', label: 'Bài chờ chấm', value: s.pendingGrading ?? 0, tone: 'danger', urgent: true },
            { icon: 'calendar-days', label: 'Lịch dạy sắp tới', value: s.upcomingBookings ?? 0, tone: 'accent' },
          ];
        }
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}
