import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RouterConstant, RouteSegment } from './constants/RouterConstant';
import { AuthGuard } from './services/helpers';
import { NotFound } from './view/notFound/notFound';

/**
 * Feature areas stay lazy-loaded: the initial bundle is 417 kB today and
 * eager-importing every view module would undo that for no visual gain.
 */
const routes: Routes = [
  { path: RouteSegment.empty, redirectTo: '/' + RouterConstant.home, pathMatch: 'full' },

  { path: RouterConstant.home, loadChildren: () => import('./view/home/home.module').then(m => m.HomeModule) },
  { path: RouterConstant.courses, loadChildren: () => import('./view/course/course.module').then(m => m.CourseModule) },
  { path: RouterConstant.blog, loadChildren: () => import('./view/blog/blog.module').then(m => m.BlogModule) },
  { path: RouterConstant.auth, loadChildren: () => import('./view/userId/userId.module').then(m => m.UserIdModule) },
  {
    path: RouterConstant.dashboard,
    loadChildren: () => import('./view/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard],
  },

  { path: RouteSegment.wildcard, component: NotFound },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
