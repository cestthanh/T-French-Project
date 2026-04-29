import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService, AdminStats, AdminUser, AdminBlogPost } from '../../admin.service';

@Component({
    selector: 'app-admin-page',
    template: `
<div class="admin-wrap">
  <div class="admin-header">
    <h2><mat-icon>admin_panel_settings</mat-icon> Admin Dashboard</h2>
    <p>Quản trị nền tảng T-French</p>
  </div>

  <!-- ── STATS ─────────────────────────────────────────────────────── -->
  <div class="stats-grid" *ngIf="stats">
    <div class="stat-card" *ngFor="let s of statCards">
      <div class="stat-icon" [style.background]="s.color"><mat-icon>{{ s.icon }}</mat-icon></div>
      <div class="stat-body">
        <div class="stat-val">{{ s.val }}</div>
        <div class="stat-lbl">{{ s.label }}</div>
      </div>
    </div>
  </div>
  <div class="spinner-wrap" *ngIf="!stats"><mat-spinner diameter="36"></mat-spinner></div>

  <!-- ── TABS ──────────────────────────────────────────────────────── -->
  <mat-tab-group animationDuration="200ms" class="admin-tabs">

    <!-- ── TAB 1: USER MANAGEMENT ─────────────────────────────────── -->
    <mat-tab label="👥 Người dùng">
      <div class="tab-content">
        <div class="tab-toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Tìm kiếm</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [(ngModel)]="userSearch" (ngModelChange)="loadUsers()" placeholder="Tên / email">
          </mat-form-field>
          <div class="role-btns">
            <button class="role-btn" [class.active]="userRole === ''" (click)="filterRole('')">Tất cả</button>
            <button class="role-btn" [class.active]="userRole === 'Student'" (click)="filterRole('Student')">Học viên</button>
            <button class="role-btn" [class.active]="userRole === 'Teacher'" (click)="filterRole('Teacher')">Giáo viên</button>
            <button class="role-btn" [class.active]="userRole === 'Admin'" (click)="filterRole('Admin')">Admin</button>
          </div>
        </div>

        <div class="users-table">
          <div class="table-row header-row">
            <span>Họ tên</span><span>Email</span><span>SĐT</span><span>Role</span><span>Thao tác</span>
          </div>
          <div class="table-row" *ngFor="let u of users">
            <span class="user-name">
              <div class="avatar">{{ u.fullName[0] }}</div>
              {{ u.fullName }}
            </span>
            <span class="email-cell">{{ u.email }}</span>
            <span>{{ u.phoneNumber || '—' }}</span>
            <span>
              <select class="role-select" [ngModel]="u.role" (ngModelChange)="onChangeRole(u, $event)">
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
                <option value="Admin">Admin</option>
              </select>
            </span>
            <span>
              <button mat-icon-button color="warn" (click)="onDeleteUser(u.id, u.fullName)" matTooltip="Xoá user">
                <mat-icon>delete</mat-icon>
              </button>
            </span>
          </div>
          <div class="empty-row" *ngIf="users.length === 0">Không tìm thấy người dùng</div>
        </div>
      </div>
    </mat-tab>

    <!-- ── TAB 2: BLOG MANAGEMENT ──────────────────────────────────── -->
    <mat-tab label="📝 Blog">
      <div class="tab-content">
        <!-- CREATE BLOG FORM -->
        <mat-card class="create-blog-card">
          <h3><mat-icon>edit_note</mat-icon> Viết bài mới</h3>
          <form [formGroup]="blogForm" (ngSubmit)="onCreateBlog()">
            <div class="form-row">
              <mat-form-field appearance="outline" style="flex:2">
                <mat-label>Tiêu đề</mat-label>
                <input matInput formControlName="title" (input)="autoSlug()">
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex:2">
                <mat-label>Slug (URL)</mat-label>
                <input matInput formControlName="slug">
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex:1">
                <mat-label>Tags (phân cách ,)</mat-label>
                <input matInput formControlName="tags">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="full-w">
              <mat-label>Tóm tắt</mat-label>
              <textarea matInput formControlName="summary" rows="2"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-w">
              <mat-label>Nội dung (hỗ trợ HTML)</mat-label>
              <textarea matInput formControlName="content" rows="8"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-w">
              <mat-label>URL ảnh bìa (tuỳ chọn)</mat-label>
              <input matInput formControlName="coverImageUrl">
            </mat-form-field>
            <div class="blog-form-footer">
              <label class="publish-toggle">
                <input type="checkbox" formControlName="isPublished">
                <span>Đăng ngay sau khi tạo</span>
              </label>
              <button mat-raised-button color="primary" type="submit" [disabled]="blogForm.invalid || blogSaving">
                {{ blogSaving ? 'Đang lưu...' : 'Tạo bài viết' }}
              </button>
            </div>
          </form>
        </mat-card>

        <!-- BLOG LIST -->
        <div class="blog-list-table">
          <div class="table-row header-row">
            <span>Tiêu đề</span><span>Tác giả</span><span>Tags</span><span>Trạng thái</span><span>Thao tác</span>
          </div>
          <div class="table-row" *ngFor="let p of blogPosts">
            <span class="blog-title">{{ p.title }}</span>
            <span>{{ p.author }}</span>
            <span class="tags-cell">
              <span class="mini-tag" *ngFor="let t of getTags(p.tags)">{{ t }}</span>
            </span>
            <span>
              <span class="status-chip published" *ngIf="p.isPublished">Đã đăng</span>
              <span class="status-chip draft" *ngIf="!p.isPublished">Nháp</span>
            </span>
            <span class="blog-actions">
              <button mat-stroked-button [color]="p.isPublished ? 'warn' : 'primary'"
                      (click)="onTogglePublish(p)" matTooltip="{{ p.isPublished ? 'Ẩn bài' : 'Đăng bài' }}">
                <mat-icon>{{ p.isPublished ? 'visibility_off' : 'publish' }}</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="onDeleteBlog(p.id)" matTooltip="Xoá bài">
                <mat-icon>delete</mat-icon>
              </button>
            </span>
          </div>
          <div class="empty-row" *ngIf="blogPosts.length === 0">Chưa có bài viết nào.</div>
        </div>
      </div>
    </mat-tab>

  </mat-tab-group>
</div>
  `,
    styles: [`
    .admin-wrap { padding:24px; }
    .admin-header { margin-bottom:24px; }
    .admin-header h2 { display:flex; align-items:center; gap:8px; font-size:1.5rem; font-weight:700; margin:0 0 4px; }
    .admin-header p  { color:var(--text-muted); margin:0; }
    /* Stats */
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:16px; margin-bottom:28px; }
    .stat-card { background:#fff; border-radius:12px; box-shadow:var(--shadow); display:flex; align-items:center; gap:12px; padding:16px; }
    .stat-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .stat-icon mat-icon { color:#fff; font-size:1.4rem; width:1.4rem; height:1.4rem; }
    .stat-val  { font-size:1.4rem; font-weight:800; line-height:1; }
    .stat-lbl  { font-size:.74rem; color:var(--text-muted); margin-top:2px; }
    /* Tabs */
    .admin-tabs { margin-top:8px; }
    .tab-content { padding:20px 0; }
    /* Toolbar */
    .tab-toolbar { display:flex; align-items:center; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
    .search-field { width:280px; margin-bottom:-1.25em; }
    .role-btns { display:flex; gap:6px; }
    .role-btn { padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:.82rem; transition:.15s; }
    .role-btn.active, .role-btn:hover { background:var(--primary); color:#fff; border-color:var(--primary); }
    /* Table */
    .users-table, .blog-list-table { border:1px solid var(--border); border-radius:8px; overflow:hidden; }
    .table-row { display:grid; padding:12px 16px; border-bottom:1px solid var(--border); align-items:center; gap:12px; }
    .users-table .table-row { grid-template-columns:2fr 2fr 1fr 1.2fr 80px; }
    .blog-list-table .table-row { grid-template-columns:2fr 1fr 1.5fr 1fr 120px; }
    .header-row { background:#f8f9ff; font-weight:700; font-size:.8rem; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted); }
    .table-row:last-child { border-bottom:none; }
    .user-name { display:flex; align-items:center; gap:8px; font-weight:600; }
    .avatar { width:30px; height:30px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:.85rem; font-weight:700; flex-shrink:0; }
    .email-cell { font-size:.85rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .role-select { border:1px solid var(--border); border-radius:6px; padding:4px 8px; font-size:.85rem; background:#fff; cursor:pointer; }
    .empty-row { padding:32px; text-align:center; color:var(--text-muted); }
    /* Blog table */
    .blog-title { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .mini-tag { font-size:.68rem; background:#e8eaf6; color:var(--primary); padding:2px 6px; border-radius:8px; margin-right:4px; }
    .status-chip { font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:10px; }
    .status-chip.published { background:#e8f5e9; color:#2e7d32; }
    .status-chip.draft     { background:#f5f5f5; color:#757575; }
    .blog-actions { display:flex; gap:4px; }
    /* Blog form */
    .create-blog-card { padding:24px; margin-bottom:20px; }
    .create-blog-card h3 { display:flex; align-items:center; gap:6px; font-weight:700; margin-bottom:16px; }
    .form-row { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start; margin-bottom:8px; }
    .full-w { width:100%; margin-bottom:8px; }
    .blog-form-footer { display:flex; align-items:center; justify-content:space-between; margin-top:8px; }
    .publish-toggle { display:flex; align-items:center; gap:8px; font-size:.9rem; cursor:pointer; }
    .publish-toggle input { width:16px; height:16px; cursor:pointer; }
    /* Misc */
    .spinner-wrap { display:flex; justify-content:center; padding:24px; }
  `]
})
export class AdminPageComponent implements OnInit {
    stats: AdminStats | null = null;
    users: AdminUser[] = [];
    blogPosts: AdminBlogPost[] = [];
    userSearch = '';
    userRole = '';
    blogSaving = false;
    blogForm: FormGroup;

    statCards: { icon: string; val: number; label: string; color: string }[] = [];

    constructor(
        private adminService: AdminService,
        private fb: FormBuilder,
        private snackBar: MatSnackBar
    ) {
        this.blogForm = this.fb.group({
            title: ['', Validators.required],
            slug: ['', Validators.required],
            summary: [''],
            content: ['', Validators.required],
            tags: [''],
            coverImageUrl: [''],
            isPublished: [false]
        });
    }

    ngOnInit() { this.loadStats(); this.loadUsers(); this.loadBlog(); }

    loadStats() {
        this.adminService.getStats().subscribe({
            next: s => {
                this.stats = s;
                this.statCards = [
                    { icon: 'people', val: s.totalUsers, label: 'Người dùng', color: 'linear-gradient(135deg,#3949ab,#5c6bc0)' },
                    { icon: 'school', val: s.totalStudents, label: 'Học viên', color: 'linear-gradient(135deg,#00695c,#26a69a)' },
                    { icon: 'person_pin', val: s.totalTeachers, label: 'Giáo viên', color: 'linear-gradient(135deg,#e65100,#ff7043)' },
                    { icon: 'assignment', val: s.totalAssignments, label: 'Bài tập', color: 'linear-gradient(135deg,#6a1b9a,#ab47bc)' },
                    { icon: 'grading', val: s.pendingGrading, label: 'Chờ chấm', color: 'linear-gradient(135deg,#c62828,#ef5350)' },
                    { icon: 'calendar_month', val: s.totalBookings, label: 'Lịch đã đặt', color: 'linear-gradient(135deg,#1565c0,#42a5f5)' },
                    { icon: 'article', val: s.publishedPosts, label: 'Bài blog', color: 'linear-gradient(135deg,#2e7d32,#66bb6a)' },
                ];
            }
        });
    }

    loadUsers() {
        this.adminService.getUsers(this.userRole || undefined, this.userSearch || undefined)
            .subscribe({ next: d => this.users = d, error: () => { } });
    }

    loadBlog() {
        this.adminService.getBlogPosts().subscribe({ next: d => this.blogPosts = d, error: () => { } });
    }

    filterRole(role: string) { this.userRole = role; this.loadUsers(); }

    onChangeRole(user: AdminUser, newRole: string) {
        this.adminService.changeRole(user.id, newRole).subscribe({
            next: () => { user.role = newRole; this.snackBar.open(`Đổi role thành ${newRole}!`, '✕', { duration: 2000 }); },
            error: () => this.snackBar.open('Lỗi khi đổi role.', '✕', { duration: 2000 })
        });
    }

    onDeleteUser(id: number, name: string) {
        if (!confirm(`Xoá tài khoản "${name}"? Hành động này không thể hoàn tác.`)) return;
        this.adminService.deleteUser(id).subscribe({ next: () => this.loadUsers() });
    }

    onTogglePublish(post: AdminBlogPost) {
        this.adminService.togglePublish(post.id).subscribe({
            next: res => { post.isPublished = res.isPublished; this.snackBar.open(res.isPublished ? 'Đã đăng bài!' : 'Đã ẩn bài.', '✕', { duration: 2000 }); }
        });
    }

    onDeleteBlog(id: number) {
        if (!confirm('Xoá bài viết này?')) return;
        this.adminService.deleteBlogPost(id).subscribe({ next: () => this.loadBlog() });
    }

    onCreateBlog() {
        if (this.blogForm.invalid) return;
        this.blogSaving = true;
        this.adminService.createBlogPost(this.blogForm.value).subscribe({
            next: () => {
                this.blogSaving = false;
                this.blogForm.reset({ isPublished: false });
                this.loadBlog();
                this.snackBar.open('Đã tạo bài viết!', '✕', { duration: 3000 });
            },
            error: () => { this.blogSaving = false; this.snackBar.open('Lỗi khi tạo bài.', '✕', { duration: 3000 }); }
        });
    }

    autoSlug() {
        const title = this.blogForm.value.title ?? '';
        const slug = title.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
            .trim().replace(/\s+/g, '-');
        this.blogForm.patchValue({ slug });
    }

    getTags(tags?: string) { return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []; }
}
