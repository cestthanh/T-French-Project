import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Assignment, AssignmentStatus, CreateAssignmentRequest, Submission, SubmitAssignmentRequest } from 'src/app/interface';
import { uriAssignment } from './Uri/RequestUri/uriAssignment';

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  constructor(private http: HttpClient) {}

  getAll(courseId?: number): Observable<Assignment[]> {
    const params: any = {};
    if (courseId) params['courseId'] = courseId;
    return this.http.get<Assignment[]>(uriAssignment.LIST, { params });
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(uriAssignment.DETAIL(id));
  }

  create(data: CreateAssignmentRequest): Observable<Assignment> {
    return this.http.post<Assignment>(uriAssignment.CREATE, data);
  }

  update(id: number, data: CreateAssignmentRequest): Observable<Assignment> {
    return this.http.put<Assignment>(uriAssignment.UPDATE(id), data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(uriAssignment.DELETE(id));
  }

  publish(id: number): Observable<{ status: AssignmentStatus }> {
    return this.http.post<{ status: AssignmentStatus }>(uriAssignment.PUBLISH(id), {});
  }

  close(id: number): Observable<{ status: AssignmentStatus }> {
    return this.http.post<{ status: AssignmentStatus }>(uriAssignment.CLOSE(id), {});
  }

  release(id: number, submissionId: number): Observable<unknown> {
    return this.http.post(`${uriAssignment.DETAIL(id)}/submissions/${submissionId}/release`, {});
  }

  grant(id: number, studentId: number, reason: string, cutoffAt: string): Observable<unknown> {
    return this.http.post(`${uriAssignment.DETAIL(id)}/resubmissions`, { studentId, reason, cutoffAt });
  }

  /**
   * Hands in work. The file itself is uploaded separately by `FileService`, so
   * this body only carries the id it came back with — which keeps the endpoint
   * a plain JSON one and lets the upload show its own progress.
   */
  submit(id: number, data: SubmitAssignmentRequest): Observable<any> {
    return this.http.post<any>(uriAssignment.SUBMIT(id), data);
  }

  grade(assignmentId: number, submissionId: number, grade: number, feedback?: string): Observable<any> {
    return this.http.post<any>(uriAssignment.GRADE(assignmentId, submissionId), { grade, feedback });
  }

  mySubmissions(): Observable<Submission[]> {
    return this.http.get<Submission[]>(uriAssignment.MY_SUBMISSIONS);
  }
}
