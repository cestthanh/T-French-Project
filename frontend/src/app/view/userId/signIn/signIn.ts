import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/authService';

@Component({
  selector: 'app-login',
  templateUrl: './signIn.html',
})
export class SignIn {
  form: FormGroup;
  loading = false;
  error = '';
  showPass = false;

  readonly perks = [
    { icon: 'clipboard-list', label: 'Bài tập được chấm chi tiết' },
    { icon: 'folder-open', label: 'Kho tài liệu riêng của khoá học' },
    { icon: 'calendar-days', label: 'Đặt lịch luyện nói 1-1' },
  ];

  readonly demoAccounts = [
    { role: 'Admin', email: 'admin@tfrench.vn', password: 'Admin@123', tone: 'danger-soft' as const },
    { role: 'Teacher', email: 'teacher@tfrench.vn', password: 'Teacher@123', tone: 'accent-soft' as const },
    { role: 'Student', email: 'student@tfrench.vn', password: 'Student@123', tone: 'primary-soft' as const },
  ];

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  showError(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  fillDemo(account: { email: string; password: string }): void {
    this.form.patchValue({ email: account.email, password: account.password });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      next: res => {
        const target = res.user.role === 'Admin' ? '/dashboard/admin' : '/dashboard';
        this.router.navigate([target]);
      },
      error: err => {
        this.error = err?.error?.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.';
        this.loading = false;
      },
    });
  }
}
