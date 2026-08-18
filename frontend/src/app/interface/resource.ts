import { StoredFileInfo } from './file';

export interface Resource {
  id: number;
  title: string;
  description?: string;
  /** External link. Set only when the material was not uploaded. */
  fileUrl?: string;
  /** Uploaded copy. Set only when there is no external link. */
  file?: StoredFileInfo;
  fileType?: string;
  category?: string;
  isPublic: boolean;
  createdAt: string;
  uploadedBy: string;
  courseId?: number;
}

export interface CreateResourceRequest {
  title: string;
  description?: string;
  /** Supply exactly one of these two. */
  fileUrl?: string;
  fileId?: number;
  fileType?: string;
  category?: string;
  isPublic: boolean;
  courseId?: number;
}
