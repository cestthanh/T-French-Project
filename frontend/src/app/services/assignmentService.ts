import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Assignment, CreateAssignmentRequest, Submission } from 'src/app/interface';
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

  update(id: number, data: any): Observable<Assignment> {
    return this.http.put<Assignment>(uriAssignment.UPDATE(id), data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(uriAssignment.DELETE(id));
  }

  submit(id: number, note?: string): Observable<any> {
    const form = new FormData();
    if (note) form.append('note', note);
    return this.http.post<any>(uriAssignment.SUBMIT(id), form);
  }

  grade(assignmentId: number, submissionId: number, grade: number, feedback?: string): Observable<any> {
    return this.http.post<any>(uriAssignment.GRADE(assignmentId, submissionId), { grade, feedback });
  }

  mySubmissions(): Observable<Submission[]> {
    return this.http.get<Submission[]>(uriAssignment.MY_SUBMISSIONS);
  }
}
