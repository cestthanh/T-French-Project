import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ResourceService } from 'src/app/services/resourceService';
import { Resource, UploadedFile } from 'src/app/interface';
import { AuthService } from 'src/app/services/authService';
import { FileService } from 'src/app/services/fileService';
import { ToastService } from 'src/app/services/share/toastService';

/** Visual treatment derived from the resource's source. */
interface ResourceKind { icon: string; chip: string; label: string; }

/** Where the material comes from. Uploading keeps it behind the API's access
 * check; a link hands control to whoever owns the far end. */
type SourceMode = 'upload' | 'link';

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

  sourceMode: SourceMode = 'upload';
  uploadedFile: UploadedFile | null = null;
  downloadingId: number | null = null;

  get canManage(): boolean {
    return this.auth.isTeacher || this.auth.isAdmin;
  }

  /** The form is only submittable once a source has actually been supplied —
   * the API rejects a resource with neither, so blocking here saves a round
   * trip and gives the button an honest disabled state. */
  get hasSource(): boolean {
    return this.sourceMode === 'upload'
      ? this.uploadedFile != null
      : !!this.createForm.value.fileUrl?.trim();
  }

  constructor(
    public auth: AuthService,
    private resourceService: ResourceService,
    private files: FileService,
    private fb: FormBuilder,
    private toast: ToastService,
  ) {
    this.createForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      fileUrl: [''],
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

  setSourceMode(mode: SourceMode): void {
    this.sourceMode = mode;
    // Clearing the other side stops a half-filled switch from sending both a
    // file and a link, where the API would have to guess which one was meant.
    if (mode === 'upload') this.createForm.patchValue({ fileUrl: '' });
    else this.uploadedFile = null;
  }

  onFileUploaded(file: UploadedFile | null): void {
    this.uploadedFile = file;
  }

  /** Icon + flat colour chip, chosen from the stored file's type when there is
   * one and from the link otherwise. */
  kindOf(r: Resource): ResourceKind {
    if (r.file) {
      const type = r.file.contentType;
      if (type.startsWith('image/'))
        return { icon: 'image', chip: 'bg-secondary-soft text-secondary-dark', label: 'Ảnh' };
      if (type === 'application/pdf')
        return { icon: 'file-down', chip: 'bg-accent-soft text-accent-dark', label: 'PDF' };
      return { icon: 'file-text', chip: 'bg-primary-soft text-primary', label: 'Tài liệu' };
    }

    const url = r.fileUrl ?? '';
    if (!url) return { icon: 'file-text', chip: 'bg-muted text-ink', label: 'Tệp' };
    if (url.includes('youtube') || url.includes('youtu.be'))
      return { icon: 'play', chip: 'bg-danger-soft text-danger', label: 'Video' };
    if (url.includes('.pdf'))
      return { icon: 'file-down', chip: 'bg-accent-soft text-accent-dark', label: 'PDF' };
    if (url.includes('drive.google') || url.includes('docs.google'))
      return { icon: 'folder', chip: 'bg-primary-soft text-primary', label: 'Drive' };
    return { icon: 'link', chip: 'bg-secondary-soft text-secondary', label: 'Link' };
  }

  download(r: Resource): void {
    if (!r.file || this.downloadingId === r.id) return;

    this.downloadingId = r.id;
    this.files.download(r.file).subscribe({
      next: () => (this.downloadingId = null),
      error: err => {
        this.downloadingId = null;
        this.toast.error(
          err?.status === 403 ? 'Bạn không có quyền tải tài liệu này.' : 'Không tải được file.',
        );
      },
    });
  }

  onCreate(): void {
    if (this.createForm.invalid || !this.hasSource) return;
    this.saving = true;

    this.resourceService
      .create({
        ...this.createForm.value,
        fileUrl: this.sourceMode === 'link' ? this.createForm.value.fileUrl : undefined,
        fileId: this.sourceMode === 'upload' ? this.uploadedFile?.id : undefined,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.showCreate = false;
          this.uploadedFile = null;
          this.sourceMode = 'upload';
          this.createForm.reset({ isPublic: false });
          this.load();
          this.toast.success('Đã thêm tài liệu!');
        },
        error: err => {
          this.saving = false;
          this.toast.error(err?.error?.message || 'Lỗi khi thêm tài liệu.');
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
