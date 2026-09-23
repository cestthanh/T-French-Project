import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BlogService } from 'src/app/services/blogService';
import { BlogPost } from 'src/app/interface';

@Component({
    selector: 'app-blog-detail',
    templateUrl: './blogDetail.html',
    styleUrls: ['./blogDetail.scss'],
    standalone: false
})
export class BlogDetail implements OnInit {
  post: BlogPost | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private blogService: BlogService,
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.blogService.getBySlug(slug).subscribe({
      next: post => { this.post = post; this.loading = false; },
      error: () => { this.post = null; this.loading = false; },
    });
  }

  getTags(tags: string): string[] {
    return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  }
}
