import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AssignmentService } from 'src/app/services/assignmentService';
import { Assignment, ManagedClass, Submission, UploadedFile } from 'src/app/interface';
import { AuthService } from 'src/app/services/authService';
import { ClassService } from 'src/app/services/classService';

import { ToastService } from 'src/app/services/share/toastService';

@Component({
    selector: 'app-assignments-list',
    templateUrl: './assignmentList.html',
    standalone: false
})
export class AssignmentList implements OnInit {
  assignments: Assignment[] = [];
  submissions: Submission[] = [];
  classes: ManagedClass[] = [];
  loading = true;
  saving = false;
  showCreate = false;
  createForm: FormGroup;

  /** Optional brief for the assignment being created. */
  attachment: UploadedFile | null = null;

  get canManage(): boolean {
    return this.auth.isTeacher || this.auth.isAdmin;
  }

  constructor(
    public auth: AuthService,
    private assignmentService: AssignmentService,
    private fb: FormBuilder,
    private toast: ToastService,
    private classService: ClassService,
    private router: Router,
  ) {
    this.createForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      classId: [null, Validators.required],
      dueDate: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.load();
    if (!this.canManage) this.loadSubmissions();
    else this.classService.getManaged().subscribe({
      next: rows => (this.classes = rows),
      error: () => this.toast.error('Không tải được danh sách lớp. Vui lòng thử lại.'),
    });
  }

  load(): void {
    this.loading = true;
    this.assignmentService.getAll().subscribe({
      next: data => { this.assignments = data; this.loading = false; },
      error: () => (this.loading = false),
    });
  }

  loadSubmissions(): void {
    this.assignmentService.mySubmissions().subscribe({
      next: data => (this.submissions = data),
      error: () => {},
    });
  }

  onAttachmentUploaded(file: UploadedFile | null): void {
    this.attachment = file;
  }

  onCreate(): void {
    if (this.createForm.invalid || this.saving) return;
    const selectedClass = this.classes.find(c => c.id === this.createForm.value.classId);
    if (!selectedClass) { this.toast.error('Vui lòng chọn lớp học.'); return; }
    const due = new Date(this.createForm.value.dueDate);
    if (!Number.isFinite(due.getTime()) || due <= new Date()) {
      this.toast.error('Hạn nộp phải ở tương lai.'); return;
    }
    this.saving = true;
    const dto = {
      ...this.createForm.value,
      courseId: selectedClass.courseId,
      dueDate: due.toISOString(),
      attachmentId: this.attachment?.id,
    };
    this.assignmentService.create(dto).subscribe({
      next: created => {
        this.saving = false;
        this.showCreate = false;
        this.attachment = null;
        this.createForm.reset();
        this.load();
        this.toast.success('Đã lưu nháp. Hãy xem trước rồi công bố cho lớp.');
        this.router.navigate(['/dashboard/assignments', created.id]);
      },
      error: err => {
        this.saving = false;
        this.toast.error(err?.error?.message ?? 'Lỗi khi tạo bài tập.');
      },
    });
  }

  onDelete(id: number): void {
    if (!confirm('Xoá bài tập này?')) return;
    this.assignmentService.delete(id).subscribe({
      next: () => { this.load(); this.toast.success('Đã xoá bài tập.'); },
      error: err => this.toast.error(err?.error?.message ?? 'Lỗi khi xoá bài tập.'),
    });
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }
}
