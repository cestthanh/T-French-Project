import { Component, OnInit } from '@angular/core';
import { BlogService, BlogPost } from '../../blog.service';

@Component({
    selector: 'app-blog-list',
    template: `
<div class="blog-page">
  <div class="blog-hero">
    <div class="container">
      <h1>Blog & Kiến thức</h1>
      <p>Chia sẻ về tiếng Pháp, văn hoá Pháp và tư vấn du học</p>
    </div>
  </div>

  <div class="container blog-content">
    <!-- Filter by tag -->
    <div class="tag-filters" *ngIf="allTags.length">
      <button class="tag-btn" [class.active]="!activeTag" (click)="filterByTag(null)">Tất cả</button>
      <button class="tag-btn" [class.active]="activeTag === t" *ngFor="let t of allTags" (click)="filterByTag(t)">{{ t }}</button>
    </div>

    <div class="spinner-wrap" *ngIf="loading">
      <mat-spinner diameter="48"></mat-spinner>
    </div>

    <div class="posts-grid" *ngIf="!loading">
      <mat-card class="post-card" *ngFor="let post of posts" [routerLink]="['/blog', post.slug]">
        <div class="post-cover" [style.background-image]="'url(' + (post.coverImageUrl || '/assets/blog-placeholder.jpg') + ')'"></div>
        <mat-card-content>
          <div class="post-tags" *ngIf="post.tags">
            <span class="mini-tag" *ngFor="let t of getTags(post.tags)">{{ t }}</span>
          </div>
          <h3 class="post-title">{{ post.title }}</h3>
          <p class="post-summary">{{ post.summary }}</p>
          <div class="post-meta">
            <span><mat-icon>person</mat-icon> {{ post.author }}</span>
            <span><mat-icon>calendar_today</mat-icon> {{ post.publishedAt | date:'dd/MM/yyyy' }}</span>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="empty-state" *ngIf="posts.length === 0">
        <mat-icon>article</mat-icon>
        <p>Chưa có bài viết nào.</p>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination" *ngIf="totalPages > 1">
      <button mat-stroked-button [disabled]="page === 1" (click)="changePage(page - 1)">
        <mat-icon>chevron_left</mat-icon>
      </button>
      <span>Trang {{ page }} / {{ totalPages }}</span>
      <button mat-stroked-button [disabled]="page === totalPages" (click)="changePage(page + 1)">
        <mat-icon>chevron_right</mat-icon>
      </button>
    </div>
  </div>
</div>
  `,
    styles: [`
    .blog-hero { background: linear-gradient(135deg, #3949ab, #5c6bc0); color:#fff; padding:56px 0; text-align:center; }
    .blog-hero h1 { font-size:2.2rem; font-weight:800; margin-bottom:8px; }
    .blog-hero p  { opacity:.85; }
    .blog-content { padding: 40px 24px; }
    /* Tags */
    .tag-filters { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:32px; }
    .tag-btn { padding:6px 16px; border-radius:20px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:.85rem; transition:.15s; }
    .tag-btn.active, .tag-btn:hover { background:var(--primary); color:#fff; border-color:var(--primary); }
    /* Grid */
    .posts-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:24px; }
    .post-card { cursor:pointer; transition:transform .2s, box-shadow .2s; padding:0; overflow:hidden; border-radius:12px !important; }
    .post-card:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(57,73,171,.18) !important; }
    .post-cover { height:180px; background:linear-gradient(135deg,#e8eaf6,#c5cae9) center/cover; }
    mat-card-content { padding:16px !important; }
    .mini-tag { font-size:.7rem; background:#e8eaf6; color:var(--primary); padding:2px 8px; border-radius:10px; margin-right:4px; }
    .post-title { font-size:1rem; font-weight:700; margin:8px 0; line-height:1.4; color:var(--text); }
    .post-summary { font-size:.85rem; color:var(--text-muted); margin-bottom:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .post-meta { display:flex; gap:12px; font-size:.75rem; color:var(--text-muted); }
    .post-meta mat-icon { font-size:.9rem; width:.9rem; height:.9rem; vertical-align:middle; }
    /* Misc */
    .spinner-wrap { display:flex; justify-content:center; padding:60px; }
    .empty-state { grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted); }
    .empty-state mat-icon { font-size:3rem; width:3rem; height:3rem; }
    .pagination { display:flex; align-items:center; justify-content:center; gap:16px; margin-top:40px; }
  `]
})
export class BlogListComponent implements OnInit {
    posts: BlogPost[] = [];
    loading = true;
    page = 1;
    totalPages = 1;
    activeTag: string | null = null;
    allTags: string[] = [];

    constructor(private blogService: BlogService) { }

    ngOnInit() { this.load(); }

    load() {
        this.loading = true;
        this.blogService.getPosts(this.page, 9, this.activeTag ?? undefined).subscribe({
            next: res => {
                this.posts = res.posts;
                this.totalPages = Math.ceil(res.total / res.pageSize);
                // Extract unique tags
                const tags = new Set<string>();
                res.posts.forEach(p => this.getTags(p.tags ?? '').forEach(t => tags.add(t)));
                this.allTags = [...tags];
                this.loading = false;
            },
            error: () => { this.loading = false; }
        });
    }

    filterByTag(tag: string | null) { this.activeTag = tag; this.page = 1; this.load(); }
    changePage(p: number) { this.page = p; this.load(); }
    getTags(tags: string) { return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []; }
}
