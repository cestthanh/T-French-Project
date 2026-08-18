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
}

export interface CreateCourseRequest {
  title: string;
  description?: string;
  level?: string;
  price?: number;
  imageUrl?: string;
}
