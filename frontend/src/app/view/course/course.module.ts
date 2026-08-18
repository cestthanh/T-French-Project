import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { CourseList } from './courseList/courseList';
import { CourseDetail } from './courseDetail/courseDetail';

@NgModule({
  declarations: [CourseList, CourseDetail],
  imports: [
    SharedModule,
    RouterModule.forChild([
      { path: RouteSegment.empty, component: CourseList },
      { path: RouteSegment.byId, component: CourseDetail },
    ]),
  ],
})
export class CourseModule {}
