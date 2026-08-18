import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BookingService } from 'src/app/services/bookingService';
import { BookingSlot } from 'src/app/interface';
import { AuthService } from 'src/app/services/authService';
import { ToastService } from 'src/app/services/share/toastService';

@Component({
  selector: 'app-bookings',
  templateUrl: './booking.html',
})
export class Booking implements OnInit {
  slots: BookingSlot[] = [];
  groupedDays: { date: Date; slots: BookingSlot[] }[] = [];
  loading = true;
  saving = false;
  showCreate = false;
  booking: number | null = null;
  createForm: FormGroup;

  get canManage(): boolean {
    return this.auth.isTeacher || this.auth.isAdmin;
  }

  constructor(
    public auth: AuthService,
    private bookingService: BookingService,
    private fb: FormBuilder,
    private toast: ToastService,
  ) {
    this.createForm = this.fb.group({
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      courseId: [null, Validators.required],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.bookingService.getSlots(this.canManage).subscribe({
      next: data => {
        this.slots = data.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
        this.groupByDay();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  groupByDay(): void {
    const map = new Map<string, BookingSlot[]>();
    for (const slot of this.slots) {
      const key = new Date(slot.startTime).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    this.groupedDays = [...map.values()].map(slots => ({
      date: new Date(slots[0].startTime),
      slots,
    }));
  }

  isMySlot(s: BookingSlot): boolean {
    return s.isBooked && s.studentId === this.auth.currentUser?.id;
  }

  /** Availability is read from the fill colour, not from a border or badge alone. */
  toneFor(s: BookingSlot): 'success-soft' | 'primary-soft' | 'muted' {
    if (this.isMySlot(s)) return 'primary-soft';
    return s.isBooked ? 'muted' : 'success-soft';
  }

  onCreate(): void {
    if (this.createForm.invalid) return;
    this.saving = true;
    const v = this.createForm.value;
    this.bookingService
      .createSlot({
        startTime: new Date(v.startTime).toISOString(),
        endTime: new Date(v.endTime).toISOString(),
        courseId: v.courseId,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.showCreate = false;
          this.createForm.reset();
          this.load();
          this.toast.success('Đã tạo slot!');
        },
        error: err => {
          this.saving = false;
          this.toast.error(err?.error?.message || 'Lỗi khi tạo slot.');
        },
      });
  }

  onBook(id: number): void {
    this.booking = id;
    this.bookingService.book(id).subscribe({
      next: () => { this.booking = null; this.load(); this.toast.success('Đặt lịch thành công! 🎉'); },
      error: err => { this.booking = null; this.toast.error(err?.error?.message || 'Lỗi khi đặt lịch.'); },
    });
  }

  onCancel(id: number): void {
    if (!confirm('Huỷ lịch này?')) return;
    this.bookingService.cancel(id).subscribe({
      next: () => { this.load(); this.toast.success('Đã huỷ lịch.'); },
      error: () => this.toast.error('Lỗi khi huỷ lịch.'),
    });
  }

  onDelete(id: number): void {
    if (!confirm('Xoá slot này?')) return;
    this.bookingService.delete(id).subscribe({
      next: () => { this.load(); this.toast.success('Đã xoá slot.'); },
      error: () => this.toast.error('Lỗi khi xoá slot.'),
    });
  }
}
