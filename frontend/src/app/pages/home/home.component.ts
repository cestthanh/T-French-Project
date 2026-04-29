import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { BlogService, BlogPost } from '../../blog.service';

@Component({
  selector: 'app-home',
  template: `
<!-- ── NAVBAR ─────────────────────────────────────────────── -->
<app-navbar></app-navbar>

<!-- ── HERO ────────────────────────────────────────────────── -->
<section class="hero" id="home">
  <div class="hero-bg-circles">
    <span class="circle c1"></span><span class="circle c2"></span><span class="circle c3"></span>
  </div>
  <div class="container hero-inner">
    <div class="hero-text">
      <div class="hero-badge">🎓 Trung tâm tiếng Pháp hàng đầu</div>
      <h1>Học tiếng Pháp<br><span class="highlight">cùng chuyên gia</span></h1>
      <p>Nền tảng học tập hiện đại — bài tập, tài liệu, đặt lịch luyện nói với giáo viên. Tất cả trong một nơi.</p>
      <div class="hero-stats">
        <div class="stat"><strong>500+</strong><span>Học viên</span></div>
        <div class="stat"><strong>20+</strong><span>Giáo viên</span></div>
        <div class="stat"><strong>DELF/DALF</strong><span>Chứng chỉ</span></div>
      </div>
      <div class="hero-cta">
        <button mat-raised-button color="primary" class="cta-primary" routerLink="/auth/register">
          Bắt đầu miễn phí <mat-icon>arrow_forward</mat-icon>
        </button>
        <a class="cta-secondary" href="#courses">Xem khoá học <mat-icon>expand_more</mat-icon></a>
      </div>
    </div>
    <div class="hero-visual">
      <div class="hero-card card animate-float">
        <div class="card-row"><mat-icon>school</mat-icon><strong>Luyện nói với giáo viên</strong></div>
        <p>Đặt lịch 1-1 linh hoạt theo khung giờ của bạn</p>
        <div class="chip-row">
          <span class="chip">Giao tiếp</span><span class="chip">DELF B2</span><span class="chip">Du học Pháp</span>
        </div>
      </div>
      <div class="emoji-float">🇫🇷</div>
    </div>
  </div>
</section>

<!-- ── FEATURES ─────────────────────────────────────────────── -->
<section class="section features-section" id="features">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Tính năng</span>
      <h2>Tất cả những gì bạn cần để học tốt</h2>
    </div>
    <div class="features-grid">
      <div class="feature-item" *ngFor="let f of features">
        <div class="feature-icon" [style.background]="f.bg">
          <mat-icon>{{ f.icon }}</mat-icon>
        </div>
        <h3>{{ f.title }}</h3>
        <p>{{ f.desc }}</p>
      </div>
    </div>
  </div>
</section>

<!-- ── COURSES ──────────────────────────────────────────────── -->
<section class="section courses-section" id="courses">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Khoá học</span>
      <h2>Chương trình đào tạo</h2>
    </div>
    <div class="courses-grid">
      <div class="course-card card" *ngFor="let c of courses">
        <div class="course-level">{{ c.level }}</div>
        <h3>{{ c.name }}</h3>
        <p>{{ c.desc }}</p>
        <ul>
          <li *ngFor="let item of c.items"><mat-icon>check_circle</mat-icon>{{ item }}</li>
        </ul>
        <button mat-stroked-button color="primary" routerLink="/auth/register" class="course-btn">Đăng ký ngay</button>
      </div>
    </div>
  </div>
</section>

<!-- ── BLOG PREVIEW ──────────────────────────────────────────── -->
<section class="section blog-preview" *ngIf="latestPosts.length">
  <div class="container">
    <div class="section-header">
      <span class="section-label">Blog</span>
      <h2>Kiến thức & Tư vấn du học</h2>
      <a routerLink="/blog" class="view-all">Xem tất cả <mat-icon>arrow_forward</mat-icon></a>
    </div>
    <div class="blog-grid">
      <div class="blog-card card" *ngFor="let p of latestPosts" [routerLink]="['/blog', p.slug]">
        <div class="blog-cover" [style.background-image]="'url(' + (p.coverImageUrl || '') + ')'"></div>
        <div class="blog-body">
          <h4>{{ p.title }}</h4>
          <p>{{ p.summary }}</p>
          <span class="blog-meta">{{ p.publishedAt | date:'dd/MM/yyyy' }}</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ── CONTACT ────────────────────────────────────────────────── -->
<section class="section contact-section" id="contact">
  <div class="container">
    <div class="contact-layout">
      <div class="contact-info">
        <span class="section-label">Liên hệ</span>
        <h2>Đăng ký tư vấn miễn phí</h2>
        <p>Chuyên gia của chúng tôi sẽ tư vấn lộ trình học và du học phù hợp nhất cho bạn.</p>
        <div class="contact-details">
          <div><mat-icon>location_on</mat-icon><span>Hà Nội, Việt Nam</span></div>
          <div><mat-icon>email</mat-icon><span>contact&#64;tfrench.vn</span></div>
          <div><mat-icon>phone</mat-icon><span>0912 345 678</span></div>
        </div>
      </div>
      <form class="contact-form card" [formGroup]="contactForm" (ngSubmit)="submitContact()">
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Họ và tên</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Nội dung cần tư vấn</mat-label>
          <textarea matInput formControlName="message" rows="4"></textarea>
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit" class="full-w" [disabled]="contactForm.invalid || contactSent">
          {{ contactSent ? '✅ Đã gửi!' : 'Gửi yêu cầu tư vấn' }}
        </button>
      </form>
    </div>
  </div>
</section>

<!-- ── FOOTER ─────────────────────────────────────────────────── -->
<footer class="site-footer">
  <div class="container footer-inner">
    <div class="footer-brand">🇫🇷 <strong>T-French</strong><p>Nền tảng học tiếng Pháp & tư vấn du học</p></div>
    <div class="footer-links">
      <a routerLink="/">Trang chủ</a>
      <a routerLink="/blog">Blog</a>
      <a routerLink="/auth/login">Đăng nhập</a>
      <a routerLink="/auth/register">Đăng ký</a>
    </div>
    <p class="footer-copy">© 2024 T-French. All rights reserved.</p>
  </div>
</footer>
  `,
  styles: [`
    /* ── HERO ──────────────────────────────────────────────── */
    .hero {
      position: relative; overflow: hidden;
      background: linear-gradient(135deg, #1a237e 0%, #3949ab 55%, #5c6bc0 100%);
      color: #fff; padding: 100px 0 80px;
    }
    .hero-bg-circles { position:absolute; inset:0; pointer-events:none; }
    .circle { position:absolute; border-radius:50%; opacity:.08; background:#fff; }
    .c1 { width:400px; height:400px; right:-100px; top:-80px; }
    .c2 { width:200px; height:200px; left:10%; bottom:-50px; }
    .c3 { width:120px; height:120px; right:30%; top:20%; }
    .hero-inner { display:flex; align-items:center; gap:60px; position:relative; }
    .hero-text { flex:1; }
    .hero-badge {
      display:inline-block; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.2);
      border-radius:20px; padding:5px 16px; font-size:.85rem; margin-bottom:20px; backdrop-filter:blur(4px);
    }
    .hero-text h1 { font-size:3rem; font-weight:900; line-height:1.15; margin-bottom:16px; }
    .highlight { color: #ffb300; display:block; }
    .hero-text p { font-size:1.1rem; opacity:.88; margin-bottom:28px; max-width:480px; line-height:1.7; }
    .hero-stats { display:flex; gap:32px; margin-bottom:32px; }
    .stat strong { display:block; font-size:1.5rem; font-weight:800; }
    .stat span   { font-size:.8rem; opacity:.75; }
    .hero-cta    { display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
    .cta-primary { height:48px; font-size:1rem; font-weight:700; border-radius:24px !important; padding: 0 24px !important; }
    .cta-primary mat-icon { margin-left:4px; }
    .cta-secondary { display:flex; align-items:center; gap:4px; color:#fff; opacity:.85; font-weight:600; text-decoration:none; transition:.15s; }
    .cta-secondary:hover { opacity:1; }
    /* Hero card */
    .hero-visual { flex-shrink:0; position:relative; }
    .hero-card { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); backdrop-filter:blur(12px); color:#fff; max-width:280px; }
    .card-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; font-weight:700; }
    .hero-card p { opacity:.85; font-size:.85rem; margin-bottom:12px; }
    .chip-row { display:flex; gap:6px; flex-wrap:wrap; }
    .chip { font-size:.75rem; background:rgba(255,255,255,.15); border-radius:12px; padding:3px 10px; }
    .emoji-float { font-size:5rem; position:absolute; bottom:-20px; right:-20px; }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    .animate-float { animation: float 3s ease-in-out infinite; }

    /* ── SECTIONS ─────────────────────────────────────────── */
    .section { padding: 80px 0; }
    .section-header { text-align:center; margin-bottom:48px; }
    .section-label { font-size:.8rem; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--primary); }
    .section-header h2 { font-size:2rem; font-weight:800; margin-top:8px; }
    .view-all { display:inline-flex; align-items:center; gap:4px; font-weight:600; color:var(--primary); margin-top:8px; }

    /* ── FEATURES ─────────────────────────────────────────── */
    .features-section { background: #f8f9ff; }
    .features-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:28px; }
    .feature-item { text-align:center; }
    .feature-icon { width:64px; height:64px; border-radius:16px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
    .feature-icon mat-icon { font-size:1.8rem; width:1.8rem; height:1.8rem; color:#fff; }
    .feature-item h3 { font-weight:700; margin-bottom:8px; }
    .feature-item p  { color:var(--text-muted); font-size:.9rem; }

    /* ── COURSES ──────────────────────────────────────────── */
    .courses-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:24px; }
    .course-card { padding:28px; }
    .course-level { font-size:.75rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--primary); margin-bottom:8px; }
    .course-card h3 { font-size:1.2rem; font-weight:700; margin-bottom:8px; }
    .course-card p  { color:var(--text-muted); font-size:.9rem; margin-bottom:16px; }
    .course-card ul { list-style:none; margin-bottom:20px; }
    .course-card li { display:flex; align-items:center; gap:6px; font-size:.85rem; margin-bottom:6px; }
    .course-card mat-icon { font-size:1rem; width:1rem; height:1rem; color:#43a047; }
    .course-btn { width:100%; border-radius:8px !important; }

    /* ── BLOG PREVIEW ─────────────────────────────────────── */
    .blog-preview { background:#f8f9ff; }
    .blog-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:24px; }
    .blog-card { padding:0; overflow:hidden; cursor:pointer; transition:transform .2s; }
    .blog-card:hover { transform:translateY(-4px); }
    .blog-cover { height:160px; background:linear-gradient(135deg,#e8eaf6,#c5cae9) center/cover; }
    .blog-body   { padding:16px; }
    .blog-body h4 { font-weight:700; margin-bottom:6px; }
    .blog-body p  { font-size:.85rem; color:var(--text-muted); margin-bottom:8px; -webkit-line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden; }
    .blog-meta { font-size:.75rem; color:var(--text-muted); }

    /* ── CONTACT ──────────────────────────────────────────── */
    .contact-section { background: linear-gradient(135deg, #f3f4ff 0%, #fff 100%); }
    .contact-layout  { display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:start; }
    .contact-info h2 { font-size:1.8rem; font-weight:800; margin:12px 0 16px; }
    .contact-info p  { color:var(--text-muted); line-height:1.7; margin-bottom:24px; }
    .contact-details div { display:flex; align-items:center; gap:10px; margin-bottom:12px; color:var(--text-muted); }
    .contact-details mat-icon { color:var(--primary); }
    .contact-form { padding:32px; }
    .full-w { width:100%; margin-bottom:4px; }

    /* ── FOOTER ───────────────────────────────────────────── */
    .site-footer { background:#1a237e; color:rgba(255,255,255,.85); padding:40px 0 24px; }
    .footer-inner { display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; }
    .footer-brand strong { font-size:1.2rem; }
    .footer-brand p { font-size:.85rem; opacity:.7; margin:4px 0 0; }
    .footer-links { display:flex; gap:20px; }
    .footer-links a { color:rgba(255,255,255,.75); text-decoration:none; font-size:.9rem; transition:.15s; }
    .footer-links a:hover { color:#fff; }
    .footer-copy { font-size:.8rem; opacity:.5; }

    /* Responsive */
    @media (max-width: 768px) {
      .hero-inner { flex-direction:column; text-align:center; }
      .hero-text h1 { font-size:2rem; }
      .hero-stats { justify-content:center; }
      .hero-cta   { justify-content:center; }
      .hero-visual { display:none; }
      .contact-layout { grid-template-columns:1fr; gap:32px; }
    }
  `]
})
export class HomeComponent implements OnInit {
  latestPosts: BlogPost[] = [];
  contactSent = false;
  contactForm: FormGroup;

  features = [
    { icon: 'menu_book', title: 'Tài liệu bảo mật', desc: 'Kho PDF & video độc quyền cho học viên đã đăng ký khoá học', bg: 'linear-gradient(135deg,#3949ab,#5c6bc0)' },
    { icon: 'assignment', title: 'Bài tập & Chấm điểm', desc: 'Nộp bài trực tuyến, nhận phản hồi chi tiết từ giáo viên', bg: 'linear-gradient(135deg,#e65100,#ff7043)' },
    { icon: 'calendar_month', title: 'Đặt lịch luyện nói', desc: 'Book buổi Speaking 1-1 với giáo viên theo khung giờ trống', bg: 'linear-gradient(135deg,#00695c,#26a69a)' },
    { icon: 'travel_explore', title: 'Tư vấn du học Pháp', desc: 'Thông tin visa, học bổng, trường đại học Pháp cập nhật', bg: 'linear-gradient(135deg,#6a1b9a,#ab47bc)' },
  ];

  courses = [
    {
      level: 'A1 — A2',
      name: 'Tiếng Pháp Cơ Bản',
      desc: 'Dành cho người mới bắt đầu hoàn toàn',
      items: ['Bảng chữ cái & phát âm', 'Hội thoại hàng ngày', 'Ngữ pháp nền tảng']
    },
    {
      level: 'B1 — B2',
      name: 'Tiếng Pháp Trung Cấp',
      desc: 'Giao tiếp tự tin, luyện thi DELF',
      items: ['Nghe – Nói – Đọc – Viết', 'Luyện thi DELF B1/B2', 'Văn hoá & Xã hội Pháp']
    },
    {
      level: 'C1 — Du học',
      name: 'Tiếng Pháp Nâng Cao',
      desc: 'Chuẩn bị hồ sơ & phỏng vấn du học',
      items: ['Luyện thi DALF C1', 'Viết luận học thuật', 'Hỗ trợ hồ sơ du học']
    },
  ];

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private router: Router,
    private blogService: BlogService
  ) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.blogService.getPosts(1, 3).subscribe({
      next: res => { this.latestPosts = res.posts; },
      error: () => { }
    });
  }

  submitContact() {
    if (this.contactForm.invalid) return;
    // TODO: wire to backend contact endpoint
    this.contactSent = true;
    this.contactForm.reset();
  }
}
