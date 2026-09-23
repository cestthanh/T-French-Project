export interface Course {
  id: number;
  title: string;
  description?: string;
  level?: string;
  price: number;
  imageUrl?: string;
  teacher: string;
  enrollmentCount: number;
  createdAt: string;
}

export interface CourseDetail extends Course {
  teacherId: number;
  assignmentCount: number;
  resourceCount: number;
  isEnrolled: boolean;
  enrollmentStatus?: 'Active' | 'Pending' | 'Paused' | 'Completed' | 'Cancelled' | 'Expired';
  classes: CourseClassSummary[];
}

export interface CourseClassSummary {
  id: number;
  name: string;
  startDate: string;
  endDate?: string;
  capacity: number;
  modality: 'Online' | 'Offline' | 'Hybrid';
  scheduleSummary?: string;
  teacher: string;
  enrollmentCount: number;
}

export interface CreateCourseRequest {
  title: string;
  description?: string;
  level?: string;
  price?: number;
  imageUrl?: string;
  teacherId?: number;
}
