import { Component, Input } from '@angular/core';
import { StoredFileInfo } from 'src/app/interface';
import { FileService } from 'src/app/services/fileService';
import { ToastService } from 'src/app/services/share/toastService';

/**
 * Read-only counterpart to `tf-file-upload`: shows an attached file and
 * downloads it on click.
 *
 * It is a button rather than a link because the download needs the bearer
 * token — see `FileService.download()`.
 */
@Component({
  selector: 'tf-file-chip',
  templateUrl: './fileChip.html',
})
export class BaseFileChip {
  /** An uploaded file. Mutually exclusive with `url`. */
  @Input() file?: StoredFileInfo | null;

  /** An external link (Google Drive and friends). Opens in a new tab. */
  @Input() url?: string | null;

  /** Overrides the label shown for an external link. */
  @Input() urlLabel = 'Mở link tài liệu';

  downloading = false;

  constructor(private files: FileService, private toast: ToastService) {}

  get sizeLabel(): string {
    return this.file ? FileService.formatSize(this.file.sizeBytes) : '';
  }

  download(): void {
    if (!this.file || this.downloading) return;

    this.downloading = true;
    this.files.download(this.file).subscribe({
      next: () => (this.downloading = false),
      error: err => {
        this.downloading = false;
        // 403 here means the file is real but not theirs — worth saying plainly
        // rather than reporting a generic failure.
        this.toast.error(
          err?.status === 403
            ? 'Bạn không có quyền tải tài liệu này.'
            : 'Không tải được file.',
        );
      },
    });
  }
}
