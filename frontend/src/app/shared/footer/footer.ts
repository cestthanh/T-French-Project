import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
})
export class Footer {
  readonly year = new Date().getFullYear();

  readonly navLinks = [
    { path: '/home', label: 'Trang chủ' },
    { path: '/courses', label: 'Khoá học' },
    { path: '/blog', label: 'Blog' },
    { path: '/auth/register', label: 'Đăng ký' },
  ];
}
