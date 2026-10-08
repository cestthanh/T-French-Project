import { NgModule } from '@angular/core';
import { CanDeactivateFn, RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { LinkifyPipe } from './linkify.pipe';
import { QuizPage } from './quiz';

const canLeaveQuiz: CanDeactivateFn<QuizPage> = component => component.canLeave();

@NgModule({
  declarations: [QuizPage],
  imports: [BaseControlModule, LinkifyPipe, RouterModule.forChild([{
    path: RouteSegment.empty, component: QuizPage, canDeactivate: [canLeaveQuiz],
  }])],
})
export class QuizModule {}
