import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class BlogService {
    private readonly api = `${environment.apiUrl}/blog`;

    constructor(private http: HttpClient) { }

    getPosts(page = 1, pageSize = 9, tag?: string): Observable<BlogListResponse> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (tag) params = params.set('tag', tag);
        return this.http.get<BlogListResponse>(this.api, { params });
    }

    getBySlug(slug: string): Observable<BlogPost> {
        return this.http.get<BlogPost>(`${this.api}/${slug}`);
    }
}
