import { Component, OnInit } from '@angular/core';
import { CourseService, Course } from '../../course.service';

@Component({
  selector: 'app-course-list',
  template: `
<div class="courses-wrap">
  <!-- Navbar spacer is handled by the page itself -->
  <div class="courses-hero">
    <div class="hero-bg-shapes">
      <div class="shape s1"></div>
      <div class="shape s2"></div>
      <div class="shape s3"></div>
    </div>
    <div class="hero-content">
      <div class="hero-badge">📚 Học tiếng Pháp cùng chuyên gia</div>
      <h1>Khám phá khoá học <span>T-French</span></h1>
      <p>Từ cơ bản A1 đến nâng cao B2 — tất cả các cấp độ với giảng viên chuyên nghiệp.</p>
      <div class="hero-chips">
        <span class="chip">A1 — Cơ bản</span>
        <span class="chip">A2 — Sơ cấp</span>
        <span class="chip">B1 — Trung cấp</span>
        <span class="chip">B2 — Cao cấp</span>
        <span class="chip">DELF/DALF</span>
      </div>
    </div>
  </div>

  <div class="container">
    <!-- Search bar -->
    <div class="search-bar">
      <mat-icon>search</mat-icon>
      <input type="text" [(ngModel)]="search" placeholder="Tìm khoá học...">
      <span class="result-count" *ngIf="!loading">{{ filtered.length }} khoá học</span>
    </div>

    <!-- Skeleton -->
    <div class="courses-grid" *ngIf="loading">
      <div class="skeleton-card" *ngFor="let i of [1,2,3,4,5,6]">
        <div class="sk-img"></div>
        <div class="sk-body">
          <div class="sk-line long"></div>
          <div class="sk-line short"></div>
          <div class="sk-line medium"></div>
        </div>
      </div>
    </div>

    <!-- Course cards -->
    <div class="courses-grid" *ngIf="!loading">
      <a class="course-card" *ngFor="let c of filtered" [routerLink]="['/courses', c.id]">
        <!-- Thumbnail -->
        <div class="course-thumb"
             [class.has-image]="c.imageUrl"
             [style.background-image]="c.imageUrl ? 'url('+c.imageUrl+')' : ''">
          <div class="thumb-placeholder" *ngIf="!c.imageUrl">
            <div class="flag-mini">
              <div class="f-blue"></div>
              <div class="f-white"></div>
              <div class="f-red"></div>
            </div>
            <span>{{ c.level || 'FR' }}</span>
          </div>
          <div class="thumb-overlay" *ngIf="c.imageUrl"></div>
          <span class="level-badge" *ngIf="c.level">{{ c.level }}</span>
          <span class="free-badge" *ngIf="c.price === 0">Miễn phí</span>
        </div>

        <!-- Card body -->
        <div class="card-body">
          <h3>{{ c.title }}</h3>
          <p class="card-desc">{{ c.description }}</p>
          <div class="card-meta">
            <span class="meta-item"><mat-icon>person</mat-icon>{{ c.teacher }}</span>
            <span class="meta-item"><mat-icon>group</mat-icon>{{ c.enrollmentCount }} học viên</span>
          </div>
          <div class="card-footer">
            <span class="price" *ngIf="c.price > 0">{{ c.price | number:'1.0-0' }}đ</span>
            <span class="price free" *ngIf="c.price === 0">Miễn phí</span>
            <span class="cta">Xem chi tiết <mat-icon>arrow_forward</mat-icon></span>
          </div>
        </div>
      </a>
    </div>

    <!-- Empty -->
    <div class="empty-state" *ngIf="!loading && filtered.length === 0">
      <div class="empty-icon">🔍</div>
      <h3>Không tìm thấy khoá học</h3>
      <p>Thử thay đổi từ khoá tìm kiếm.</p>
    </div>
  </div>
</div>
  `,
  styles: [`
    .courses-wrap { min-height: 100vh; background: #f5f6fa; }

    /* ── Hero ── */
    .courses-hero {
      background: linear-gradient(135deg, #1a237e 0%, #3949ab 60%, #5c6bc0 100%);
      padding: 72px 24px 80px; text-align: center; position: relative; overflow: hidden;
    }
    .hero-bg-shapes { position: absolute; inset: 0; pointer-events: none; }
    .shape {
      position: absolute; border-radius: 50%;
      background: rgba(255,255,255,.06);
    }
    .s1 { width: 400px; height: 400px; top: -150px; right: -100px; }
    .s2 { width: 250px; height: 250px; bottom: -80px; left: -60px; }
    .s3 { width: 180px; height: 180px; top: 20px; left: 30%; }

    .hero-content { position: relative; z-index: 2; max-width: 660px; margin: 0 auto; color: #fff; }
    .hero-badge {
      display: inline-block; background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
      border-radius: 20px; padding: 6px 16px; font-size: .85rem; font-weight: 600;
      margin-bottom: 20px; backdrop-filter: blur(8px);
    }
    .hero-content h1 { font-size: 2.4rem; font-weight: 800; line-height: 1.2; margin-bottom: 14px; }
    .hero-content h1 span { color: #ffb300; }
    .hero-content p { font-size: 1rem; opacity: .85; margin-bottom: 28px; }
    .hero-chips { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .chip {
      background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
      border-radius: 20px; padding: 4px 14px; font-size: .78rem; font-weight: 600;
      backdrop-filter: blur(6px);
    }

    /* ── Container & Search ── */
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .search-bar {
      display: flex; align-items: center; gap: 12px;
      background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px;
      padding: 12px 20px; margin: -28px 0 32px; position: relative; z-index: 5;
      box-shadow: 0 8px 32px rgba(57,73,171,.1);
    }
    .search-bar mat-icon { color: #9e9e9e; }
    .search-bar input {
      flex: 1; border: none; outline: none; font-size: .95rem; font-family: inherit;
      background: transparent; color: #1a1a2e;
    }
    .result-count { font-size: .8rem; color: #9e9e9e; white-space: nowrap; }

    /* ── Grid ── */
    .courses-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px; padding-bottom: 48px;
    }

    /* ── Course Card ── */
    .course-card {
      background: #fff; border-radius: 16px; overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,.06); display: block;
      text-decoration: none; color: inherit;
      transition: transform .2s, box-shadow .2s;
      border: 1px solid #f0f0f0;
    }
    .course-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 36px rgba(57,73,171,.14);
      text-decoration: none; color: inherit;
    }

    /* Thumbnail */
    .course-thumb {
      height: 190px; position: relative; overflow: hidden;
      background: linear-gradient(135deg, #1a237e 0%, #3949ab 100%);
      display: flex; align-items: center; justify-content: center;
    }
    .course-thumb.has-image { background: #f5f5f5 center/cover no-repeat; }
    .thumb-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.4));
    }
    .thumb-placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .flag-mini {
      display: flex; width: 60px; height: 40px; border-radius: 6px; overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,.3);
    }
    .f-blue  { flex: 1; background: #002395; }
    .f-white { flex: 1; background: #fff; }
    .f-red   { flex: 1; background: #ED2939; }
    .thumb-placeholder span {
      color: rgba(255,255,255,.7); font-size: .9rem; font-weight: 700; letter-spacing: 1px;
    }
    .level-badge {
      position: absolute; top: 12px; left: 12px;
      background: rgba(255,255,255,.18); backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,.3);
      color: #fff; font-size: .72rem; font-weight: 700;
      padding: 4px 10px; border-radius: 8px;
    }
    .free-badge {
      position: absolute; top: 12px; right: 12px;
      background: #43a047; color: #fff;
      font-size: .7rem; font-weight: 700;
      padding: 3px 10px; border-radius: 8px;
    }

    /* Card body */
    .card-body { padding: 20px; }
    .card-body h3 {
      font-size: 1rem; font-weight: 700; margin: 0 0 8px;
      line-height: 1.35; color: #1a1a2e;
    }
    .card-desc {
      font-size: .83rem; color: #757575; margin: 0 0 14px;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .card-meta { display: flex; gap: 14px; font-size: .78rem; color: #9e9e9e; margin-bottom: 14px; }
    .meta-item { display: flex; align-items: center; gap: 4px; }
    .meta-item mat-icon { font-size: .9rem; width: .9rem; height: .9rem; }
    .card-footer { display: flex; align-items: center; justify-content: space-between; }
    .price { font-size: .95rem; font-weight: 700; color: #3949ab; }
    .price.free { color: #2e7d32; }
    .cta {
      display: flex; align-items: center; gap: 4px;
      font-size: .82rem; font-weight: 600; color: #3949ab;
      transition: gap .15s;
    }
    .cta mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .course-card:hover .cta { gap: 8px; }

    /* ── Skeleton ── */
    .skeleton-card { background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0; }
    .sk-img { height: 190px; background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    .sk-body { padding: 20px; }
    .sk-line { height: 12px; border-radius: 6px; background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; margin-bottom: 10px; }
    .sk-line.long   { width: 80%; }
    .sk-line.short  { width: 45%; }
    .sk-line.medium { width: 65%; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* ── Empty ── */
    .empty-state { text-align: center; padding: 80px 24px; }
    .empty-icon { font-size: 3.5rem; margin-bottom: 16px; }
    .empty-state h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
    .empty-state p { color: #9e9e9e; }
  `]
})
export class CourseListComponent implements OnInit {
  courses: Course[] = [];
  loading = true;
  search = '';

  get filtered(): Course[] {
    if (!this.search.trim()) return this.courses;
    const q = this.search.toLowerCase();
    return this.courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.teacher.toLowerCase().includes(q) ||
      c.level?.toLowerCase().includes(q)
    );
  }

  constructor(private courseService: CourseService) {}
  ngOnInit() {
    this.courseService.getAll().subscribe({
      next: c => { this.courses = c; this.loading = false; },
      error: () => this.loading = false
    });
  }
}
