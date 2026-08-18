export interface Resource {
  id: number;
  title: string;
  description?: string;
  fileUrl: string;
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
  fileUrl: string;
  fileType?: string;
  category?: string;
  isPublic: boolean;
  courseId?: number;
}
