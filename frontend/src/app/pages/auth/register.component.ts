import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
    selector: 'app-register',
    template: `
<div class="auth-page">
  <!-- Left panel: branding -->
  <div class="auth-left">
    <div class="left-inner">
      <div class="auth-logo">
        <svg width="48" height="32" viewBox="0 0 48 32">
          <rect x="0"  width="16" height="32" fill="#002395"/>
          <rect x="16" width="16" height="32" fill="#fff"/>
          <rect x="32" width="16" height="32" fill="#ED2939"/>
        </svg>
        <span>T-French</span>
      </div>
      <h1>Bắt đầu hành trình<br><span>học tiếng Pháp</span></h1>
      <p>Tạo tài khoản miễn phí để truy cập đầy đủ bài tập, tài liệu và đặt lịch học với giáo viên.</p>
      <ul class="perks">
        <li><mat-icon>check_circle</mat-icon> Học liệu phong phú, cập nhật liên tục</li>
        <li><mat-icon>check_circle</mat-icon> Bài tập và phản hồi từ giáo viên</li>
        <li><mat-icon>check_circle</mat-icon> Đặt lịch luyện nói 1-1 linh hoạt</li>
        <li><mat-icon>check_circle</mat-icon> Theo dõi tiến trình học tập</li>
      </ul>
    </div>
    <div class="deco deco-1"></div>
    <div class="deco deco-2"></div>
    <div class="deco deco-3"></div>
  </div>

  <!-- Right panel: form -->
  <div class="auth-right">
    <div class="form-wrap">
      <h2>Tạo tài khoản</h2>
      <p class="form-sub">Miễn phí. Không cần thẻ tín dụng.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Họ và tên</mat-label>
          <input matInput formControlName="fullName" placeholder="Nguyễn Văn A">
          <mat-icon matSuffix>person</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" placeholder="you@example.com">
          <mat-icon matSuffix>email</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Số điện thoại (tuỳ chọn)</mat-label>
          <input matInput formControlName="phoneNumber" placeholder="0901 234 567">
          <mat-icon matSuffix>phone</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Mật khẩu</mat-label>
          <input matInput [type]="showPass ? 'text' : 'password'" formControlName="password">
          <button mat-icon-button matSuffix type="button" (click)="showPass=!showPass">
            <mat-icon>{{ showPass ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-hint>Ít nhất 6 ký tự</mat-hint>
        </mat-form-field>

        <div class="error-msg" *ngIf="error">
          <mat-icon>error_outline</mat-icon> {{ error }}
        </div>

        <button mat-raised-button color="primary" class="submit-btn" type="submit"
                [disabled]="loading || form.invalid">
          <mat-spinner diameter="18" *ngIf="loading"></mat-spinner>
          <span *ngIf="!loading">Tạo tài khoản miễn phí</span>
        </button>
      </form>

      <div class="divider"><span>hoặc</span></div>

      <p class="switch-link">
        Đã có tài khoản? <a routerLink="/auth/login">Đăng nhập →</a>
      </p>
    </div>
  </div>
</div>
    `,
    styles: [`
    .auth-page {
      min-height: 100vh; display: flex; background: #fff;
    }
    .auth-left {
      width: 45%; background: linear-gradient(145deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%);
      position: relative; overflow: hidden; display: flex; align-items: center; padding: 48px;
    }
    @media (max-width: 768px) { .auth-left { display: none; } }
    .left-inner { position: relative; z-index: 2; color: #fff; }
    .auth-logo {
      display: flex; align-items: center; gap: 12px;
      font-size: 1.4rem; font-weight: 800; margin-bottom: 48px;
    }
    .auth-logo svg { border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,.3); }
    .auth-left h1 { font-size: 2.2rem; font-weight: 800; line-height: 1.25; margin-bottom: 16px; }
    .auth-left h1 span { color: #a5d6a7; }
    .auth-left p  { opacity: .85; font-size: .95rem; line-height: 1.7; margin-bottom: 32px; }
    .perks { list-style: none; display: flex; flex-direction: column; gap: 12px; }
    .perks li { display: flex; align-items: center; gap: 10px; font-size: .9rem; opacity: .9; }
    .perks mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: #a5d6a7; }
    .deco { position: absolute; border-radius: 50%; opacity: .08; background: #fff; }
    .deco-1 { width: 300px; height: 300px; top: -80px; right: -80px; }
    .deco-2 { width: 200px; height: 200px; bottom: 40px; right: 40px; }
    .deco-3 { width: 120px; height: 120px; top: 50%; left: -40px; }

    .auth-right {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 40px 32px; background: #fafbff;
    }
    .form-wrap { width: 100%; max-width: 420px; }
    .form-wrap h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 6px; color: #1a1a2e; }
    .form-sub { color: #6c7293; margin-bottom: 20px; font-size: .9rem; }
    .full-w { width: 100%; margin-bottom: 4px; }
    .submit-btn {
      width: 100%; height: 48px; font-size: 1rem; font-weight: 600; margin-top: 12px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      border-radius: 10px !important;
      background: linear-gradient(135deg, #2e7d32, #43a047) !important;
      box-shadow: 0 4px 16px rgba(46,125,50,.35) !important;
      transition: transform .15s !important;
    }
    .submit-btn:not([disabled]):hover { transform: translateY(-1px); }
    .error-msg {
      display: flex; align-items: center; gap: 6px;
      color: #d32f2f; font-size: .85rem; margin-bottom: 8px;
      background: #ffebee; padding: 8px 12px; border-radius: 8px;
    }
    .error-msg mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .divider { position: relative; text-align: center; margin: 20px 0; }
    .divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e2e8f0; }
    .divider span { background: #fafbff; padding: 0 12px; color: #6c7293; font-size: .8rem; position: relative; }
    .switch-link { text-align: center; color: #6c7293; font-size: .9rem; }
    .switch-link a { color: #2e7d32; font-weight: 600; }
    `]
})
export class RegisterComponent {
    form: FormGroup;
    loading = false;
    error = '';
    showPass = false;

    constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
        this.form = this.fb.group({
            fullName:    ['', [Validators.required, Validators.minLength(2)]],
            email:       ['', [Validators.required, Validators.email]],
            phoneNumber: [''],
            password:    ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    onSubmit(): void {
        if (this.form.invalid) return;
        this.loading = true; this.error = '';
        this.auth.register(this.form.value).subscribe({
            next: (res) => {
                const role = res.user.role;
                if (role === 'Admin') this.router.navigate(['/dashboard/admin']);
                else this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.error = err?.error?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.';
                this.loading = false;
            }
        });
    }
}
