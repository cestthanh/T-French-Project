import { StoredFileInfo } from './file';

export type AssignmentStatus = 'Draft' | 'Published' | 'Closed';

export interface Assignment {
  id: number;
  title: string;
  description?: string;
  dueDate: string;
  openAt?: string;
  cutoffAt?: string;
  status: AssignmentStatus;
  course: string;
  courseId: number;
  classId?: number;
  className?: string;
  /** External link to the brief. */
  attachmentUrl?: string;
  /** Uploaded brief. */
  attachment?: StoredFileInfo;
  submissionCount?: number;
  createdAt: string;
}

export interface Submission {
  id: number;
  attemptNumber: number;
  isLate?: boolean;
  releasedAt?: string;
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
  openAt?: string;
  cutoffAt?: string;
}

export interface CreateAssignmentRequest {
  allowLate?: boolean;
  title: string;
  description?: string;
  dueDate: string;
  openAt?: string;
  cutoffAt?: string;
  courseId: number;
  classId?: number;
  attachmentUrl?: string;
  attachmentId?: number;
}

/** Body of `POST /api/assignments/{id}/submit`. */
export interface SubmitAssignmentRequest {
  attemptNumber?: number;
  fileId?: number;
  fileUrl?: string;
  note?: string;
}
