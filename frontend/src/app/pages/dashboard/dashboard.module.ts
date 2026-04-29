import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardComponent } from './dashboard.component';
import { AuthGuard } from '../../auth.guard';

@NgModule({
    declarations: [DashboardComponent],
    imports: [
        CommonModule,
        RouterModule,
        MatSidenavModule, MatListModule, MatIconModule,
        MatButtonModule, MatCardModule, MatProgressSpinnerModule,
        RouterModule.forChild([
            {
                path: '',
                component: DashboardComponent,
                canActivate: [AuthGuard],
                children: [
                    { path: 'assignments', loadChildren: () => import('../assignments/assignments.module').then(m => m.AssignmentsModule) },
                    { path: 'resources',   loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule) },
                    { path: 'bookings',    loadChildren: () => import('../bookings/bookings.module').then(m => m.BookingsModule) },
                    { path: 'admin',       loadChildren: () => import('../admin/admin.module').then(m => m.AdminModule), data: { roles: ['Admin'] } },
                    { path: 'profile',     loadChildren: () => import('../profile/profile.module').then(m => m.ProfileModule) },
                ]
            },
        ])
    ]
})
export class DashboardModule { }
