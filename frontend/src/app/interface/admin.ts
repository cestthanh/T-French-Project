export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalAssignments: number;
  totalSubmissions: number;
  pendingGrading: number;
  totalBookings: number;
  publishedPosts: number;
}

export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AdminBlogPost {
  id: number;
  title: string;
  slug: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  /** Last content edit; absent until the post has been edited. */
  updatedAt?: string;
  author: string;
  tags?: string;
  coverImageUrl?: string;
}

/** What `GET /api/admin/blog/{id}` returns: the list row plus the body fields
 * the list leaves out, because editing needs them and listing does not. */
export interface AdminBlogPostDetail extends AdminBlogPost {
  summary?: string;
  content: string;
}

export interface CreateBlogPostRequest {
  title: string;
  slug: string;
  summary?: string;
  content: string;
  tags?: string;
  coverImageUrl?: string;
  isPublished: boolean;
}

/**
 * `/api/dashboard/stats` returns a different shape per role, so the fields are
 * all optional and the caller branches on `role`.
 */
export interface DashboardStats {
  role: string;
  enrolledCourses?: number;
  pendingAssignments?: number;
  overdueAssignments?: number;
  gradedSubmissions?: number;
  upcomingBookings?: number;
  accessibleResources?: number;
  myCourses?: number;
  totalStudents?: number;
  pendingGrading?: number;
}
