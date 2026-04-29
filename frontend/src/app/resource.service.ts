import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class ResourceService {
    private readonly api = `${environment.apiUrl}/resources`;

    constructor(private http: HttpClient) { }

    getAll(category?: string): Observable<Resource[]> {
        const params: any = {};
        if (category) params['category'] = category;
        return this.http.get<Resource[]>(this.api, { params });
    }

    getCategories(): Observable<string[]> {
        return this.http.get<string[]>(`${this.api}/categories`);
    }

    create(data: {
        title: string; description?: string; fileUrl: string;
        fileType?: string; category?: string; isPublic: boolean; courseId?: number;
    }): Observable<Resource> {
        return this.http.post<Resource>(this.api, data);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.api}/${id}`);
    }
}
