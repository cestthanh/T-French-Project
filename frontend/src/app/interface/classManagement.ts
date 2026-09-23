export type ClassModality = 'Online' | 'Offline' | 'Hybrid';
export type ClassStatus = 'Draft' | 'Open' | 'InProgress' | 'Completed' | 'Cancelled';
export type EnrollmentStatus = 'Active' | 'Pending' | 'Paused' | 'Completed' | 'Cancelled' | 'Expired';

export interface ManagedCourse {
  id: number;
  title: string;
  level?: string;
  isPublished: boolean;
  price: number;
  enrollmentCount: number;
  classCount: number;
}

export interface ManagedClass {
  id: number;
  name: string;
  courseId: number;
  course: string;
  teacherId: number;
  teacher: string;
  startDate: string;
  endDate?: string;
  capacity: number;
  modality: ClassModality;
  status: ClassStatus;
  scheduleSummary?: string;
  locationOrMeetingUrl?: string;
  enrollmentCount: number;
  pendingCount: number;
}

export interface SaveClassRequest {
  name: string;
  courseId: number;
  teacherId?: number;
  startDate: string;
  endDate?: string;
  capacity: number;
  modality: ClassModality;
  status: ClassStatus;
  scheduleSummary?: string;
  locationOrMeetingUrl?: string;
}

export interface ClassEnrollment {
  id: number;
  studentId: number;
  student: string;
  email: string;
  status: EnrollmentStatus;
  enrolledAt: string;
}
