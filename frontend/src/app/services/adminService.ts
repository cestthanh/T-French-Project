import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminBlogPost, AdminStats, AdminUser, CreateBlogPostRequest } from 'src/app/interface';
import { uriAdmin } from './Uri/RequestUri/uriAdmin';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(uriAdmin.STATS);
  }

  getUsers(role?: string, search?: string): Observable<AdminUser[]> {
    const params: any = {};
    if (role) params['role'] = role;
    if (search) params['search'] = search;
    return this.http.get<AdminUser[]>(uriAdmin.USERS, { params });
  }

  changeRole(userId: number, role: string): Observable<any> {
    return this.http.put(uriAdmin.CHANGE_ROLE(userId), { role });
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(uriAdmin.DELETE_USER(userId));
  }

  getBlogPosts(): Observable<AdminBlogPost[]> {
    return this.http.get<AdminBlogPost[]>(uriAdmin.BLOG);
  }

  createBlogPost(data: CreateBlogPostRequest): Observable<any> {
    return this.http.post(uriAdmin.BLOG, data);
  }

  togglePublish(id: number): Observable<any> {
    return this.http.patch(uriAdmin.TOGGLE_PUBLISH(id), {});
  }

  deleteBlogPost(id: number): Observable<void> {
    return this.http.delete<void>(uriAdmin.DELETE_BLOG(id));
  }
}
