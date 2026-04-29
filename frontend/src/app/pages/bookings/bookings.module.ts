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
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { BookingsComponent } from './bookings.component';
import { AuthGuard } from '../../auth.guard';

@NgModule({
    declarations: [BookingsComponent],
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
        MatSnackBarModule, MatTooltipModule, MatProgressSpinnerModule,
        MatChipsModule, MatTabsModule,
        RouterModule.forChild([
            { path: '', component: BookingsComponent, canActivate: [AuthGuard] },
        ])
    ]
})
export class BookingsModule { }
