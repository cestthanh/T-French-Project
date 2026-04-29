import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
    selector: 'app-login',
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
      <h1>Học tiếng Pháp<br><span>cùng chuyên gia</span></h1>
      <p>Nền tảng học tập hiện đại với bài tập, tài liệu và lịch luyện nói 1-1 linh hoạt.</p>
      <div class="left-stats">
        <div class="stat"><strong>500+</strong><span>Học viên</span></div>
        <div class="stat"><strong>20+</strong><span>Giáo viên</span></div>
        <div class="stat"><strong>DELF</strong><span>Chứng chỉ</span></div>
      </div>
    </div>
    <!-- Decorative circles -->
    <div class="deco deco-1"></div>
    <div class="deco deco-2"></div>
    <div class="deco deco-3"></div>
  </div>

  <!-- Right panel: form -->
  <div class="auth-right">
    <div class="form-wrap">
      <h2>Đăng nhập</h2>
      <p class="form-sub">Chào mừng trở lại! Vui lòng nhập thông tin của bạn.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" placeholder="you@example.com">
          <mat-icon matSuffix>email</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Mật khẩu</mat-label>
          <input matInput [type]="showPass ? 'text' : 'password'" formControlName="password">
          <button mat-icon-button matSuffix type="button" (click)="showPass=!showPass">
            <mat-icon>{{ showPass ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>

        <div class="error-msg" *ngIf="error">
          <mat-icon>error_outline</mat-icon> {{ error }}
        </div>

        <button mat-raised-button color="primary" class="submit-btn" type="submit"
                [disabled]="loading || form.invalid">
          <mat-spinner diameter="18" *ngIf="loading"></mat-spinner>
          <span *ngIf="!loading">Đăng nhập</span>
        </button>
      </form>

      <div class="divider"><span>hoặc</span></div>

      <p class="switch-link">
        Chưa có tài khoản?
        <a routerLink="/auth/register">Đăng ký miễn phí →</a>
      </p>

      <!-- Demo accounts hint -->
      <div class="demo-hint">
        <p>🧪 <strong>Demo accounts:</strong></p>
        <p>admin&#64;tfrench.vn / Admin&#64;123</p>
        <p>student&#64;tfrench.vn / Student&#64;123</p>
      </div>
    </div>
  </div>
</div>
    `,
    styles: [`
    .auth-page {
      min-height: 100vh; display: flex;
      background: #fff; font-family: 'Inter', sans-serif;
    }

    /* ── Left branding panel ── */
    .auth-left {
      width: 45%; background: linear-gradient(145deg, #1a237e 0%, #283593 40%, #3949ab 100%);
      position: relative; overflow: hidden; display: flex; align-items: center;
      padding: 48px;
    }
    @media (max-width: 768px) { .auth-left { display: none; } }

    .left-inner { position: relative; z-index: 2; color: #fff; }

    .auth-logo {
      display: flex; align-items: center; gap: 12px;
      font-size: 1.4rem; font-weight: 800; margin-bottom: 48px;
    }
    .auth-logo svg { border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,.3); }

    .auth-left h1 {
      font-size: 2.4rem; font-weight: 800; line-height: 1.2;
      margin-bottom: 16px; color: #fff;
    }
    .auth-left h1 span { color: #ffb300; }
    .auth-left p { opacity: .8; font-size: 1rem; line-height: 1.7; margin-bottom: 40px; max-width: 340px; }

    .left-stats { display: flex; gap: 32px; }
    .stat { display: flex; flex-direction: column; }
    .stat strong { font-size: 1.5rem; font-weight: 800; }
    .stat span   { font-size: .8rem; opacity: .7; }

    /* Decorative circles */
    .deco { position: absolute; border-radius: 50%; opacity: .08; background: #fff; }
    .deco-1 { width: 300px; height: 300px; top: -80px; right: -80px; }
    .deco-2 { width: 200px; height: 200px; bottom: 60px; right: 40px; }
    .deco-3 { width: 120px; height: 120px; top: 50%; left: -40px; }

    /* ── Right form panel ── */
    .auth-right {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 40px 32px; background: #fafbff;
    }
    .form-wrap { width: 100%; max-width: 400px; }
    .form-wrap h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 6px; color: #1a1a2e; }
    .form-sub { color: #6c7293; margin-bottom: 28px; font-size: .9rem; }

    .full-w { width: 100%; margin-bottom: 4px; }
    .submit-btn {
      width: 100%; height: 48px; font-size: 1rem; font-weight: 600;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 8px; border-radius: 10px !important;
      background: linear-gradient(135deg, #3949ab, #5c6bc0) !important;
      box-shadow: 0 4px 16px rgba(57,73,171,.35) !important;
      transition: transform .15s, box-shadow .15s !important;
    }
    .submit-btn:not([disabled]):hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(57,73,171,.45) !important; }

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
    .switch-link a { color: #3949ab; font-weight: 600; }

    .demo-hint {
      margin-top: 20px; background: #f0f4ff; border: 1px solid #c5cae9;
      border-radius: 10px; padding: 12px 16px; font-size: .78rem; color: #455a64;
      line-height: 1.8;
    }
    .demo-hint p { margin: 0; }
    `]
})
export class LoginComponent {
    form: FormGroup;
    loading = false;
    error = '';
    showPass = false;

    constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    onSubmit(): void {
        if (this.form.invalid) return;
        this.loading = true; this.error = '';
        const { email, password } = this.form.value;
        this.auth.login(email, password).subscribe({
            next: (res) => {
                const role = res.user.role;
                if (role === 'Admin') this.router.navigate(['/dashboard/admin']);
                else this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.error = err?.error?.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.';
                this.loading = false;
            }
        });
    }
}
