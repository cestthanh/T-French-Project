import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { AuthGuard } from 'src/app/services/helpers';
import { UserRole } from 'src/app/constants/enum';
import { Dashboard } from './dashboard';

@NgModule({
  declarations: [Dashboard],
  imports: [
    BaseControlModule,
    RouterModule.forChild([
      {
        path: RouteSegment.empty,
        component: Dashboard,
        canActivate: [AuthGuard],
        children: [
          { path: RouteSegment.assignments, loadChildren: () => import('../assignment/assignment.module').then(m => m.AssignmentModule) },
          { path: RouteSegment.resources, loadChildren: () => import('../resource/resource.module').then(m => m.ResourceModule) },
          { path: RouteSegment.bookings, loadChildren: () => import('../booking/booking.module').then(m => m.BookingModule) },
          { path: RouteSegment.admin, loadChildren: () => import('../admin/admin.module').then(m => m.AdminModule), data: { roles: [UserRole.Admin] } },
          { path: RouteSegment.profile, loadChildren: () => import('../profile/profile.module').then(m => m.ProfileModule) },
        ],
      },
    ]),
  ],
})
export class DashboardModule {}
