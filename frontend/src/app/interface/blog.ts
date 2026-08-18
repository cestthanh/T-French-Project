export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  coverImageUrl?: string;
  tags?: string;
  publishedAt?: string;
  author: string;
}

export interface BlogListResponse {
  total: number;
  page: number;
  pageSize: number;
  posts: BlogPost[];
}
