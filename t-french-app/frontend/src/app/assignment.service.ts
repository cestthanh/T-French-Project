import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Assignment {
    id: number;
    title: string;
    description?: string;
    dueDate: string;
    course: string;
    courseId: number;
    submissionCount?: number;
    createdAt: string;
}

export interface Submission {
    id: number;
    submittedAt: string;
    grade?: number;
    feedback?: string;
    gradedAt?: string;
    note?: string;
    assignment: string;
    course: string;
    dueDate: string;
}

@Injectable({ providedIn: 'root' })
export class AssignmentService {
    private readonly api = `${environment.apiUrl}/assignments`;

    constructor(private http: HttpClient) { }

    getAll(courseId?: number): Observable<Assignment[]> {
        const params: any = {};
        if (courseId) params['courseId'] = courseId;
        return this.http.get<Assignment[]>(this.api, { params });
    }

    getById(id: number): Observable<any> {
        return this.http.get<any>(`${this.api}/${id}`);
    }

    create(data: { title: string; description?: string; dueDate: string; courseId: number }): Observable<Assignment> {
        return this.http.post<Assignment>(this.api, data);
    }

    update(id: number, data: any): Observable<Assignment> {
        return this.http.put<Assignment>(`${this.api}/${id}`, data);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.api}/${id}`);
    }

    submit(id: number, note?: string): Observable<any> {
        const form = new FormData();
        if (note) form.append('note', note);
        return this.http.post<any>(`${this.api}/${id}/submit`, form);
    }

    grade(assignmentId: number, submissionId: number, grade: number, feedback?: string): Observable<any> {
        return this.http.post<any>(`${this.api}/${assignmentId}/submissions/${submissionId}/grade`, { grade, feedback });
    }

    mySubmissions(): Observable<Submission[]> {
        return this.http.get<Submission[]>(`${this.api}/my-submissions`);
    }
}
