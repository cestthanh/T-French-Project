import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UploadedFile } from 'src/app/interface';
import { FileService, FILE_RULES } from 'src/app/services/fileService';

/**
 * Drop zone that uploads a file the moment it is chosen, then reports the
 * stored file back to the parent.
 *
 * Uploading up front rather than on form submit is what lets the parent send a
 * plain JSON body with a `fileId` — and it means a large file is already on the
 * server by the time the user finishes filling in the rest of the form.
 */
@Component({
  selector: 'tf-file-upload',
  templateUrl: './fileUpload.html',
})
export class BaseFileUpload {
  @Input() label = 'Tệp đính kèm';
  @Input() hint?: string;
  @Input() disabled = false;

  /** Emits the stored file, or null when the user clears the selection. */
  @Output() fileChange = new EventEmitter<UploadedFile | null>();

  readonly accept = FILE_RULES.accept;
  readonly maxMb = Math.round(FILE_RULES.maxSizeBytes / (1024 * 1024));

  uploading = false;
  progress = 0;
  uploaded: UploadedFile | null = null;
  error: string | null = null;
  /** True while a file is being dragged over the zone. */
  dragging = false;

  constructor(private files: FileService) {}

  onPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.startUpload(file);
    // Cleared so that re-picking the same file still fires a change event.
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    if (this.disabled) return;

    const file = event.dataTransfer?.files?.[0];
    if (file) this.startUpload(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.disabled) this.dragging = true;
  }

  onDragLeave(): void {
    this.dragging = false;
  }

  clear(): void {
    this.uploaded = null;
    this.error = null;
    this.progress = 0;
    this.fileChange.emit(null);
  }

  sizeLabel(bytes: number): string {
    return FileService.formatSize(bytes);
  }

  private startUpload(file: File): void {
    this.error = null;

    // Checked here as well as on the server so an oversized file is refused
    // instantly instead of after a long upload that ends in a 400.
    if (file.size > FILE_RULES.maxSizeBytes) {
      this.error = `File vượt quá ${this.maxMb} MB.`;
      return;
    }

    this.uploading = true;
    this.progress = 0;

    this.files.upload(file).subscribe({
      next: event => {
        this.progress = event.progress;
        if (event.file) {
          this.uploaded = event.file;
          this.uploading = false;
          this.fileChange.emit(event.file);
        }
      },
      error: err => {
        this.uploading = false;
        this.progress = 0;
        this.error = err?.error?.message ?? 'Tải file lên thất bại.';
      },
    });
  }
}
