import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BlogListComponent } from './blog-list.component';
import { BlogDetailComponent } from './blog-detail.component';

@NgModule({
    declarations: [BlogListComponent, BlogDetailComponent],
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        RouterModule.forChild([
            { path: '', component: BlogListComponent },
            { path: ':slug', component: BlogDetailComponent },
        ])
    ]
})
export class BlogModule { }
