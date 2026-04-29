import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AssignmentsListComponent } from './assignments-list.component';
import { AssignmentDetailComponent } from './assignment-detail.component';
import { AuthGuard } from '../../auth.guard';

@NgModule({
    declarations: [AssignmentsListComponent, AssignmentDetailComponent],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
        MatChipsModule, MatDialogModule, MatSnackBarModule,
        MatTooltipModule, MatProgressSpinnerModule, MatSelectModule, MatTableModule,
        RouterModule.forChild([
            { path: '', component: AssignmentsListComponent, canActivate: [AuthGuard] },
            { path: ':id', component: AssignmentDetailComponent, canActivate: [AuthGuard] },
        ])
    ]
})
export class AssignmentsModule { }
