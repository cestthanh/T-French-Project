import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AdminPageComponent } from './admin-page.component';
import { AuthGuard } from '../../auth.guard';

@NgModule({
    declarations: [AdminPageComponent],
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
        MatSnackBarModule, MatTooltipModule, MatProgressSpinnerModule,
        MatSelectModule, MatTableModule, MatTabsModule, MatSlideToggleModule,
        RouterModule.forChild([
            { path: '', component: AdminPageComponent, canActivate: [AuthGuard] },
        ])
    ]
})
export class AdminModule { }
