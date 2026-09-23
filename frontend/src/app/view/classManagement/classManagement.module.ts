import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { ClassManagement } from './classManagement';

@NgModule({
  declarations: [ClassManagement],
  imports: [
    BaseControlModule,
    RouterModule.forChild([{ path: RouteSegment.empty, component: ClassManagement }]),
  ],
})
export class ClassManagementModule {}
