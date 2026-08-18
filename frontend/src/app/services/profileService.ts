import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UpdateProfileRequest, UserProfile } from 'src/app/interface';
import { uriProfile } from './Uri/RequestUri/uriProfile';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient) {}

  get(): Observable<UserProfile> {
    return this.http.get<UserProfile>(uriProfile.GET);
  }

  update(data: UpdateProfileRequest): Observable<any> {
    return this.http.put(uriProfile.UPDATE, data);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(uriProfile.CHANGE_PASSWORD, { currentPassword, newPassword });
  }
}
