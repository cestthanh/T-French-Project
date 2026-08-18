import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContactLead, CreateLeadRequest, LeadStats, LeadStatus } from 'src/app/interface';
import { uriLead } from './Uri/RequestUri/uriLead';

/**
 * Study-abroad and course enquiries.
 *
 * `create` is the one call in the app that works without a token — it is what
 * the landing page's contact form posts to.
 */
@Injectable({ providedIn: 'root' })
export class LeadService {
  constructor(private http: HttpClient) {}

  create(data: CreateLeadRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(uriLead.CREATE, data);
  }

  getAll(status?: LeadStatus, search?: string): Observable<ContactLead[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    if (search) params['search'] = search;
    return this.http.get<ContactLead[]>(uriLead.LIST, { params });
  }

  getStats(): Observable<LeadStats> {
    return this.http.get<LeadStats>(uriLead.STATS);
  }

  update(id: number, changes: { status?: LeadStatus; note?: string }): Observable<ContactLead> {
    return this.http.patch<ContactLead>(uriLead.UPDATE(id), changes);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(uriLead.DELETE(id));
  }
}
