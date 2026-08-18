import { Component, HostListener } from '@angular/core';
import { AuthService } from 'src/app/services/authService';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
})
export class Navbar {
  menuOpen = false;

  readonly links = [
    { path: '/home', label: 'Trang chủ', exact: true },
    { path: '/courses', label: 'Khoá học', exact: false },
    { path: '/blog', label: 'Blog', exact: false },
  ];

  constructor(public auth: AuthService) {}

  get initial(): string {
    return (this.auth.currentUser?.fullName ?? 'U')[0].toUpperCase();
  }

  /** Collapse the mobile panel when the viewport grows past the md breakpoint. */
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 768) this.menuOpen = false;
  }
}
