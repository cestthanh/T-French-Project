import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { AuthGuard } from 'src/app/services/helpers';
import { AssignmentList } from './assignmentList/assignmentList';
import { AssignmentDetail } from './assignmentDetail/assignmentDetail';

@NgModule({
  declarations: [AssignmentList, AssignmentDetail],
  imports: [
    BaseControlModule,
    RouterModule.forChild([
      { path: RouteSegment.empty, component: AssignmentList, canActivate: [AuthGuard] },
      { path: RouteSegment.byId, component: AssignmentDetail, canActivate: [AuthGuard] },
    ]),
  ],
})
export class AssignmentModule {}
