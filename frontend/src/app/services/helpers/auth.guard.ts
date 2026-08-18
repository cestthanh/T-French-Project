import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { RouterConstant } from 'src/app/constants/RouterConstant';
import { AuthService } from '../authService';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.auth.isLoggedIn) {
      this.router.navigate(['/' + RouterConstant.signIn]);
      return false;
    }

    const roles: string[] = route.data['roles'] ?? [];
    if (roles.length > 0 && !roles.includes(this.auth.currentUser?.role ?? '')) {
      this.router.navigate(['/' + RouterConstant.dashboard]);
      return false;
    }

    return true;
  }
}
