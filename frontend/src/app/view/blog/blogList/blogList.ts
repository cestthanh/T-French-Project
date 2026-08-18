import { Component, OnInit } from '@angular/core';
import { BlogService } from 'src/app/services/blogService';
import { BlogPost } from 'src/app/interface';

@Component({
  selector: 'app-blog-list',
  templateUrl: './blogList.html',
})
export class BlogList implements OnInit {
  posts: BlogPost[] = [];
  loading = true;
  page = 1;
  totalPages = 1;
  activeTag: string | null = null;
  allTags: string[] = [];

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  constructor(private blogService: BlogService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.blogService.getPosts(this.page, 9, this.activeTag ?? undefined).subscribe({
      next: res => {
        this.posts = res.posts;
        this.totalPages = Math.ceil(res.total / res.pageSize);
        const tags = new Set<string>();
        res.posts.forEach(p => this.getTags(p.tags ?? '').forEach(t => tags.add(t)));
        this.allTags = [...tags];
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  filterByTag(tag: string | null): void { this.activeTag = tag; this.page = 1; this.load(); }

  changePage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.load();
  }

  getTags(tags: string): string[] {
    return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  }
}
