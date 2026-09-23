import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService } from 'src/app/services/profileService';
import { UserProfile } from 'src/app/interface';
import { ToastService } from 'src/app/services/share/toastService';
import { AuthService } from 'src/app/services/authService';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.html',
    standalone: false
})
export class Profile implements OnInit {
  profile: UserProfile | null = null;
  profileForm: FormGroup;
  pwForm: FormGroup;
  profileSaving = false;
  pwSaving = false;
  showCurrent = false;
  showNew = false;

  get initial(): string {
    return (this.profile?.fullName ?? 'U')[0].toUpperCase();
  }

  get pwMismatch(): boolean {
    return !!this.pwForm.errors?.['mismatch'] && !!this.pwForm.get('confirmPassword')?.touched;
  }

  constructor(
    private profileService: ProfileService,
    private auth: AuthService,
    private fb: FormBuilder,
    private toast: ToastService,
  ) {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      phoneNumber: [''],
      avatarUrl: [''],
    });

    this.pwForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.matchPasswords },
    );
  }

  matchPasswords(g: FormGroup): { mismatch: true } | null {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  ngOnInit(): void {
    this.profileService.get().subscribe({
      next: p => {
        this.profile = p;
        this.profileForm.patchValue({
          fullName: p.fullName,
          phoneNumber: p.phoneNumber ?? '',
          avatarUrl: p.avatarUrl ?? '',
        });
      },
      error: () => this.toast.error('Không tải được hồ sơ.'),
    });
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) return;
    this.profileSaving = true;
    this.profileService.update(this.profileForm.value).subscribe({
      next: res => {
        this.profileSaving = false;
        this.profile = { ...this.profile!, ...res };
        this.auth.updateCurrentUser({ fullName: res.fullName, avatarUrl: res.avatarUrl });
        this.toast.success('Đã lưu thông tin!');
      },
      error: () => {
        this.profileSaving = false;
        this.toast.error('Lỗi khi lưu.');
      },
    });
  }

  onChangePassword(): void {
    if (this.pwForm.invalid) return;
    this.pwSaving = true;
    const { currentPassword, newPassword } = this.pwForm.value;
    this.profileService.changePassword(currentPassword, newPassword).subscribe({
      next: res => {
        this.pwSaving = false;
        this.pwForm.reset();
        this.toast.success(res.message ?? 'Đổi mật khẩu thành công!');
      },
      error: err => {
        this.pwSaving = false;
        this.toast.error(err?.error?.message ?? 'Lỗi khi đổi mật khẩu.');
      },
    });
  }
}
