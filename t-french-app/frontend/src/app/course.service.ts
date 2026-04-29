import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Course {
  id: number; title: string; description?: string;
  level?: string; price: number; imageUrl?: string;
  teacher: string; enrollmentCount: number; createdAt: string;
}

export interface CourseDetail extends Course {
  teacherId: number; assignmentCount: number;
  resourceCount: number; isEnrolled: boolean;
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly api = `${environment.apiUrl}/courses`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<Course[]>           { return this.http.get<Course[]>(this.api); }
  getById(id: number): Observable<CourseDetail> { return this.http.get<CourseDetail>(`${this.api}/${id}`); }
  getMyCourses(): Observable<any[]>        { return this.http.get<any[]>(`${this.api}/my`); }
  enroll(id: number): Observable<any>      { return this.http.post(`${this.api}/${id}/enroll`, {}); }
  create(data: any): Observable<Course>    { return this.http.post<Course>(this.api, data); }
  togglePublish(id: number): Observable<any> { return this.http.patch(`${this.api}/${id}/publish`, {}); }
}
