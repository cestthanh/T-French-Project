import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AssignmentService } from 'src/app/services/assignmentService';
import { Assignment, Submission, UploadedFile } from 'src/app/interface';
import { AuthService } from 'src/app/services/authService';

import { ToastService } from 'src/app/services/share/toastService';

@Component({
  selector: 'app-assignments-list',
  templateUrl: './assignmentList.html',
})
export class AssignmentList implements OnInit {
  assignments: Assignment[] = [];
  submissions: Submission[] = [];
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
  ) {
    this.createForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      courseId: [null, Validators.required],
      dueDate: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.load();
    if (!this.canManage) this.loadSubmissions();
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
    if (this.createForm.invalid) return;
    this.saving = true;
    const dto = {
      ...this.createForm.value,
      dueDate: new Date(this.createForm.value.dueDate).toISOString(),
      attachmentId: this.attachment?.id,
    };
    this.assignmentService.create(dto).subscribe({
      next: () => {
        this.saving = false;
        this.showCreate = false;
        this.attachment = null;
        this.createForm.reset();
        this.load();
        this.toast.success('Đã tạo bài tập!');
      },
      error: () => {
        this.saving = false;
        this.toast.error('Lỗi khi tạo bài tập.');
      },
    });
  }

  onDelete(id: number): void {
    if (!confirm('Xoá bài tập này?')) return;
    this.assignmentService.delete(id).subscribe({
      next: () => { this.load(); this.toast.success('Đã xoá bài tập.'); },
      error: () => this.toast.error('Lỗi khi xoá bài tập.'),
    });
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }
}
