import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileService, UserProfile } from '../../profile.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-profile',
  template: `
<div class="profile-wrap">
  <h2 class="page-title"><mat-icon>manage_accounts</mat-icon> Hồ sơ của tôi</h2>

  <div class="profile-grid">
    <!-- Avatar + info card -->
    <mat-card class="avatar-card">
      <div class="big-avatar">{{ initial }}</div>
      <h3>{{ profile?.fullName }}</h3>
      <span class="role-chip {{ profile?.role?.toLowerCase() }}">{{ profile?.role }}</span>
      <p class="email">{{ profile?.email }}</p>
      <p class="since">Tham gia: {{ profile?.createdAt | date:'dd/MM/yyyy' }}</p>
    </mat-card>

    <!-- Edit profile form -->
    <mat-card class="edit-card">
      <h3><mat-icon>edit</mat-icon> Chỉnh sửa thông tin</h3>
      <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()">
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Họ và tên</mat-label>
          <input matInput formControlName="fullName">
          <mat-icon matSuffix>person</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Số điện thoại</mat-label>
          <input matInput formControlName="phoneNumber">
          <mat-icon matSuffix>phone</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>URL ảnh đại diện</mat-label>
          <input matInput formControlName="avatarUrl" placeholder="https://...">
          <mat-icon matSuffix>image</mat-icon>
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit" [disabled]="profileSaving || profileForm.invalid">
          {{ profileSaving ? 'Đang lưu...' : 'Lưu thay đổi' }}
        </button>
      </form>
    </mat-card>

    <!-- Change password -->
    <mat-card class="password-card">
      <h3><mat-icon>lock</mat-icon> Đổi mật khẩu</h3>
      <form [formGroup]="pwForm" (ngSubmit)="onChangePassword()">
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Mật khẩu hiện tại</mat-label>
          <input matInput [type]="showCurrent ? 'text' : 'password'" formControlName="currentPassword">
          <button mat-icon-button matSuffix type="button" (click)="showCurrent=!showCurrent">
            <mat-icon>{{ showCurrent ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Mật khẩu mới</mat-label>
          <input matInput [type]="showNew ? 'text' : 'password'" formControlName="newPassword">
          <button mat-icon-button matSuffix type="button" (click)="showNew=!showNew">
            <mat-icon>{{ showNew ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-hint>Ít nhất 6 ký tự</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-w">
          <mat-label>Nhập lại mật khẩu mới</mat-label>
          <input matInput [type]="showNew ? 'text' : 'password'" formControlName="confirmPassword">
        </mat-form-field>
        <div class="pw-error" *ngIf="pwForm.errors?.['mismatch'] && pwForm.touched">Mật khẩu không khớp</div>
        <button mat-raised-button color="warn" type="submit" [disabled]="pwSaving || pwForm.invalid">
          {{ pwSaving ? 'Đang đổi...' : 'Đổi mật khẩu' }}
        </button>
      </form>
    </mat-card>
  </div>
</div>
  `,
  styles: [`
    .profile-wrap { padding:0 0 32px; }
    .page-title { display:flex; align-items:center; gap:8px; font-size:1.3rem; font-weight:700; margin-bottom:24px; }
    .profile-grid { display:grid; grid-template-columns:1fr 2fr; gap:20px; align-items:start; }
    @media (max-width:768px) { .profile-grid { grid-template-columns:1fr; } }

    .avatar-card { text-align:center; padding:28px 20px; }
    .big-avatar { width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg,#3949ab,#5c6bc0); color:#fff; font-size:2rem; font-weight:800; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
    .avatar-card h3 { font-size:1.15rem; font-weight:700; margin:0 0 8px; }
    .role-chip { font-size:.75rem; font-weight:700; padding:4px 12px; border-radius:10px; display:inline-block; margin-bottom:10px; }
    .role-chip.admin   { background:#e8f5e9; color:#2e7d32; }
    .role-chip.teacher { background:#fff3e0; color:#e65100; }
    .role-chip.student { background:#e3f2fd; color:#1565c0; }
    .email { color:var(--text-muted); font-size:.9rem; margin:4px 0; }
    .since { color:var(--text-muted); font-size:.8rem; }

    .edit-card, .password-card { padding:24px; }
    .edit-card h3, .password-card h3 { display:flex; align-items:center; gap:6px; font-weight:700; margin-bottom:16px; }
    .full-w { width:100%; margin-bottom:8px; }
    .pw-error { color:#d32f2f; font-size:.82rem; margin-bottom:8px; }

    .password-card { grid-column:2; }
    @media (max-width:768px) { .password-card { grid-column:1; } }
  `]
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  profileForm: FormGroup;
  pwForm: FormGroup;
  profileSaving = false;
  pwSaving = false;
  showCurrent = false;
  showNew = false;

  get initial(): string { return (this.profile?.fullName ?? 'U')[0].toUpperCase(); }

  constructor(
    private profileService: ProfileService,
    private auth: AuthService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      fullName:    ['', Validators.required],
      phoneNumber: [''],
      avatarUrl:   ['']
    });
    this.pwForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.matchPasswords });
  }

  matchPasswords(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  ngOnInit() {
    this.profileService.get().subscribe({
      next: p => {
        this.profile = p;
        this.profileForm.patchValue({ fullName: p.fullName, phoneNumber: p.phoneNumber ?? '', avatarUrl: p.avatarUrl ?? '' });
      }
    });
  }

  onSaveProfile() {
    if (this.profileForm.invalid) return;
    this.profileSaving = true;
    this.profileService.update(this.profileForm.value).subscribe({
      next: (res) => {
        this.profileSaving = false;
        this.profile = { ...this.profile!, ...res };
        this.snack.open('Đã lưu thông tin!', '✕', { duration: 2500 });
      },
      error: () => { this.profileSaving = false; this.snack.open('Lỗi khi lưu.', '✕', { duration: 2500 }); }
    });
  }

  onChangePassword() {
    if (this.pwForm.invalid) return;
    this.pwSaving = true;
    const { currentPassword, newPassword } = this.pwForm.value;
    this.profileService.changePassword(currentPassword, newPassword).subscribe({
      next: (res) => {
        this.pwSaving = false;
        this.pwForm.reset();
        this.snack.open(res.message ?? 'Đổi mật khẩu thành công!', '✕', { duration: 3000 });
      },
      error: (err) => {
        this.pwSaving = false;
        this.snack.open(err?.error?.message ?? 'Lỗi khi đổi mật khẩu.', '✕', { duration: 3000 });
      }
    });
  }
}
