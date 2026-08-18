import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { AuthGuard } from 'src/app/services/helpers';
import { Admin } from './admin';

@NgModule({
  declarations: [Admin],
  imports: [BaseControlModule, RouterModule.forChild([{ path: RouteSegment.empty, component: Admin, canActivate: [AuthGuard] }])],
})
export class AdminModule {}
