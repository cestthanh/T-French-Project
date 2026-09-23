import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from 'src/app/services/adminService';
import { AdminStats, AdminUser, AdminBlogPost, AuditLogEntry, ContactLead, LeadStats, LeadStatus, ManagedClass } from 'src/app/interface';
import { LeadService } from 'src/app/services/leadService';
import { ToastService } from 'src/app/services/share/toastService';
import { StatTone } from 'src/app/components/baseControl/stat/stat';
import { ClassService } from 'src/app/services/classService';

interface AdminStatCard { icon: string; value: number; label: string; tone: StatTone; }

/** Status filter chips, and the badge tone each status is drawn with. */
const LEAD_STATUSES: { value: LeadStatus | ''; label: string; tone: string }[] = [
  { value: '', label: 'Tất cả', tone: 'muted' },
  { value: 'New', label: 'Mới', tone: 'danger' },
  { value: 'Contacted', label: 'Đã liên hệ', tone: 'accent' },
  { value: 'Enrolled', label: 'Đã ghi danh', tone: 'success' },
  { value: 'Closed', label: 'Đã đóng', tone: 'muted' },
];

@Component({
    selector: 'app-admin-page',
    templateUrl: './admin.html',
    standalone: false
})
export class Admin implements OnInit {
  stats: AdminStats | null = null;
  users: AdminUser[] = [];
  blogPosts: AdminBlogPost[] = [];
  userSearch = '';
  userRole = '';
  blogSaving = false;
  blogForm: FormGroup;
  /** Id of the post being edited, or null when the form is creating a new one.
   * One form serves both: the fields are identical, and a separate edit form
   * would be the same markup twice. */
  editingBlogId: number | null = null;
  blogLoading = false;
  statCards: AdminStatCard[] = [];

  leads: ContactLead[] = [];
  leadStats: LeadStats | null = null;
  leadStatus: LeadStatus | '' = '';
  leadSearch = '';
  /** Which enquiry has its follow-up note open. Only one at a time — the notes
   * are long enough that several open at once is unreadable. */
  editingNoteId: number | null = null;
  noteDraft = '';
  managedClasses: ManagedClass[] = [];
  convertingLeadId: number | null = null;
  selectedLeadClassId: number | null = null;
  newAccountNotice: { email: string; password: string } | null = null;
  auditLogs: AuditLogEntry[] = [];
  auditAction = '';

  readonly leadStatuses = LEAD_STATUSES;

  readonly roleFilters = [
    { value: '', label: 'Tất cả' },
    { value: 'Student', label: 'Học viên' },
    { value: 'Teacher', label: 'Giáo viên' },
    { value: 'Admin', label: 'Admin' },
  ];

  constructor(
    private adminService: AdminService,
    private leadService: LeadService,
    private fb: FormBuilder,
    private toast: ToastService,
    private classService: ClassService,
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
    this.loadLeads();
    this.loadLeadStats();
    this.classService.getManaged().subscribe({ next: rows => (this.managedClasses = rows.filter(x => x.status === 'Open')) });
    this.loadAuditLog();
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

  onToggleUserActive(user: AdminUser): void {
    const action = user.isActive ? 'vô hiệu hoá' : 'kích hoạt lại';
    if (!confirm(`Bạn có chắc muốn ${action} tài khoản "${user.fullName}"?`)) return;
    this.adminService.setUserActive(user.id, !user.isActive).subscribe({
      next: res => {
        user.isActive = res.isActive;
        this.toast.success(res.isActive ? 'Đã kích hoạt tài khoản.' : 'Đã vô hiệu hoá tài khoản.');
      },
      error: err => this.toast.error(err?.error?.message || `Không thể ${action} tài khoản.`),
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

  startEditBlog(post: AdminBlogPost): void {
    this.blogLoading = true;
    this.editingBlogId = post.id;

    // Fetched rather than filled from the list row: the list carries no
    // summary or content, and patching from it would blank the body.
    this.adminService.getBlogPost(post.id).subscribe({
      next: full => {
        this.blogLoading = false;
        this.blogForm.patchValue({
          title: full.title,
          slug: full.slug,
          summary: full.summary ?? '',
          content: full.content,
          tags: full.tags ?? '',
          coverImageUrl: full.coverImageUrl ?? '',
          isPublished: full.isPublished,
        });
      },
      error: () => {
        this.blogLoading = false;
        this.editingBlogId = null;
        this.toast.error('Không tải được nội dung bài viết.');
      },
    });
  }

  cancelEditBlog(): void {
    this.editingBlogId = null;
    this.blogForm.reset({ isPublished: false });
  }

  onSaveBlog(): void {
    if (this.blogForm.invalid || this.blogSaving) return;
    this.blogSaving = true;

    const id = this.editingBlogId;
    const request = id == null
      ? this.adminService.createBlogPost(this.blogForm.value)
      : this.adminService.updateBlogPost(id, this.blogForm.value);

    request.subscribe({
      next: () => {
        this.blogSaving = false;
        this.editingBlogId = null;
        this.blogForm.reset({ isPublished: false });
        this.loadBlog();
        this.toast.success(id == null ? 'Đã tạo bài viết!' : 'Đã lưu thay đổi!');
      },
      error: err => {
        this.blogSaving = false;
        // A 409 carries the actual clashing slug, which is more use than the
        // old blanket "check whether the slug exists" guess.
        this.toast.error(err?.error?.message || 'Lỗi khi lưu bài viết.');
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

  // ── Enquiries ──────────────────────────────────────────────────────────────

  loadLeads(): void {
    this.leadService
      .getAll(this.leadStatus || undefined, this.leadSearch || undefined)
      .subscribe({ next: d => (this.leads = d), error: () => {} });
  }

  loadLeadStats(): void {
    this.leadService.getStats().subscribe({ next: s => (this.leadStats = s), error: () => {} });
  }

  filterLeadStatus(status: LeadStatus | ''): void {
    this.leadStatus = status;
    this.loadLeads();
  }

  onChangeLeadStatus(lead: ContactLead, status: LeadStatus): void {
    this.leadService.update(lead.id, { status }).subscribe({
      next: () => {
        lead.status = status;
        // The counts drive the tab label, so they have to move with the change.
        this.loadLeadStats();
        // A lead that no longer matches the active filter should leave the list
        // rather than sit there contradicting the filter above it.
        if (this.leadStatus && this.leadStatus !== status) this.loadLeads();
        this.toast.success('Đã cập nhật trạng thái.');
      },
      error: () => this.toast.error('Lỗi khi cập nhật trạng thái.'),
    });
  }

  startNote(lead: ContactLead): void {
    this.editingNoteId = lead.id;
    this.noteDraft = lead.note ?? '';
  }

  saveNote(lead: ContactLead): void {
    this.leadService.update(lead.id, { note: this.noteDraft }).subscribe({
      next: () => {
        lead.note = this.noteDraft;
        this.editingNoteId = null;
        this.toast.success('Đã lưu ghi chú.');
      },
      error: () => this.toast.error('Lỗi khi lưu ghi chú.'),
    });
  }

  onDeleteLead(lead: ContactLead): void {
    if (!confirm(`Xoá yêu cầu tư vấn của "${lead.fullName}"?`)) return;
    this.leadService.delete(lead.id).subscribe({
      next: () => { this.loadLeads(); this.loadLeadStats(); this.toast.success('Đã xoá yêu cầu.'); },
      error: () => this.toast.error('Lỗi khi xoá yêu cầu.'),
    });
  }

  startConvertLead(lead: ContactLead): void {
    this.convertingLeadId = lead.id;
    this.selectedLeadClassId = null;
  }

  convertLead(lead: ContactLead): void {
    if (!this.selectedLeadClassId) return;
    this.leadService.convert(lead.id, this.selectedLeadClassId).subscribe({
      next: result => {
        if (result.createdAccount && result.temporaryPassword) {
          this.newAccountNotice = { email: lead.email, password: result.temporaryPassword };
        }
        this.convertingLeadId = null;
        this.selectedLeadClassId = null;
        this.loadLeads();
        this.loadLeadStats();
        this.toast.success('Đã tạo/liên kết học viên và ghi danh vào lớp.');
      },
      error: err => this.toast.error(err?.error?.message ?? 'Không thể chuyển lead thành học viên.'),
    });
  }

  leadTone(status: LeadStatus): string {
    return LEAD_STATUSES.find(s => s.value === status)?.tone ?? 'muted';
  }

  leadLabel(status: LeadStatus): string {
    return LEAD_STATUSES.find(s => s.value === status)?.label ?? status;
  }

  loadAuditLog(): void {
    this.adminService.getAuditLog(this.auditAction || undefined).subscribe({
      next: rows => (this.auditLogs = rows),
      error: () => this.toast.error('Không tải được nhật ký bảo mật.'),
    });
  }
}
