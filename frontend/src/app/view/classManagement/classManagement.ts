import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  AdminUser,
  ClassEnrollment,
  EnrollmentStatus,
  ManagedClass,
  ManagedCourse,
  SaveClassRequest,
} from 'src/app/interface';
import { AdminService } from 'src/app/services/adminService';
import { AuthService } from 'src/app/services/authService';
import { ClassService } from 'src/app/services/classService';
import { CourseService } from 'src/app/services/courseService';
import { ToastService } from 'src/app/services/share/toastService';

@Component({
    selector: 'app-class-management',
    templateUrl: './classManagement.html',
    standalone: false
})
export class ClassManagement implements OnInit {
  courses: ManagedCourse[] = [];
  classes: ManagedClass[] = [];
  teachers: AdminUser[] = [];
  students: AdminUser[] = [];
  enrollments: ClassEnrollment[] = [];
  selectedClass: ManagedClass | null = null;
  editingClassId: number | null = null;
  savingCourse = false;
  savingClass = false;
  addingStudent = false;
  selectedStudentId: number | null = null;
  loading = true;

  readonly enrollmentStatuses: EnrollmentStatus[] = [
    'Active', 'Pending', 'Paused', 'Completed', 'Cancelled', 'Expired',
  ];

  courseForm: FormGroup;
  classForm: FormGroup;

  get isAdmin(): boolean {
    return this.auth.isAdmin;
  }

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private classService: ClassService,
    private adminService: AdminService,
    public auth: AuthService,
    private toast: ToastService,
  ) {
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      level: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      imageUrl: [''],
      teacherId: [null],
    });

    this.classForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      courseId: [null, Validators.required],
      teacherId: [null],
      startDate: ['', Validators.required],
      endDate: [''],
      capacity: [20, [Validators.required, Validators.min(1), Validators.max(500)]],
      modality: ['Online', Validators.required],
      status: ['Open', Validators.required],
      scheduleSummary: [''],
      locationOrMeetingUrl: [''],
    });
  }

  ngOnInit(): void {
    this.reload();
    if (this.isAdmin) {
      this.adminService.getUsers('Teacher').subscribe({
        next: rows => (this.teachers = rows.filter(x => x.isActive)),
      });
      this.adminService.getUsers('Student').subscribe({
        next: rows => (this.students = rows.filter(x => x.isActive)),
      });
    }
  }

  reload(): void {
    this.loading = true;
    this.courseService.getMyCourses().subscribe({
      next: rows => {
        this.courses = rows as ManagedCourse[];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Không tải được danh sách khoá học.');
      },
    });
    this.classService.getManaged().subscribe({
      next: rows => (this.classes = rows),
      error: () => this.toast.error('Không tải được danh sách lớp học.'),
    });
  }

  createCourse(): void {
    if (this.courseForm.invalid || this.savingCourse) return;
    if (this.isAdmin && !this.courseForm.value.teacherId) {
      this.toast.error('Vui lòng chọn giáo viên phụ trách.');
      return;
    }

    this.savingCourse = true;
    this.courseService.create(this.courseForm.value).subscribe({
      next: () => {
        this.savingCourse = false;
        this.courseForm.reset({ price: 0, teacherId: null });
        this.reload();
        this.toast.success('Đã tạo khoá học ở trạng thái bản nháp.');
      },
      error: err => {
        this.savingCourse = false;
        this.toast.error(err?.error?.message ?? 'Không thể tạo khoá học.');
      },
    });
  }

  togglePublish(course: ManagedCourse): void {
    this.courseService.togglePublish(course.id).subscribe({
      next: result => {
        course.isPublished = result.isPublished;
        this.toast.success(result.isPublished ? 'Đã công khai khoá học.' : 'Đã chuyển khoá học về bản nháp.');
      },
      error: err => this.toast.error(err?.error?.message ?? 'Không thể đổi trạng thái khoá học.'),
    });
  }

  saveClass(): void {
    if (this.classForm.invalid || this.savingClass) return;
    if (this.isAdmin && !this.classForm.value.teacherId) {
      this.toast.error('Vui lòng chọn giáo viên phụ trách lớp.');
      return;
    }

    const value = this.classForm.value;
    const request: SaveClassRequest = {
      ...value,
      courseId: Number(value.courseId),
      teacherId: value.teacherId ? Number(value.teacherId) : undefined,
      capacity: Number(value.capacity),
      startDate: new Date(value.startDate).toISOString(),
      endDate: value.endDate ? new Date(value.endDate).toISOString() : undefined,
    };

    this.savingClass = true;
    const editingId = this.editingClassId;
    const save = editingId
      ? this.classService.update(editingId, request)
      : this.classService.create(request);
    save.subscribe({
      next: () => {
        this.savingClass = false;
        this.cancelEditClass();
        this.reload();
        this.toast.success(editingId ? 'Đã cập nhật lớp học.' : 'Đã tạo lớp học.');
      },
      error: err => {
        this.savingClass = false;
        this.toast.error(err?.error?.message ?? 'Không thể lưu lớp học.');
      },
    });
  }

  editClass(item: ManagedClass): void {
    this.editingClassId = item.id;
    this.classForm.patchValue({
      name: item.name,
      courseId: item.courseId,
      teacherId: item.teacherId,
      startDate: this.toLocalInput(item.startDate),
      endDate: item.endDate ? this.toLocalInput(item.endDate) : '',
      capacity: item.capacity,
      modality: item.modality,
      status: item.status,
      scheduleSummary: item.scheduleSummary ?? '',
      locationOrMeetingUrl: item.locationOrMeetingUrl ?? '',
    });
  }

  cancelEditClass(): void {
    this.editingClassId = null;
    this.classForm.reset({ capacity: 20, modality: 'Online', status: 'Open' });
  }

  viewEnrollments(item: ManagedClass): void {
    this.selectedClass = item;
    this.classService.getEnrollments(item.id).subscribe({
      next: rows => (this.enrollments = rows),
      error: () => this.toast.error('Không tải được danh sách học viên.'),
    });
  }

  changeEnrollmentStatus(row: ClassEnrollment, status: EnrollmentStatus): void {
    if (!this.isAdmin) return;
    this.classService.setEnrollmentStatus(row.id, status).subscribe({
      next: () => {
        row.status = status;
        this.reload();
        this.toast.success('Đã cập nhật trạng thái ghi danh.');
      },
      error: err => this.toast.error(err?.error?.message ?? 'Không thể cập nhật ghi danh.'),
    });
  }

  addStudent(): void {
    if (!this.isAdmin || !this.selectedClass || !this.selectedStudentId || this.addingStudent) return;
    this.addingStudent = true;
    this.classService.addEnrollment(this.selectedClass.id, this.selectedStudentId).subscribe({
      next: () => {
        this.addingStudent = false;
        this.selectedStudentId = null;
        this.viewEnrollments(this.selectedClass!);
        this.reload();
        this.toast.success('Đã thêm học viên vào lớp.');
      },
      error: err => {
        this.addingStudent = false;
        this.toast.error(err?.error?.message ?? 'Không thể thêm học viên.');
      },
    });
  }

  private toLocalInput(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
