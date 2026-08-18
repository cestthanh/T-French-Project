import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { Home } from './home';

@NgModule({
  declarations: [Home],
  imports: [SharedModule, RouterModule.forChild([{ path: RouteSegment.empty, component: Home }])],
})
export class HomeModule {}
