import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/authService';

@Component({
  selector: 'app-register',
  templateUrl: './signUp.html',
})
export class SignUp {
  form: FormGroup;
  loading = false;
  error = '';
  showPass = false;

  readonly stats = [
    { value: '500+', label: 'Học viên' },
    { value: '20+', label: 'Giáo viên' },
    { value: '4.9★', label: 'Đánh giá' },
  ];

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  showError(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.register(this.form.value).subscribe({
      next: res => {
        const target = res.user.role === 'Admin' ? '/dashboard/admin' : '/dashboard';
        this.router.navigate([target]);
      },
      error: err => {
        this.error = err?.error?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.';
        this.loading = false;
      },
    });
  }
}
