import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssignmentService, Assignment } from '../../assignment.service';
import { AuthService } from '../../auth.service';

@Component({
    selector: 'app-assignments-list',
    template: `
<div class="page-wrap">
  <div class="page-top">
    <div>
      <h2 class="page-title">Bài tập</h2>
      <p class="page-subtitle" *ngIf="auth.isTeacher || auth.isAdmin">Quản lý bài tập theo khoá học</p>
      <p class="page-subtitle" *ngIf="!auth.isTeacher && !auth.isAdmin">Xem và nộp bài tập của bạn</p>
    </div>
    <button mat-raised-button color="primary" *ngIf="auth.isTeacher || auth.isAdmin" (click)="showCreate = !showCreate">
      <mat-icon>add</mat-icon> Tạo bài tập
    </button>
  </div>

  <!-- CREATE FORM (Teacher/Admin only) -->
  <mat-card class="create-card" *ngIf="showCreate && (auth.isTeacher || auth.isAdmin)">
    <h3>Tạo bài tập mới</h3>
    <form [formGroup]="createForm" (ngSubmit)="onCreate()">
      <mat-form-field appearance="outline" class="full-w">
        <mat-label>Tiêu đề</mat-label>
        <input matInput formControlName="title">
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-w">
        <mat-label>Mô tả / Yêu cầu</mat-label>
        <textarea matInput formControlName="description" rows="3"></textarea>
      </mat-form-field>
      <div class="form-row">
        <mat-form-field appearance="outline" class="half-w">
          <mat-label>Mã khoá học (Course ID)</mat-label>
          <input matInput type="number" formControlName="courseId">
        </mat-form-field>
        <mat-form-field appearance="outline" class="half-w">
          <mat-label>Hạn nộp</mat-label>
          <input matInput type="datetime-local" formControlName="dueDate">
        </mat-form-field>
      </div>
      <div class="form-actions">
        <button mat-stroked-button type="button" (click)="showCreate = false">Huỷ</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || saving">
          {{ saving ? 'Đang lưu...' : 'Tạo bài tập' }}
        </button>
      </div>
    </form>
  </mat-card>

  <!-- LOADING -->
  <div class="spinner-wrap" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

  <!-- ASSIGNMENT LIST -->
  <div class="assignments-grid" *ngIf="!loading">
    <mat-card class="assignment-card" *ngFor="let a of assignments" [class.overdue]="isOverdue(a.dueDate)">
      <div class="card-header">
        <div>
          <span class="course-tag">{{ a.course }}</span>
          <h3>{{ a.title }}</h3>
        </div>
        <div class="header-actions" *ngIf="auth.isTeacher || auth.isAdmin">
          <button mat-icon-button color="warn" (click)="onDelete(a.id)" matTooltip="Xoá bài tập">
            <mat-icon>delete</mat-icon>
          </button>
          <button mat-icon-button color="primary" [routerLink]="['/dashboard/assignments', a.id]" matTooltip="Xem bài nộp">
            <mat-icon>grading</mat-icon>
          </button>
        </div>
      </div>

      <p class="due-date" [class.overdue-text]="isOverdue(a.dueDate)">
        <mat-icon>schedule</mat-icon>
        Hạn nộp: {{ a.dueDate | date:'dd/MM/yyyy HH:mm' }}
        <span class="overdue-badge" *ngIf="isOverdue(a.dueDate)">Đã quá hạn</span>
      </p>

      <div class="card-footer">
        <span class="submission-count" *ngIf="auth.isTeacher || auth.isAdmin">
          <mat-icon>people</mat-icon> {{ a.submissionCount }} bài nộp
        </span>
        <button mat-raised-button color="accent" *ngIf="!auth.isTeacher && !auth.isAdmin"
                [routerLink]="['/dashboard/assignments', a.id]">
          Xem & Nộp bài
        </button>
      </div>
    </mat-card>

    <div class="empty-state" *ngIf="assignments.length === 0">
      <mat-icon>assignment</mat-icon>
      <p>Chưa có bài tập nào.</p>
    </div>
  </div>

  <!-- MY SUBMISSIONS (Student tab) -->
  <div *ngIf="!auth.isTeacher && !auth.isAdmin && submissions.length > 0">
    <h3 class="section-title">Bài đã nộp của bạn</h3>
    <div class="submissions-grid">
      <mat-card class="sub-card" *ngFor="let s of submissions">
        <div class="sub-header">
          <div>
            <span class="course-tag">{{ s.course }}</span>
            <h4>{{ s.assignment }}</h4>
          </div>
          <div class="grade-badge" [class.graded]="s.grade !== null && s.grade !== undefined">
            {{ s.grade !== null && s.grade !== undefined ? s.grade + '/10' : 'Chờ chấm' }}
          </div>
        </div>
        <p class="sub-meta"><mat-icon>send</mat-icon> Đã nộp: {{ s.submittedAt | date:'dd/MM/yyyy HH:mm' }}</p>
        <p class="feedback" *ngIf="s.feedback"><mat-icon>comment</mat-icon> {{ s.feedback }}</p>
      </mat-card>
    </div>
  </div>
</div>
  `,
    styles: [`
    .page-wrap { padding: 24px; }
    .page-top  { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .page-title { font-size:1.5rem; font-weight:700; margin:0 0 4px; }
    .page-subtitle { color:var(--text-muted); font-size:.9rem; margin:0; }
    /* Create form */
    .create-card { padding:24px; margin-bottom:24px; }
    .create-card h3 { margin-bottom:16px; font-weight:700; }
    .full-w  { width:100%; margin-bottom:8px; }
    .form-row { display:flex; gap:12px; }
    .half-w  { flex:1; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
    /* Grid */
    .assignments-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; margin-bottom:32px; }
    .assignment-card { padding:20px; border-left:4px solid var(--primary); }
    .assignment-card.overdue { border-left-color: #d32f2f; }
    .card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
    .course-tag { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--primary); display:block; margin-bottom:4px; }
    .card-header h3 { margin:0; font-size:1rem; font-weight:700; }
    .header-actions { display:flex; gap:4px; flex-shrink:0; }
    .due-date { display:flex; align-items:center; gap:6px; font-size:.85rem; color:var(--text-muted); margin-bottom:12px; }
    .due-date mat-icon { font-size:1rem; width:1rem; height:1rem; }
    .overdue-text { color:#d32f2f; }
    .overdue-badge { background:#ffebee; color:#d32f2f; font-size:.7rem; font-weight:700; padding:2px 8px; border-radius:10px; }
    .card-footer { display:flex; align-items:center; justify-content:space-between; }
    .submission-count { display:flex; align-items:center; gap:4px; font-size:.82rem; color:var(--text-muted); }
    .submission-count mat-icon { font-size:1rem; width:1rem; height:1rem; }
    /* Submissions */
    .section-title { font-size:1.1rem; font-weight:700; margin:16px 0 12px; }
    .submissions-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
    .sub-card { padding:16px; }
    .sub-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
    .sub-header h4 { margin:0; font-size:.9rem; font-weight:700; }
    .grade-badge { background:#e8eaf6; color:var(--primary); font-weight:700; font-size:.85rem; padding:4px 10px; border-radius:12px; white-space:nowrap; }
    .grade-badge.graded { background:#e8f5e9; color:#2e7d32; }
    .sub-meta { font-size:.78rem; color:var(--text-muted); display:flex; align-items:center; gap:4px; margin-bottom:6px; }
    .sub-meta mat-icon { font-size:.9rem; width:.9rem; height:.9rem; }
    .feedback { font-size:.82rem; color:var(--text-muted); display:flex; gap:4px; font-style:italic; }
    /* Misc */
    .spinner-wrap { display:flex; justify-content:center; padding:48px; }
    .empty-state { grid-column:1/-1; text-align:center; padding:48px; color:var(--text-muted); }
    .empty-state mat-icon { font-size:3rem; width:3rem; height:3rem; display:block; margin:0 auto 8px; }
  `]
})
export class AssignmentsListComponent implements OnInit {
    assignments: Assignment[] = [];
    submissions: any[] = [];
    loading = true;
    saving = false;
    showCreate = false;
    createForm: FormGroup;

    constructor(
        public auth: AuthService,
        private assignmentService: AssignmentService,
        private fb: FormBuilder,
        private snackBar: MatSnackBar,
        private router: Router
    ) {
        this.createForm = this.fb.group({
            title: ['', Validators.required],
            description: [''],
            courseId: [null, Validators.required],
            dueDate: ['', Validators.required]
        });
    }

    ngOnInit() {
        this.load();
        if (!this.auth.isTeacher && !this.auth.isAdmin) {
            this.loadSubmissions();
        }
    }

    load() {
        this.loading = true;
        this.assignmentService.getAll().subscribe({
            next: data => { this.assignments = data; this.loading = false; },
            error: () => this.loading = false
        });
    }

    loadSubmissions() {
        this.assignmentService.mySubmissions().subscribe({ next: d => this.submissions = d, error: () => { } });
    }

    onCreate() {
        if (this.createForm.invalid) return;
        this.saving = true;
        const dto = { ...this.createForm.value, dueDate: new Date(this.createForm.value.dueDate).toISOString() };
        this.assignmentService.create(dto).subscribe({
            next: () => { this.saving = false; this.showCreate = false; this.createForm.reset(); this.load(); this.snackBar.open('Đã tạo bài tập!', '✕', { duration: 3000 }); },
            error: () => { this.saving = false; this.snackBar.open('Lỗi khi tạo bài tập.', '✕', { duration: 3000 }); }
        });
    }

    onDelete(id: number) {
        if (!confirm('Xóa bài tập này?')) return;
        this.assignmentService.delete(id).subscribe({ next: () => this.load() });
    }

    isOverdue(dueDate: string) { return new Date(dueDate) < new Date(); }
}
