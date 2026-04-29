import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CourseListComponent } from './course-list.component';
import { CourseDetailComponent } from './course-detail.component';

@NgModule({
  declarations: [CourseListComponent, CourseDetailComponent],
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule,
    RouterModule.forChild([
      { path: '',    component: CourseListComponent },
      { path: ':id', component: CourseDetailComponent },
    ])
  ]
})
export class CoursesModule {}
