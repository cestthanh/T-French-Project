import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface UserProfile {
  id: number; fullName: string; email: string;
  phoneNumber?: string; role: string; avatarUrl?: string; createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = `${environment.apiUrl}/profile`;
  constructor(private http: HttpClient) {}

  get(): Observable<UserProfile> { return this.http.get<UserProfile>(this.api); }

  update(data: { fullName?: string; phoneNumber?: string; avatarUrl?: string }): Observable<any> {
    return this.http.put(this.api, data);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.api}/change-password`, { currentPassword, newPassword });
  }
}
