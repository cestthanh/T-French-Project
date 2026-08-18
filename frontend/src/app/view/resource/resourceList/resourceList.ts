import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ResourceService } from 'src/app/services/resourceService';
import { Resource } from 'src/app/interface';
import { AuthService } from 'src/app/services/authService';
import { ToastService } from 'src/app/services/share/toastService';

/** Visual treatment derived from the link target. */
interface ResourceKind { icon: string; chip: string; label: string; }

@Component({
  selector: 'app-resources-list',
  templateUrl: './resourceList.html',
})
export class ResourceList implements OnInit {
  resources: Resource[] = [];
  filtered: Resource[] = [];
  categories: string[] = [];
  activeCategory: string | null = null;
  loading = true;
  saving = false;
  showCreate = false;
  createForm: FormGroup;

  get canManage(): boolean {
    return this.auth.isTeacher || this.auth.isAdmin;
  }

  constructor(
    public auth: AuthService,
    private resourceService: ResourceService,
    private fb: FormBuilder,
    private toast: ToastService,
  ) {
    this.createForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      fileUrl: ['', Validators.required],
      category: [''],
      isPublic: [false],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.resourceService.getAll().subscribe({
      next: data => {
        this.resources = data;
        this.filtered = data;
        this.categories = [...new Set(data.map(r => r.category).filter(Boolean) as string[])];
        this.activeCategory = null;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  filterCategory(cat: string | null): void {
    this.activeCategory = cat;
    this.filtered = cat ? this.resources.filter(r => r.category === cat) : this.resources;
  }

  /** Maps a link to its icon + flat colour chip. */
  kindOf(url: string): ResourceKind {
    if (!url) return { icon: 'file-text', chip: 'bg-muted text-ink', label: 'Tệp' };
    if (url.includes('youtube') || url.includes('youtu.be'))
      return { icon: 'play', chip: 'bg-danger-soft text-danger', label: 'Video' };
    if (url.includes('.pdf'))
      return { icon: 'file-down', chip: 'bg-accent-soft text-accent-dark', label: 'PDF' };
    if (url.includes('drive.google') || url.includes('docs.google'))
      return { icon: 'folder', chip: 'bg-primary-soft text-primary', label: 'Drive' };
    return { icon: 'link', chip: 'bg-secondary-soft text-secondary', label: 'Link' };
  }

  onCreate(): void {
    if (this.createForm.invalid) return;
    this.saving = true;
    this.resourceService.create(this.createForm.value).subscribe({
      next: () => {
        this.saving = false;
        this.showCreate = false;
        this.createForm.reset({ isPublic: false });
        this.load();
        this.toast.success('Đã thêm tài liệu!');
      },
      error: () => {
        this.saving = false;
        this.toast.error('Lỗi khi thêm tài liệu.');
      },
    });
  }

  onDelete(id: number): void {
    if (!confirm('Xoá tài liệu này?')) return;
    this.resourceService.delete(id).subscribe({
      next: () => { this.load(); this.toast.success('Đã xoá tài liệu.'); },
      error: () => this.toast.error('Lỗi khi xoá tài liệu.'),
    });
  }
}
