import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ResourcesListComponent } from './resources-list.component';
import { AuthGuard } from '../../auth.guard';

@NgModule({
    declarations: [ResourcesListComponent],
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule,
        RouterModule,
        MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
        MatChipsModule, MatSnackBarModule, MatTooltipModule,
        MatProgressSpinnerModule, MatSelectModule,
        RouterModule.forChild([
            { path: '', component: ResourcesListComponent, canActivate: [AuthGuard] },
        ])
    ]
})
export class ResourcesModule { }
