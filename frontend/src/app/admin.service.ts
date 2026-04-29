import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AdminStats {
    totalUsers: number; totalStudents: number; totalTeachers: number;
    totalCourses: number; totalAssignments: number; totalSubmissions: number;
    pendingGrading: number; totalBookings: number; publishedPosts: number;
}

export interface AdminUser {
    id: number; fullName: string; email: string; role: string;
    phoneNumber?: string; avatarUrl?: string; createdAt: string;
}

export interface AdminBlogPost {
    id: number; title: string; slug: string; isPublished: boolean;
    publishedAt?: string; createdAt: string; author: string;
    tags?: string; coverImageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
    private readonly api = `${environment.apiUrl}/admin`;

    constructor(private http: HttpClient) { }

    getStats(): Observable<AdminStats> {
        return this.http.get<AdminStats>(`${this.api}/stats`);
    }

    getUsers(role?: string, search?: string): Observable<AdminUser[]> {
        const params: any = {};
        if (role) params['role'] = role;
        if (search) params['search'] = search;
        return this.http.get<AdminUser[]>(`${this.api}/users`, { params });
    }

    changeRole(userId: number, role: string): Observable<any> {
        return this.http.put(`${this.api}/users/${userId}/role`, { role });
    }

    deleteUser(userId: number): Observable<void> {
        return this.http.delete<void>(`${this.api}/users/${userId}`);
    }

    getBlogPosts(): Observable<AdminBlogPost[]> {
        return this.http.get<AdminBlogPost[]>(`${this.api}/blog`);
    }

    createBlogPost(data: any): Observable<any> {
        return this.http.post(`${this.api}/blog`, data);
    }

    togglePublish(id: number): Observable<any> {
        return this.http.patch(`${this.api}/blog/${id}/publish`, {});
    }

    deleteBlogPost(id: number): Observable<void> {
        return this.http.delete<void>(`${this.api}/blog/${id}`);
    }
}
