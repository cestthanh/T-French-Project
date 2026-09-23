import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClassEnrollment, EnrollmentStatus, ManagedClass, SaveClassRequest } from 'src/app/interface';
import { uriConfig } from './Uri/uriConfig';

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly base = uriConfig.CLASS;

  constructor(private http: HttpClient) {}

  getManaged(courseId?: number): Observable<ManagedClass[]> {
    return this.http.get<ManagedClass[]>(`${this.base}/my`, {
      params: courseId ? { courseId } : {},
    });
  }

  create(data: SaveClassRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, data);
  }

  update(id: number, data: SaveClassRequest): Observable<unknown> {
    return this.http.put(`${this.base}/${id}`, data);
  }

  getEnrollments(classId: number): Observable<ClassEnrollment[]> {
    return this.http.get<ClassEnrollment[]>(`${this.base}/${classId}/enrollments`);
  }

  setEnrollmentStatus(enrollmentId: number, status: EnrollmentStatus): Observable<unknown> {
    return this.http.patch(`${this.base}/enrollments/${enrollmentId}/status`, { status });
  }

  addEnrollment(classId: number, studentId: number, status: EnrollmentStatus = 'Active'): Observable<unknown> {
    return this.http.post(`${this.base}/${classId}/enrollments`, { studentId, status });
  }
}
