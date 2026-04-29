import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(private auth: AuthService, private router: Router) { }

    canActivate(route: ActivatedRouteSnapshot): boolean {
        if (!this.auth.isLoggedIn) {
            this.router.navigate(['/auth/login']);
            return false;
        }
        const roles: string[] = route.data['roles'] ?? [];
        if (roles.length > 0 && !roles.includes(this.auth.currentUser?.role ?? '')) {
            this.router.navigate(['/dashboard']);
            return false;
        }
        return true;
    }
}
