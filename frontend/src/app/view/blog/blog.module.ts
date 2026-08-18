import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { RouteSegment } from 'src/app/constants/RouterConstant';
import { BlogList } from './blogList/blogList';
import { BlogDetail } from './blogDetail/blogDetail';

@NgModule({
  declarations: [BlogList, BlogDetail],
  imports: [
    SharedModule,
    RouterModule.forChild([
      { path: RouteSegment.empty, component: BlogList },
      { path: RouteSegment.bySlug, component: BlogDetail },
    ]),
  ],
})
export class BlogModule {}
