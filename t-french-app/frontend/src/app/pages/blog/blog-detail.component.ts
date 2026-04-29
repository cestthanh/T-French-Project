import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BlogService, BlogPost } from '../../blog.service';

@Component({
    selector: 'app-blog-detail',
    template: `
<div class="blog-detail-page">
  <div class="spinner-wrap" *ngIf="loading"><mat-spinner diameter="48"></mat-spinner></div>

  <ng-container *ngIf="!loading && post">
    <!-- Cover -->
    <div class="cover-banner" [style.background-image]="'url(' + (post.coverImageUrl || '') + ')'">
      <div class="cover-overlay">
        <div class="container">
          <div class="post-tags-top" *ngIf="post.tags">
            <span class="mini-tag" *ngFor="let t of getTags(post.tags)">{{ t }}</span>
          </div>
          <h1>{{ post.title }}</h1>
          <div class="post-meta-top">
            <mat-icon>person</mat-icon> {{ post.author }}
            <mat-icon style="margin-left:16px">calendar_today</mat-icon> {{ post.publishedAt | date:'dd/MM/yyyy' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="container post-body">
      <div class="back-btn">
        <button mat-stroked-button (click)="router.navigate(['/blog'])">
          <mat-icon>arrow_back</mat-icon> Quay lại blog
        </button>
      </div>
      <p class="post-summary" *ngIf="post.summary">{{ post.summary }}</p>
      <div class="post-content" [innerHTML]="post.content"></div>
    </div>
  </ng-container>

  <div class="error-state" *ngIf="!loading && !post">
    <mat-icon>article</mat-icon>
    <p>Không tìm thấy bài viết.</p>
    <button mat-raised-button color="primary" (click)="router.navigate(['/blog'])">Quay lại blog</button>
  </div>
</div>
  `,
    styles: [`
    .spinner-wrap   { display:flex; justify-content:center; padding:80px; }
    /* Cover */
    .cover-banner   { min-height:320px; background:#3949ab center/cover no-repeat; }
    .cover-overlay  { min-height:320px; background:linear-gradient(to bottom, rgba(30,40,100,.4), rgba(20,28,80,.85)); display:flex; align-items:flex-end; }
    .cover-overlay .container { padding-bottom:40px; color:#fff; }
    .mini-tag       { font-size:.75rem; background:rgba(255,255,255,.2); color:#fff; padding:2px 10px; border-radius:10px; margin-right:6px; }
    h1              { font-size:2rem; font-weight:800; margin:12px 0 8px; }
    .post-meta-top  { display:flex; align-items:center; gap:4px; opacity:.85; font-size:.9rem; }
    .post-meta-top mat-icon { font-size:1rem; width:1rem; height:1rem; }
    /* Body */
    .post-body      { max-width:780px; margin:0 auto; padding:40px 24px 80px; }
    .back-btn       { margin-bottom:24px; }
    .post-summary   { font-size:1.1rem; color:var(--text-muted); border-left:4px solid var(--primary); padding-left:16px; margin-bottom:32px; font-style:italic; }
    .post-content   { line-height:1.9; font-size:1rem; color:var(--text); }
    .post-content h2 { margin:32px 0 12px; font-size:1.4rem; }
    .post-content h3 { margin:24px 0 8px; font-size:1.15rem; }
    .post-content p  { margin-bottom:16px; }
    /* Error */
    .error-state    { text-align:center; padding:80px; color:var(--text-muted); }
    .error-state mat-icon { font-size:3rem; width:3rem; height:3rem; }
  `]
})
export class BlogDetailComponent implements OnInit {
    post: BlogPost | null = null;
    loading = true;

    constructor(
        private route: ActivatedRoute,
        public router: Router,
        private blogService: BlogService
    ) { }

    ngOnInit() {
        const slug = this.route.snapshot.paramMap.get('slug')!;
        this.blogService.getBySlug(slug).subscribe({
            next: p => { this.post = p; this.loading = false; },
            error: () => { this.post = null; this.loading = false; }
        });
    }

    getTags(tags: string) { return tags ? tags.split(',').map(t => t.trim()) : []; }
}
