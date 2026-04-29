import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CourseService, CourseDetail } from '../../course.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-course-detail',
  template: `
<div class="detail-wrap" *ngIf="course; else loading">
  <!-- Hero -->
  <div class="detail-hero"
       [style.background-image]="course.imageUrl ? 'url('+course.imageUrl+')' : ''">
    <div class="hero-overlay">
      <div class="hero-inner">
        <span class="level-chip" *ngIf="course.level">{{ course.level }}</span>
        <h1>{{ course.title }}</h1>
        <p>{{ course.description }}</p>
        <div class="hero-meta">
          <span><mat-icon>person</mat-icon>{{ course.teacher }}</span>
          <span><mat-icon>group</mat-icon>{{ course.enrollmentCount }} học viên</span>
          <span><mat-icon>assignment</mat-icon>{{ course.assignmentCount }} bài tập</span>
          <span><mat-icon>folder</mat-icon>{{ course.resourceCount }} tài liệu</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Action bar -->
  <div class="action-bar">
    <div class="container">
      <div class="action-inner">
        <div class="price-block">
          <span class="price" *ngIf="course.price > 0">{{ course.price | number }}đ</span>
          <span class="price free" *ngIf="course.price === 0">Miễn phí</span>
        </div>
        <div class="action-btns">
          <button mat-stroked-button routerLink="/courses" class="back-btn">
            <mat-icon>arrow_back</mat-icon> Tất cả khoá học
          </button>
          <!-- Not logged in -->
          <button mat-raised-button color="primary" *ngIf="!auth.isLoggedIn"
                  routerLink="/auth/register">
            Đăng ký để học <mat-icon>arrow_forward</mat-icon>
          </button>
          <!-- Student enrolled -->
          <button mat-raised-button color="primary" disabled *ngIf="auth.isLoggedIn && course.isEnrolled">
            <mat-icon>check_circle</mat-icon> Đã đăng ký
          </button>
          <!-- Student not enrolled -->
          <button mat-raised-button color="primary"
                  *ngIf="auth.isLoggedIn && !course.isEnrolled && auth.currentUser?.role === 'Student'"
                  (click)="onEnroll()" [disabled]="enrolling">
            {{ enrolling ? 'Đang đăng ký...' : 'Đăng ký khoá học' }}
          </button>
          <!-- Teacher/Admin go to dashboard -->
          <button mat-raised-button color="accent"
                  *ngIf="auth.isLoggedIn && auth.currentUser?.role !== 'Student'"
                  routerLink="/dashboard">
            <mat-icon>dashboard</mat-icon> Vào Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="container content-area">
    <div class="what-learn">
      <h2>Bạn sẽ học được gì?</h2>
      <div class="learn-grid">
        <div class="learn-item"><mat-icon>check_circle</mat-icon> Phát âm chuẩn tiếng Pháp</div>
        <div class="learn-item"><mat-icon>check_circle</mat-icon> Giao tiếp cơ bản hàng ngày</div>
        <div class="learn-item"><mat-icon>check_circle</mat-icon> Ngữ pháp nền tảng vững chắc</div>
        <div class="learn-item"><mat-icon>check_circle</mat-icon> Từ vựng theo chủ đề thiết thực</div>
        <div class="learn-item"><mat-icon>check_circle</mat-icon> Kỹ năng đọc hiểu văn bản đơn giản</div>
        <div class="learn-item"><mat-icon>check_circle</mat-icon> Tự tin trong môi trường Pháp ngữ</div>
      </div>
    </div>
  </div>
</div>

<ng-template #loading>
  <div class="loading-state">
    <mat-spinner diameter="48"></mat-spinner>
    <p>Đang tải thông tin khoá học...</p>
  </div>
</ng-template>
  `,
  styles: [`
    .detail-wrap { min-height:100vh; background:#f5f6fa; }

    /* Hero */
    .detail-hero { min-height:380px; background:linear-gradient(135deg,#283593,#3949ab) center/cover no-repeat; }
    .hero-overlay { min-height:380px; background:linear-gradient(to bottom,rgba(20,20,60,.6),rgba(20,20,60,.8)); display:flex; align-items:flex-end; }
    .hero-inner { max-width:1200px; margin:0 auto; padding:40px 24px; width:100%; color:#fff; }
    .level-chip { background:rgba(255,255,255,.2); color:#fff; font-size:.75rem; font-weight:700; padding:4px 12px; border-radius:10px; display:inline-block; margin-bottom:12px; }
    .hero-inner h1 { font-size:2rem; font-weight:800; margin:0 0 12px; }
    .hero-inner p  { font-size:1rem; opacity:.88; margin:0 0 20px; max-width:600px; }
    .hero-meta { display:flex; gap:20px; flex-wrap:wrap; font-size:.9rem; opacity:.85; }
    .hero-meta span { display:flex; align-items:center; gap:6px; }
    .hero-meta mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }

    /* Action bar */
    .action-bar { background:#fff; border-bottom:1px solid var(--border); position:sticky; top:0; z-index:10; box-shadow:0 2px 12px rgba(0,0,0,.06); }
    .action-inner { display:flex; align-items:center; justify-content:space-between; padding:16px 0; flex-wrap:wrap; gap:12px; }
    .price { font-size:1.5rem; font-weight:800; color:#3949ab; }
    .price.free { color:#2e7d32; }
    .action-btns { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
    .back-btn { color:var(--text-muted); }

    /* Container */
    .container { max-width:1200px; margin:0 auto; padding:0 24px; }
    .content-area { padding-top:40px; padding-bottom:60px; }

    /* What you'll learn */
    .what-learn { background:#fff; border-radius:16px; padding:32px; margin-bottom:28px; box-shadow:0 2px 12px rgba(0,0,0,.05); }
    .what-learn h2 { font-size:1.2rem; font-weight:700; margin-bottom:20px; }
    .learn-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
    @media (max-width:600px) { .learn-grid { grid-template-columns:1fr; } }
    .learn-item { display:flex; align-items:center; gap:10px; font-size:.9rem; }
    .learn-item mat-icon { color:#2e7d32; font-size:1.1rem; width:1.1rem; height:1.1rem; flex-shrink:0; }

    /* Loading */
    .loading-state { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; gap:16px; color:var(--text-muted); }
  `]
})
export class CourseDetailComponent implements OnInit {
  course: CourseDetail | null = null;
  enrolling = false;

  constructor(
    private route: ActivatedRoute,
    private courseService: CourseService,
    public auth: AuthService,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.courseService.getById(id).subscribe({
      next: c => this.course = c,
      error: () => this.router.navigate(['/courses'])
    });
  }

  onEnroll() {
    if (!this.course) return;
    this.enrolling = true;
    this.courseService.enroll(this.course.id).subscribe({
      next: (res) => {
        this.enrolling = false;
        this.course!.isEnrolled = true;
        this.course!.enrollmentCount++;
        this.snack.open(res.message ?? 'Đăng ký thành công! 🎉', '✕', { duration: 3500 });
      },
      error: (err) => {
        this.enrolling = false;
        this.snack.open(err?.error?.message ?? 'Lỗi khi đăng ký.', '✕', { duration: 3000 });
      }
    });
  }
}
