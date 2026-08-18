import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookingSlot, CreateSlotRequest } from 'src/app/interface';
import { uriBooking } from './Uri/RequestUri/uriBooking';

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(private http: HttpClient) {}

  getSlots(mySlots = false): Observable<BookingSlot[]> {
    return this.http.get<BookingSlot[]>(uriBooking.LIST, { params: { mySlots: String(mySlots) } });
  }

  createSlot(data: CreateSlotRequest): Observable<BookingSlot> {
    return this.http.post<BookingSlot>(uriBooking.CREATE, data);
  }

  book(id: number): Observable<any> {
    return this.http.post<any>(uriBooking.BOOK(id), {});
  }

  cancel(id: number): Observable<any> {
    return this.http.post<any>(uriBooking.CANCEL(id), {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(uriBooking.DELETE(id));
  }
}
