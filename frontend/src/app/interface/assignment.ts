import { StoredFileInfo } from './file';

export interface Assignment {
  id: number;
  title: string;
  description?: string;
  dueDate: string;
  course: string;
  courseId: number;
  /** External link to the brief. */
  attachmentUrl?: string;
  /** Uploaded brief. */
  attachment?: StoredFileInfo;
  submissionCount?: number;
  createdAt: string;
}

export interface Submission {
  id: number;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  note?: string;
  fileUrl?: string;
  file?: StoredFileInfo;
  assignment: string;
  course: string;
  dueDate: string;
}

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  dueDate: string;
  courseId: number;
  attachmentUrl?: string;
  attachmentId?: number;
}

/** Body of `POST /api/assignments/{id}/submit`. */
export interface SubmitAssignmentRequest {
  fileId?: number;
  fileUrl?: string;
  note?: string;
}
