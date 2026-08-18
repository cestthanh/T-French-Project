import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { StoredFileInfo, UploadedFile } from 'src/app/interface';
import { uriFile } from './Uri/RequestUri/uriFile';

/** What `upload()` emits: percentage while in flight, then the stored file. */
export interface UploadProgress {
  progress: number;
  file: UploadedFile | null;
}

/** Mirrors FileStorageOptions on the API. Kept here so the picker can reject an
 * obviously wrong file before spending a round trip on it — the server still
 * validates, this is only to fail fast. */
export const FILE_RULES = {
  maxSizeBytes: 25 * 1024 * 1024,
  accept: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png,.webp',
};

@Injectable({ providedIn: 'root' })
export class FileService {
  constructor(private http: HttpClient) {}

  /**
   * Uploads one file, reporting progress.
   *
   * No Content-Type header is set: the browser has to add its own multipart
   * boundary, and naming the type ourselves would overwrite it.
   */
  upload(file: File): Observable<UploadProgress> {
    const form = new FormData();
    form.append('file', file);

    return this.http
      .post<UploadedFile>(uriFile.UPLOAD, form, { reportProgress: true, observe: 'events' })
      .pipe(map(event => this.toProgress(event)));
  }

  /**
   * Downloads a file and hands it to the browser's save dialog.
   *
   * Fetched as a blob rather than linked to directly: the endpoint requires the
   * bearer token, which a plain anchor would not send. That is the same
   * property that stops a copied URL from working outside the app.
   */
  download(file: StoredFileInfo): Observable<void> {
    return this.http
      .get(uriFile.DOWNLOAD(file.publicId), { responseType: 'blob' })
      .pipe(map(blob => this.saveAs(blob, file.originalName)));
  }

  info(publicId: string): Observable<StoredFileInfo> {
    return this.http.get<StoredFileInfo>(uriFile.INFO(publicId));
  }

  /** "1.4 MB" — for file chips and upload previews. */
  static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private toProgress(event: HttpEvent<UploadedFile>): UploadProgress {
    if (event.type === HttpEventType.UploadProgress) {
      // `total` is absent when the server does not report a length; showing 0
      // keeps the bar honest rather than jumping to a made-up figure.
      const progress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
      return { progress, file: null };
    }

    if (event instanceof HttpResponse) {
      return { progress: 100, file: event.body };
    }

    return { progress: 0, file: null };
  }

  private saveAs(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    // Released on the next tick: revoking synchronously can cancel the download
    // in Safari before it has read the blob.
    setTimeout(() => URL.revokeObjectURL(url));
  }
}
