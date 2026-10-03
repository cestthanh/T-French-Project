import { NgModule } from '@angular/core';
import { CanDeactivateFn, RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { AuthGuard } from 'src/app/services/helpers';
import { AssignmentList } from './assignmentList/assignmentList';
import { AssignmentDetail } from './assignmentDetail/assignmentDetail';

const canLeaveAssignment: CanDeactivateFn<AssignmentDetail> = component => component.canLeave();

@NgModule({
  declarations: [AssignmentList, AssignmentDetail],
  imports: [
    BaseControlModule,
    RouterModule.forChild([
      { path: RouteSegment.empty, component: AssignmentList, canActivate: [AuthGuard] },
      { path: RouteSegment.byId, component: AssignmentDetail, canActivate: [AuthGuard], canDeactivate: [canLeaveAssignment] },
    ]),
  ],
})
export class AssignmentModule {}
