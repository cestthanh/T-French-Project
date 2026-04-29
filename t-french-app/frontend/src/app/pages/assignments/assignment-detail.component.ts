import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssignmentService } from '../../assignment.service';
import { AuthService } from '../../auth.service';

@Component({
    selector: 'app-assignment-detail',
    template: `
<div class="page-wrap">
  <button mat-stroked-button routerLink="/dashboard/assignments" class="back-btn">
    <mat-icon>arrow_back</mat-icon> Quay lại
  </button>

  <div class="spinner-wrap" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

  <ng-container *ngIf="!loading && assignment">
    <!-- Assignment info -->
    <div class="assignment-header card">
      <h2>{{ assignment.title }}</h2>
      <div class="meta-row">
        <span><mat-icon>school</mat-icon> {{ assignment.course?.title }}</span>
        <span [class.overdue]="isOverdue(assignment.dueDate)">
          <mat-icon>schedule</mat-icon> Hạn: {{ assignment.dueDate | date:'dd/MM/yyyy HH:mm' }}
          <span class="overdue-badge" *ngIf="isOverdue(assignment.dueDate)">Quá hạn</span>
        </span>
      </div>
      <p class="desc" *ngIf="assignment.description">{{ assignment.description }}</p>
    </div>

    <!-- ── STUDENT: submit form ── -->
    <div *ngIf="!auth.isTeacher && !auth.isAdmin">
      <mat-card class="submit-card" *ngIf="!mySubmission">
        <h3>Nộp bài</h3>
        <form [formGroup]="submitForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-w">
            <mat-label>Ghi chú / Link tài liệu (tuỳ chọn)</mat-label>
            <textarea matInput formControlName="note" rows="3" placeholder="Nhập link Google Drive, note..."></textarea>
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="saving">
            {{ saving ? 'Đang nộp...' : 'Nộp bài' }}
          </button>
        </form>
      </mat-card>

      <mat-card class="submitted-card" *ngIf="mySubmission">
        <div class="submitted-header">
          <mat-icon class="check-icon">check_circle</mat-icon>
          <div>
            <h3>Đã nộp bài</h3>
            <p>{{ mySubmission.submittedAt | date:'dd/MM/yyyy HH:mm' }}</p>
          </div>
          <div class="grade-pill" [class.graded]="mySubmission.grade != null">
            {{ mySubmission.grade != null ? mySubmission.grade + '/10' : 'Chờ chấm' }}
          </div>
        </div>
        <p class="feedback" *ngIf="mySubmission.feedback">
          <mat-icon>comment</mat-icon> <strong>Nhận xét:</strong> {{ mySubmission.feedback }}
        </p>
      </mat-card>
    </div>

    <!-- ── TEACHER/ADMIN: submissions to grade ── -->
    <div *ngIf="auth.isTeacher || auth.isAdmin">
      <h3 class="section-title">Danh sách bài nộp ({{ assignment.submissions?.length || 0 }})</h3>

      <div class="empty-state" *ngIf="!assignment.submissions?.length">
        <mat-icon>inbox</mat-icon><p>Chưa có học viên nào nộp bài.</p>
      </div>

      <mat-card class="sub-card" *ngFor="let s of assignment.submissions">
        <div class="sub-row">
          <div class="student-info">
            <mat-icon>person</mat-icon>
            <div>
              <strong>{{ s.student?.fullName }}</strong>
              <span>{{ s.submittedAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>
          <div class="grade-pill" [class.graded]="s.grade != null">
            {{ s.grade != null ? s.grade + '/10' : 'Chưa chấm' }}
          </div>
        </div>

        <p class="note" *ngIf="s.note"><mat-icon>link</mat-icon> {{ s.note }}</p>

        <!-- Inline grading form -->
        <div class="grade-form" *ngIf="gradingId === s.id">
          <mat-form-field appearance="outline" style="width:100px;margin-right:8px">
            <mat-label>Điểm (0-10)</mat-label>
            <input matInput type="number" min="0" max="10" [(ngModel)]="gradeValue">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Nhận xét</mat-label>
            <input matInput [(ngModel)]="feedbackValue">
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="submitGrade(s.id)" style="margin-left:8px">Lưu</button>
          <button mat-stroked-button (click)="gradingId = null" style="margin-left:4px">Huỷ</button>
        </div>
        <button mat-stroked-button color="primary" *ngIf="gradingId !== s.id" (click)="startGrade(s)">
          <mat-icon>grading</mat-icon> {{ s.grade != null ? 'Chấm lại' : 'Chấm điểm' }}
        </button>
      </mat-card>
    </div>
  </ng-container>
</div>
  `,
    styles: [`
    .page-wrap { padding:24px; }
    .back-btn  { margin-bottom:20px; }
    .spinner-wrap { display:flex; justify-content:center; padding:48px; }
    /* Header */
    .assignment-header { margin-bottom:24px; }
    .assignment-header h2 { font-size:1.4rem; font-weight:700; margin-bottom:12px; }
    .meta-row  { display:flex; gap:24px; flex-wrap:wrap; margin-bottom:12px; }
    .meta-row span { display:flex; align-items:center; gap:4px; font-size:.85rem; color:var(--text-muted); }
    .meta-row mat-icon { font-size:1rem; width:1rem; height:1rem; }
    .overdue   { color:#d32f2f !important; }
    .overdue-badge { background:#ffebee; color:#d32f2f; font-size:.7rem; padding:2px 8px; border-radius:10px; margin-left:4px; }
    .desc { color:var(--text-muted); line-height:1.6; }
    /* Submit */
    .submit-card, .submitted-card { padding:24px; margin-bottom:16px; }
    .submit-card h3, .section-title { font-size:1rem; font-weight:700; margin-bottom:16px; }
    .full-w { width:100%; margin-bottom:8px; }
    .submitted-header { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
    .submitted-header h3 { margin:0; }
    .submitted-header p  { margin:0; font-size:.8rem; color:var(--text-muted); }
    .check-icon { color:#43a047; font-size:2rem; width:2rem; height:2rem; }
    .grade-pill { padding:4px 12px; border-radius:12px; font-weight:700; font-size:.85rem; background:#e8eaf6; color:var(--primary); margin-left:auto; white-space:nowrap; }
    .grade-pill.graded { background:#e8f5e9; color:#2e7d32; }
    .feedback { font-size:.85rem; color:var(--text-muted); display:flex; gap:4px; font-style:italic; }
    /* Submissions */
    .sub-card { padding:16px; margin-bottom:12px; }
    .sub-row   { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .student-info { display:flex; align-items:center; gap:8px; }
    .student-info mat-icon { color:var(--primary); }
    .student-info strong { display:block; font-size:.9rem; }
    .student-info span   { font-size:.78rem; color:var(--text-muted); }
    .note { font-size:.82rem; color:var(--text-muted); display:flex; align-items:center; gap:4px; margin-bottom:8px; word-break:break-all; }
    .grade-form { display:flex; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
    .empty-state { text-align:center; padding:40px; color:var(--text-muted); }
    .empty-state mat-icon { font-size:2.5rem; width:2.5rem; height:2.5rem; display:block; margin:0 auto 8px; }
  `]
})
export class AssignmentDetailComponent implements OnInit {
    assignment: any = null;
    mySubmission: any = null;
    loading = true;
    saving = false;
    gradingId: number | null = null;
    gradeValue: number = 0;
    feedbackValue: string = '';
    submitForm: FormGroup;

    constructor(
        private route: ActivatedRoute,
        public auth: AuthService,
        private assignmentService: AssignmentService,
        private fb: FormBuilder,
        private snackBar: MatSnackBar
    ) {
        this.submitForm = this.fb.group({ note: [''] });
    }

    ngOnInit() {
        const id = +this.route.snapshot.paramMap.get('id')!;
        this.assignmentService.getById(id).subscribe({
            next: data => {
                this.assignment = data;
                this.loading = false;
                if (!this.auth.isTeacher && !this.auth.isAdmin) {
                    this.mySubmission = data.submissions?.find((s: any) => s.studentId === this.auth.currentUser?.id) ?? null;
                }
            },
            error: () => this.loading = false
        });
    }

    onSubmit() {
        if (this.saving) return;
        this.saving = true;
        this.assignmentService.submit(this.assignment.id, this.submitForm.value.note).subscribe({
            next: s => { this.mySubmission = s; this.saving = false; this.snackBar.open('Nộp bài thành công!', '✕', { duration: 3000 }); },
            error: err => { this.saving = false; this.snackBar.open(err?.error?.message || 'Lỗi khi nộp bài.', '✕', { duration: 3000 }); }
        });
    }

    startGrade(sub: any) { this.gradingId = sub.id; this.gradeValue = sub.grade ?? 0; this.feedbackValue = sub.feedback ?? ''; }

    submitGrade(submissionId: number) {
        this.assignmentService.grade(this.assignment.id, submissionId, this.gradeValue, this.feedbackValue).subscribe({
            next: updated => {
                const sub = this.assignment.submissions.find((s: any) => s.id === submissionId);
                if (sub) { sub.grade = updated.grade; sub.feedback = updated.feedback; }
                this.gradingId = null;
                this.snackBar.open('Đã chấm điểm!', '✕', { duration: 3000 });
            },
            error: () => this.snackBar.open('Lỗi khi chấm điểm.', '✕', { duration: 3000 })
        });
    }

    isOverdue(d: string) { return new Date(d) < new Date(); }
}
