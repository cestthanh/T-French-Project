import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { QuizPage } from './quiz';

@NgModule({
  declarations: [QuizPage],
  imports: [BaseControlModule, RouterModule.forChild([{ path: RouteSegment.empty, component: QuizPage }])],
})
export class QuizModule {}
