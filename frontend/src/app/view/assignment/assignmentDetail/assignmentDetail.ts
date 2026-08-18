import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UploadedFile } from 'src/app/interface';
import { AssignmentService } from 'src/app/services/assignmentService';
import { AuthService } from 'src/app/services/authService';

import { ToastService } from 'src/app/services/share/toastService';

/** How the student hands the work in. */
type SubmitMode = 'upload' | 'link';

@Component({
  selector: 'app-assignment-detail',
  templateUrl: './assignmentDetail.html',
})
export class AssignmentDetail implements OnInit {
  assignment: any = null;
  mySubmission: any = null;
  loading = true;
  saving = false;
  gradingId: number | null = null;
  gradeValue = 0;
  feedbackValue = '';
  submitForm: FormGroup;

  submitMode: SubmitMode = 'upload';
  uploadedFile: UploadedFile | null = null;

  get canGrade(): boolean {
    return this.auth.isTeacher || this.auth.isAdmin;
  }

  /** A submission needs something in it: a file, a link, or at least a note. */
  get canSubmit(): boolean {
    if (this.submitMode === 'upload') return this.uploadedFile != null;
    return !!this.submitForm.value.fileUrl?.trim() || !!this.submitForm.value.note?.trim();
  }

  constructor(
    private route: ActivatedRoute,
    public auth: AuthService,
    private assignmentService: AssignmentService,
    private fb: FormBuilder,
    private toast: ToastService,
  ) {
    this.submitForm = this.fb.group({ note: [''], fileUrl: [''] });
  }

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.assignmentService.getById(id).subscribe({
      next: data => {
        this.assignment = data;
        this.loading = false;
        if (!this.canGrade) {
          this.mySubmission =
            data.submissions?.find((s: any) => s.studentId === this.auth.currentUser?.id) ?? null;
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Không tải được bài tập.');
      },
    });
  }

  setSubmitMode(mode: SubmitMode): void {
    this.submitMode = mode;
    if (mode === 'upload') this.submitForm.patchValue({ fileUrl: '' });
    else this.uploadedFile = null;
  }

  onFileUploaded(file: UploadedFile | null): void {
    this.uploadedFile = file;
  }

  onSubmit(): void {
    if (this.saving || !this.canSubmit) return;
    this.saving = true;
    this.assignmentService.submit(this.assignment.id, {
      fileId: this.submitMode === 'upload' ? this.uploadedFile?.id : undefined,
      fileUrl: this.submitMode === 'link' ? this.submitForm.value.fileUrl : undefined,
      note: this.submitForm.value.note,
    }).subscribe({
      next: s => {
        this.mySubmission = s;
        this.saving = false;
        this.toast.success('Nộp bài thành công!');
      },
      error: err => {
        this.saving = false;
        this.toast.error(err?.error?.message || 'Lỗi khi nộp bài.');
      },
    });
  }

  startGrade(sub: any): void {
    this.gradingId = sub.id;
    this.gradeValue = sub.grade ?? 0;
    this.feedbackValue = sub.feedback ?? '';
  }

  submitGrade(submissionId: number): void {
    this.assignmentService
      .grade(this.assignment.id, submissionId, this.gradeValue, this.feedbackValue)
      .subscribe({
        next: updated => {
          const sub = this.assignment.submissions.find((s: any) => s.id === submissionId);
          if (sub) { sub.grade = updated.grade; sub.feedback = updated.feedback; }
          this.gradingId = null;
          this.toast.success('Đã chấm điểm!');
        },
        error: () => this.toast.error('Lỗi khi chấm điểm.'),
      });
  }

  isOverdue(d: string): boolean {
    return new Date(d) < new Date();
  }
}
