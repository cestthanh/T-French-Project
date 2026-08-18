import { Component, OnInit } from '@angular/core';
import { CourseService } from 'src/app/services/courseService';
import { Course } from 'src/app/interface';

@Component({
  selector: 'app-course-list',
  templateUrl: './courseList.html',
})
export class CourseList implements OnInit {
  courses: Course[] = [];
  loading = true;
  search = '';

  readonly levels = ['A1 — Cơ bản', 'A2 — Sơ cấp', 'B1 — Trung cấp', 'B2 — Cao cấp', 'DELF/DALF'];

  get filtered(): Course[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.courses;
    return this.courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.teacher.toLowerCase().includes(q) ||
      c.level?.toLowerCase().includes(q),
    );
  }

  constructor(private courseService: CourseService) {}

  ngOnInit(): void {
    this.courseService.getAll().subscribe({
      next: courses => { this.courses = courses; this.loading = false; },
      error: () => (this.loading = false),
    });
  }
}
