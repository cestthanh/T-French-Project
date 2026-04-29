import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface BookingSlot {
    id: number;
    startTime: string;
    endTime: string;
    isBooked: boolean;
    notes?: string;
    teacher: string;
    teacherId: number;
    student?: string;
    studentId?: number;
    course?: string;
    courseId?: number;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
    private readonly api = `${environment.apiUrl}/bookings`;

    constructor(private http: HttpClient) { }

    getSlots(mySlots = false): Observable<BookingSlot[]> {
        return this.http.get<BookingSlot[]>(this.api, { params: { mySlots: String(mySlots) } });
    }

    createSlot(data: { startTime: string; endTime: string; courseId: number }): Observable<BookingSlot> {
        return this.http.post<BookingSlot>(this.api, data);
    }

    book(id: number): Observable<any> {
        return this.http.post<any>(`${this.api}/${id}/book`, {});
    }

    cancel(id: number): Observable<any> {
        return this.http.post<any>(`${this.api}/${id}/cancel`, {});
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.api}/${id}`);
    }
}
