import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { AuthGuard } from 'src/app/services/helpers';
import { Profile } from './profile';

@NgModule({
  declarations: [Profile],
  imports: [BaseControlModule, RouterModule.forChild([{ path: RouteSegment.empty, component: Profile, canActivate: [AuthGuard] }])],
})
export class ProfileModule {}
