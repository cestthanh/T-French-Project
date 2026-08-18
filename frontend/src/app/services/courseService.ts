import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Course, CourseDetail, CreateCourseRequest } from 'src/app/interface';
import { uriCourse } from './Uri/RequestUri/uriCourse';

@Injectable({ providedIn: 'root' })
export class CourseService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<Course[]> {
    return this.http.get<Course[]>(uriCourse.LIST);
  }

  getById(id: number): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(uriCourse.DETAIL(id));
  }

  getMyCourses(): Observable<any[]> {
    return this.http.get<any[]>(uriCourse.MY_COURSES);
  }

  enroll(id: number): Observable<any> {
    return this.http.post(uriCourse.ENROLL(id), {});
  }

  create(data: CreateCourseRequest): Observable<Course> {
    return this.http.post<Course>(uriCourse.CREATE, data);
  }

  togglePublish(id: number): Observable<any> {
    return this.http.patch(uriCourse.TOGGLE_PUBLISH(id), {});
  }
}
