import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from 'src/app/services/courseService';
// Aliased: the page class below is also called CourseDetail.
import { CourseDetail as CourseDetailModel } from 'src/app/interface';
import { AuthService } from 'src/app/services/authService';
import { ToastService } from 'src/app/services/share/toastService';

@Component({
    selector: 'app-course-detail',
    templateUrl: './courseDetail.html',
    standalone: false
})
export class CourseDetail implements OnInit {
  course?: CourseDetailModel;
  enrolling = false;
  selectedClassId: number | null = null;

  readonly outcomes = [
    'Phát âm chuẩn tiếng Pháp',
    'Giao tiếp cơ bản hàng ngày',
    'Ngữ pháp nền tảng vững chắc',
    'Từ vựng theo chủ đề thiết thực',
    'Kỹ năng đọc hiểu văn bản',
    'Tự tin trong môi trường Pháp ngữ',
  ];

  get meta(): { icon: string; value: string }[] {
    if (!this.course) return [];
    return [
      { icon: 'user', value: this.course.teacher },
      { icon: 'users', value: `${this.course.enrollmentCount} học viên` },
      { icon: 'clipboard-list', value: `${this.course.assignmentCount} bài tập` },
      { icon: 'folder', value: `${this.course.resourceCount} tài liệu` },
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private courseService: CourseService,
    public auth: AuthService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.courseService.getById(id).subscribe({
      next: course => {
        this.course = course;
        this.selectedClassId = course.classes?.[0]?.id ?? null;
      },
      error: () => this.router.navigate(['/courses']),
    });
  }

  onEnroll(): void {
    if (!this.course) return;
    if (!this.selectedClassId) {
      this.toast.error('Khoá học hiện chưa có lớp mở đăng ký.');
      return;
    }
    this.enrolling = true;
    this.courseService.enroll(this.course.id, this.selectedClassId).subscribe({
      next: res => {
        this.enrolling = false;
        this.course!.enrollmentStatus = res.status;
        if (res.status === 'Active') {
          this.course!.isEnrolled = true;
          this.course!.enrollmentCount++;
        }
        this.toast.success(res.message ?? 'Đăng ký thành công! 🎉');
      },
      error: err => {
        this.enrolling = false;
        this.toast.error(err?.error?.message ?? 'Lỗi khi đăng ký.');
      },
    });
  }

  selectClass(classId: number): void {
    this.selectedClassId = classId;
  }
}
