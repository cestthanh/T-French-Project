import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseControlModule } from 'src/app/components/baseControl/baseControl.module';
import { LearningPage } from './learning';
@NgModule({ declarations: [LearningPage], imports: [BaseControlModule, RouterModule.forChild([{ path: '', component: LearningPage }])] })
export class LearningModule {}
