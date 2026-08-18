import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BlogListResponse, BlogPost } from 'src/app/interface';
import { PageSize } from 'src/app/constants/enum';
import { uriBlog } from './Uri/RequestUri/uriBlog';

@Injectable({ providedIn: 'root' })
export class BlogService {
  constructor(private http: HttpClient) {}

  getPosts(page = 1, pageSize = PageSize.blog, tag?: string): Observable<BlogListResponse> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (tag) params = params.set('tag', tag);
    return this.http.get<BlogListResponse>(uriBlog.LIST, { params });
  }

  getBySlug(slug: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(uriBlog.DETAIL_BY_SLUG(slug));
  }
}
