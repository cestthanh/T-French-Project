import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UploadedFile } from 'src/app/interface';
import { AssignmentService } from 'src/app/services/assignmentService';
import { AuthService } from 'src/app/services/authService';

import { ToastService } from 'src/app/services/share/toastService';

/** How the student hands the work in. */
type SubmitMode = 'upload' | 'link';

@Component({
    selector: 'app-assignment-detail',
    templateUrl: './assignmentDetail.html',
    standalone: false
})
export class AssignmentDetail implements OnInit {
  assignment: any = null;
  mySubmission: any = null;
  loading = true;
  saving = false;
  gradingId: number | null = null;
  gradeValue = 0;
  feedbackValue = '';
  grantStudentId: number | null = null;
  grantReason = '';
  grantCutoff = '';
  history: any[] = [];
  private serverOffset = 0;
  submitForm: FormGroup;
  editForm: FormGroup;
  savingDraft = false;
  changingStatus = false;
  draftAttachment: UploadedFile | null = null;

  submitMode: SubmitMode = 'upload';
  uploadedFile: UploadedFile | null = null;

  get canGrade(): boolean {
    return this.auth.isTeacher || this.auth.isAdmin;
  }

  /** A submission needs something in it: a file, a link, or at least a note. */
  get canSubmit(): boolean {
    if (!this.canHandIn) return false;
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
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''], dueDate: ['', Validators.required], openAt: [''], allowLate: [false], cutoffAt: [''],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.assignmentService.getById(id).subscribe({
      next: data => {
        this.assignment = data;
        this.serverOffset = new Date(data.serverNow).getTime() - Date.now();
        this.loading = false;
        const date = new Date(data.dueDate);
        this.editForm.reset({
          title: data.title, description: data.description ?? '',
          dueDate: this.localDate(data.dueDate), openAt: this.localDate(data.openAt),
          allowLate: !!data.cutoffAt && new Date(data.cutoffAt) > date, cutoffAt: this.localDate(data.cutoffAt),
        });
        this.draftAttachment = null;
        if (!this.canGrade) {
          this.mySubmission =
            [...(data.submissions ?? [])].filter((s: any) => s.studentId === this.auth.currentUser?.id)
              .sort((a: any, b: any) => b.attemptNumber - a.attemptNumber)[0] ?? null;
          this.history = [...(data.submissions ?? [])].sort((a: any, b: any) => b.attemptNumber - a.attemptNumber);
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Không tải được bài tập.');
      },
    });
  }

  canLeave(): boolean {
    return !this.hasUnsavedDraft() || confirm('Bản nháp bài tập chưa lưu. Bỏ thay đổi để rời trang?');
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedDraft()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  private hasUnsavedDraft(): boolean {
    return this.canGrade && this.assignment?.status === 'Draft' &&
      (this.editForm.dirty || this.draftAttachment != null || this.savingDraft || this.changingStatus);
  }

  saveDraft(): void {
    if (this.savingDraft || this.changingStatus || this.editForm.invalid || this.assignment?.status !== 'Draft') return;
    const due = new Date(this.editForm.value.dueDate);
    if (!Number.isFinite(due.getTime()) || due <= new Date()) {
      this.toast.error('Hạn nộp phải ở tương lai.'); return;
    }
    this.savingDraft = true;
    this.assignmentService.update(this.assignment.id, {
      ...this.editForm.value,
      dueDate: due.toISOString(), courseId: this.assignment.courseId,
      openAt: this.editForm.value.openAt ? new Date(this.editForm.value.openAt).toISOString() : undefined,
      cutoffAt: this.editForm.value.allowLate && this.editForm.value.cutoffAt ? new Date(this.editForm.value.cutoffAt).toISOString() : undefined,
      classId: this.assignment.classId, attachmentId: this.draftAttachment?.id,
    }).subscribe({
      next: () => { this.savingDraft = false; this.toast.success('Đã lưu bản nháp.'); this.load(); },
      error: err => { this.savingDraft = false; this.toast.error(err?.error?.message ?? 'Không lưu được bản nháp.'); },
    });
  }

  publish(): void {
    if (this.changingStatus || this.savingDraft || this.assignment?.status !== 'Draft') return;
    if (this.editForm.dirty || this.draftAttachment) {
      this.toast.error('Hãy lưu thay đổi trước khi công bố.'); return;
    }
    if (!confirm(`Công bố "${this.assignment.title}" cho ${this.assignment.className || 'toàn khoá'}?`)) return;
    this.changingStatus = true;
    this.assignmentService.publish(this.assignment.id).subscribe({
      next: result => { this.changingStatus = false; this.assignment.status = result.status; this.toast.success('Đã công bố bài tập.'); },
      error: err => { this.changingStatus = false; this.toast.error(err?.error?.message ?? 'Không công bố được bài tập.'); },
    });
  }

  close(): void {
    if (this.changingStatus || this.assignment?.status !== 'Published') return;
    if (!confirm('Đóng nhận bài? Học viên vẫn xem được bài tập và kết quả đã có.')) return;
    this.changingStatus = true;
    this.assignmentService.close(this.assignment.id).subscribe({
      next: result => { this.changingStatus = false; this.assignment.status = result.status; this.toast.success('Đã đóng nhận bài.'); },
      error: err => { this.changingStatus = false; this.toast.error(err?.error?.message ?? 'Không đóng được bài tập.'); },
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
      attemptNumber: this.assignment.allowedAttemptNumber,
      fileId: this.submitMode === 'upload' ? this.uploadedFile?.id : undefined,
      fileUrl: this.submitMode === 'link' ? this.submitForm.value.fileUrl : undefined,
      note: this.submitForm.value.note,
    }).subscribe({
      next: s => {
        this.mySubmission = s;
        this.uploadedFile = null;
        this.submitForm.reset();
        this.load();
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
          if (sub) { sub.grade = updated.grade; sub.feedback = updated.feedback; sub.releasedAt = null; }
          this.gradingId = null;
          this.toast.success('Đã chấm điểm!');
        },
        error: () => this.toast.error('Lỗi khi chấm điểm.'),
      });
  }

  get canHandIn(): boolean {
    if (!this.assignment?.allowedAttemptNumber) return false;
    const now = Date.now() + this.serverOffset;
    return (!this.assignment.openAt || now >= new Date(this.assignment.openAt).getTime()) &&
      (!this.assignment.effectiveCutoffAt || now < new Date(this.assignment.effectiveCutoffAt).getTime());
  }

  get timingMessage(): string {
    if (this.assignment?.openAt && Date.now() + this.serverOffset < new Date(this.assignment.openAt).getTime()) return 'Chưa đến giờ mở nhận bài.';
    return 'Đã khóa nhận bài hoặc chưa được cấp lượt nộp tiếp theo.';
  }

  localDate(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  }

  release(sub: any): void {
    if (!confirm('Công bố điểm và nhận xét cho học viên?')) return;
    this.assignmentService.release(this.assignment.id, sub.id).subscribe({
      next: () => { this.toast.success('Đã công bố kết quả.'); this.load(); },
      error: err => this.toast.error(err?.error?.message ?? 'Không công bố được kết quả.'),
    });
  }

  grant(): void {
    if (!this.grantStudentId || !this.grantReason.trim() || !this.grantCutoff) return;
    const cutoff = new Date(this.grantCutoff);
    if (!Number.isFinite(cutoff.getTime()) || cutoff <= new Date()) { this.toast.error('Hạn nộp lại phải ở tương lai.'); return; }
    this.assignmentService.grant(this.assignment.id, this.grantStudentId, this.grantReason, cutoff.toISOString()).subscribe({
      next: () => { this.toast.success('Đã cấp lượt nộp lại.'); this.grantStudentId = null; this.grantReason = ''; this.grantCutoff = ''; this.load(); },
      error: err => this.toast.error(err?.error?.message ?? 'Không cấp được lượt nộp lại.'),
    });
  }

  isOverdue(d: string): boolean {
    return new Date(d) < new Date();
  }
}
