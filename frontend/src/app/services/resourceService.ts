import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateResourceRequest, Resource } from 'src/app/interface';
import { uriResource } from './Uri/RequestUri/uriResource';

@Injectable({ providedIn: 'root' })
export class ResourceService {
  constructor(private http: HttpClient) {}

  getAll(category?: string): Observable<Resource[]> {
    const params: any = {};
    if (category) params['category'] = category;
    return this.http.get<Resource[]>(uriResource.LIST, { params });
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(uriResource.CATEGORIES);
  }

  create(data: CreateResourceRequest): Observable<Resource> {
    return this.http.post<Resource>(uriResource.CREATE, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(uriResource.DELETE(id));
  }
}
