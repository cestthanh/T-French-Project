import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ResourceService, Resource } from '../../resource.service';
import { AuthService } from '../../auth.service';

@Component({
    selector: 'app-resources-list',
    template: `
<div class="page-wrap">
  <div class="page-top">
    <div>
      <h2 class="page-title">Tài liệu học tập</h2>
      <p class="page-subtitle">Kho tài liệu PDF, video và học liệu bổ sung</p>
    </div>
    <button mat-raised-button color="primary" *ngIf="auth.isTeacher || auth.isAdmin" (click)="showCreate = !showCreate">
      <mat-icon>add</mat-icon> Thêm tài liệu
    </button>
  </div>

  <!-- ADD RESOURCE FORM -->
  <mat-card class="create-card" *ngIf="showCreate && (auth.isTeacher || auth.isAdmin)">
    <h3>Thêm tài liệu mới</h3>
    <form [formGroup]="createForm" (ngSubmit)="onCreate()">
      <div class="form-row">
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Tiêu đề</mat-label>
          <input matInput formControlName="title">
        </mat-form-field>
        <mat-form-field appearance="outline" class="half-w">
          <mat-label>Danh mục</mat-label>
          <input matInput formControlName="category" placeholder="Ngữ pháp, Từ vựng...">
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline" class="full-w">
        <mat-label>Mô tả (tuỳ chọn)</mat-label>
        <textarea matInput formControlName="description" rows="2"></textarea>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-w">
        <mat-label>URL tài liệu (Google Drive, YouTube, PDF...)</mat-label>
        <input matInput formControlName="fileUrl">
        <mat-icon matSuffix>link</mat-icon>
      </mat-form-field>
      <div class="form-row checkbox-row">
        <label>
          <input type="checkbox" formControlName="isPublic"> Công khai (tất cả học viên đều thấy)
        </label>
      </div>
      <div class="form-actions">
        <button mat-stroked-button type="button" (click)="showCreate = false">Huỷ</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || saving">
          {{ saving ? 'Đang lưu...' : 'Thêm tài liệu' }}
        </button>
      </div>
    </form>
  </mat-card>

  <!-- FILTER TABS -->
  <div class="category-tabs" *ngIf="categories.length">
    <button class="cat-btn" [class.active]="!activeCategory" (click)="filterCategory(null)">Tất cả</button>
    <button class="cat-btn" [class.active]="activeCategory === c" *ngFor="let c of categories" (click)="filterCategory(c)">{{ c }}</button>
  </div>

  <!-- LOADING -->
  <div class="spinner-wrap" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

  <!-- RESOURCES GRID -->
  <div class="resources-grid" *ngIf="!loading">
    <mat-card class="resource-card" *ngFor="let r of filtered">
      <div class="resource-icon" [style.background]="getIconBg(r.fileUrl)">
        <mat-icon>{{ getIcon(r.fileUrl) }}</mat-icon>
      </div>
      <div class="resource-body">
        <div class="resource-top">
          <div>
            <span class="category-tag" *ngIf="r.category">{{ r.category }}</span>
            <span class="public-tag" *ngIf="r.isPublic">Công khai</span>
            <h3>{{ r.title }}</h3>
            <p class="desc" *ngIf="r.description">{{ r.description }}</p>
          </div>
          <button mat-icon-button color="warn" *ngIf="auth.isTeacher || auth.isAdmin"
                  (click)="onDelete(r.id)" matTooltip="Xoá">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
        <div class="resource-footer">
          <span class="meta"><mat-icon>person</mat-icon>{{ r.uploadedBy }}</span>
          <span class="meta"><mat-icon>calendar_today</mat-icon>{{ r.createdAt | date:'dd/MM/yy' }}</span>
          <a [href]="r.fileUrl" target="_blank" mat-raised-button color="primary" class="open-btn">
            <mat-icon>open_in_new</mat-icon> Mở
          </a>
        </div>
      </div>
    </mat-card>

    <div class="empty-state" *ngIf="filtered.length === 0">
      <mat-icon>folder_open</mat-icon>
      <p>Chưa có tài liệu nào trong danh mục này.</p>
    </div>
  </div>
</div>
  `,
    styles: [`
    .page-wrap { padding:24px; }
    .page-top  { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .page-title { font-size:1.5rem; font-weight:700; margin:0 0 4px; }
    .page-subtitle { color:var(--text-muted); font-size:.9rem; margin:0; }
    /* Create form */
    .create-card { padding:24px; margin-bottom:24px; }
    .create-card h3 { margin-bottom:16px; font-weight:700; }
    .full-w  { width:100%; margin-bottom:0; }
    .half-w  { width:200px; margin-bottom:0; }
    .form-row { display:flex; gap:12px; align-items:flex-start; margin-bottom:8px; }
    .checkbox-row { margin:4px 0 8px; font-size:.9rem; }
    .checkbox-row input { margin-right:8px; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; }
    /* Category tabs */
    .category-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
    .cat-btn { padding:6px 16px; border-radius:20px; border:1px solid var(--border); background:#fff; cursor:pointer; font-size:.85rem; transition:.15s; }
    .cat-btn.active, .cat-btn:hover { background:var(--primary); color:#fff; border-color:var(--primary); }
    /* Grid */
    .resources-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; }
    .resource-card { padding:0; overflow:hidden; display:flex; align-items:stretch; }
    .resource-icon { width:64px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .resource-icon mat-icon { font-size:1.8rem; width:1.8rem; height:1.8rem; color:#fff; }
    .resource-body { flex:1; padding:16px; }
    .resource-top  { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
    .category-tag { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--primary); background:#e8eaf6; padding:2px 8px; border-radius:8px; margin-right:6px; }
    .public-tag   { font-size:.68rem; font-weight:700; color:#43a047; background:#e8f5e9; padding:2px 8px; border-radius:8px; margin-right:6px; }
    .resource-body h3 { font-size:.95rem; font-weight:700; margin:6px 0 2px; }
    .desc { font-size:.82rem; color:var(--text-muted); }
    .resource-footer { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .meta { display:flex; align-items:center; gap:3px; font-size:.75rem; color:var(--text-muted); }
    .meta mat-icon { font-size:.85rem; width:.85rem; height:.85rem; }
    .open-btn { margin-left:auto; font-size:.8rem; height:32px; padding:0 12px !important; min-width:0 !important; }
    /* Misc */
    .spinner-wrap { display:flex; justify-content:center; padding:48px; }
    .empty-state  { grid-column:1/-1; text-align:center; padding:48px; color:var(--text-muted); }
    .empty-state mat-icon { font-size:3rem; width:3rem; height:3rem; display:block; margin:0 auto 8px; }
  `]
})
export class ResourcesListComponent implements OnInit {
    resources: Resource[] = [];
    filtered: Resource[] = [];
    categories: string[] = [];
    activeCategory: string | null = null;
    loading = true;
    saving = false;
    showCreate = false;
    createForm: FormGroup;

    constructor(
        public auth: AuthService,
        private resourceService: ResourceService,
        private fb: FormBuilder,
        private snackBar: MatSnackBar
    ) {
        this.createForm = this.fb.group({
            title: ['', Validators.required],
            description: [''],
            fileUrl: ['', Validators.required],
            category: [''],
            isPublic: [false],
        });
    }

    ngOnInit() { this.load(); }

    load() {
        this.loading = true;
        this.resourceService.getAll().subscribe({
            next: data => {
                this.resources = data;
                this.filtered = data;
                this.categories = [...new Set(data.map(r => r.category).filter(Boolean) as string[])];
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    filterCategory(cat: string | null) {
        this.activeCategory = cat;
        this.filtered = cat ? this.resources.filter(r => r.category === cat) : this.resources;
    }

    onCreate() {
        if (this.createForm.invalid) return;
        this.saving = true;
        this.resourceService.create(this.createForm.value).subscribe({
            next: () => {
                this.saving = false; this.showCreate = false;
                this.createForm.reset({ isPublic: false });
                this.load();
                this.snackBar.open('Đã thêm tài liệu!', '✕', { duration: 3000 });
            },
            error: () => { this.saving = false; this.snackBar.open('Lỗi khi thêm tài liệu.', '✕', { duration: 3000 }); }
        });
    }

    onDelete(id: number) {
        if (!confirm('Xoá tài liệu này?')) return;
        this.resourceService.delete(id).subscribe({ next: () => this.load() });
    }

    getIcon(url: string): string {
        if (!url) return 'attach_file';
        if (url.includes('youtube') || url.includes('youtu.be')) return 'play_circle';
        if (url.includes('.pdf')) return 'picture_as_pdf';
        if (url.includes('drive.google') || url.includes('docs.google')) return 'folder';
        return 'link';
    }

    getIconBg(url: string): string {
        if (!url) return '#757575';
        if (url.includes('youtube') || url.includes('youtu.be')) return 'linear-gradient(135deg,#e53935,#ef5350)';
        if (url.includes('.pdf')) return 'linear-gradient(135deg,#e65100,#ff7043)';
        if (url.includes('drive.google') || url.includes('docs.google')) return 'linear-gradient(135deg,#1565c0,#1976d2)';
        return 'linear-gradient(135deg,#3949ab,#5c6bc0)';
    }
}
