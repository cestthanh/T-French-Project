export interface Assignment {
  id: number;
  title: string;
  description?: string;
  dueDate: string;
  course: string;
  courseId: number;
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
  assignment: string;
  course: string;
  dueDate: string;
}

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  dueDate: string;
  courseId: number;
}
