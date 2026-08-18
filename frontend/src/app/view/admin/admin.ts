import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from 'src/app/services/adminService';
import { AdminStats, AdminUser, AdminBlogPost } from 'src/app/interface';
import { ToastService } from 'src/app/services/share/toastService';
import { StatTone } from 'src/app/components/baseControl/stat/stat';

interface AdminStatCard { icon: string; value: number; label: string; tone: StatTone; }

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  stats: AdminStats | null = null;
  users: AdminUser[] = [];
  blogPosts: AdminBlogPost[] = [];
  userSearch = '';
  userRole = '';
  blogSaving = false;
  blogForm: FormGroup;
  statCards: AdminStatCard[] = [];

  readonly roleFilters = [
    { value: '', label: 'Tất cả' },
    { value: 'Student', label: 'Học viên' },
    { value: 'Teacher', label: 'Giáo viên' },
    { value: 'Admin', label: 'Admin' },
  ];

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private toast: ToastService,
  ) {
    this.blogForm = this.fb.group({
      title: ['', Validators.required],
      slug: ['', Validators.required],
      summary: [''],
      content: ['', Validators.required],
      tags: [''],
      coverImageUrl: [''],
      isPublished: [false],
    });
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadUsers();
    this.loadBlog();
  }

  loadStats(): void {
    this.adminService.getStats().subscribe({
      next: s => {
        this.stats = s;
        this.statCards = [
          { icon: 'users', value: s.totalUsers, label: 'Người dùng', tone: 'primary' },
          { icon: 'graduation-cap', value: s.totalStudents, label: 'Học viên', tone: 'secondary' },
          { icon: 'user-cog', value: s.totalTeachers, label: 'Giáo viên', tone: 'accent' },
          { icon: 'clipboard-list', value: s.totalAssignments, label: 'Bài tập', tone: 'dark' },
          { icon: 'clipboard-check', value: s.pendingGrading, label: 'Chờ chấm', tone: 'danger' },
          { icon: 'calendar-days', value: s.totalBookings, label: 'Lịch đã đặt', tone: 'primary' },
          { icon: 'newspaper', value: s.publishedPosts, label: 'Bài blog', tone: 'secondary' },
          { icon: 'book-open', value: s.totalCourses, label: 'Khoá học', tone: 'dark' },
        ];
      },
      error: () => this.toast.error('Không tải được số liệu.'),
    });
  }

  loadUsers(): void {
    this.adminService
      .getUsers(this.userRole || undefined, this.userSearch || undefined)
      .subscribe({ next: d => (this.users = d), error: () => {} });
  }

  loadBlog(): void {
    this.adminService.getBlogPosts().subscribe({ next: d => (this.blogPosts = d), error: () => {} });
  }

  filterRole(role: string): void {
    this.userRole = role;
    this.loadUsers();
  }

  onChangeRole(user: AdminUser, newRole: string): void {
    this.adminService.changeRole(user.id, newRole).subscribe({
      next: () => { user.role = newRole; this.toast.success(`Đã đổi role thành ${newRole}.`); },
      error: () => this.toast.error('Lỗi khi đổi role.'),
    });
  }

  onDeleteUser(id: number, name: string): void {
    if (!confirm(`Xoá tài khoản "${name}"? Hành động này không thể hoàn tác.`)) return;
    this.adminService.deleteUser(id).subscribe({
      next: () => { this.loadUsers(); this.toast.success('Đã xoá tài khoản.'); },
      error: () => this.toast.error('Không xoá được — tài khoản này còn dữ liệu liên quan.'),
    });
  }

  onTogglePublish(post: AdminBlogPost): void {
    this.adminService.togglePublish(post.id).subscribe({
      next: res => {
        post.isPublished = res.isPublished;
        this.toast.success(res.isPublished ? 'Đã đăng bài!' : 'Đã ẩn bài.');
      },
      error: () => this.toast.error('Lỗi khi đổi trạng thái bài viết.'),
    });
  }

  onDeleteBlog(id: number): void {
    if (!confirm('Xoá bài viết này?')) return;
    this.adminService.deleteBlogPost(id).subscribe({
      next: () => { this.loadBlog(); this.toast.success('Đã xoá bài viết.'); },
      error: () => this.toast.error('Lỗi khi xoá bài viết.'),
    });
  }

  onCreateBlog(): void {
    if (this.blogForm.invalid) return;
    this.blogSaving = true;
    this.adminService.createBlogPost(this.blogForm.value).subscribe({
      next: () => {
        this.blogSaving = false;
        this.blogForm.reset({ isPublished: false });
        this.loadBlog();
        this.toast.success('Đã tạo bài viết!');
      },
      error: () => {
        this.blogSaving = false;
        this.toast.error('Lỗi khi tạo bài — kiểm tra slug đã tồn tại chưa.');
      },
    });
  }

  /** Vietnamese-aware slug: strips diacritics and maps đ → d. */
  autoSlug(): void {
    const title: string = this.blogForm.value.title ?? '';
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    this.blogForm.patchValue({ slug });
  }

  getTags(tags?: string): string[] {
    return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  }
}
