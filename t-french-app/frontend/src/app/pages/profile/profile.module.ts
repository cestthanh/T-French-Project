import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ProfileComponent } from './profile.component';
import { AuthGuard } from '../../auth.guard';

@NgModule({
  declarations: [ProfileComponent],
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatSnackBarModule,
    RouterModule.forChild([
      { path: '', component: ProfileComponent, canActivate: [AuthGuard] }
    ])
  ]
})
export class ProfileModule {}
