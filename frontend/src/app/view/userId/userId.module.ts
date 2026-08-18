import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { SignIn } from './signIn/signIn';
import { SignUp } from './signUp/signUp';

@NgModule({
  declarations: [SignIn, SignUp],
  imports: [
    // Auth pages carry their own poster panel — no navbar/footer needed.
    BaseControlModule,
    RouterModule.forChild([
      { path: RouteSegment.empty, redirectTo: RouteSegment.login, pathMatch: 'full' },
      { path: RouteSegment.login, component: SignIn },
      { path: RouteSegment.register, component: SignUp },
    ]),
  ],
})
export class UserIdModule {}
