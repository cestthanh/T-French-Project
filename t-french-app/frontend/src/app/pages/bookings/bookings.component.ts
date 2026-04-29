import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BookingService, BookingSlot } from '../../booking.service';
import { AuthService } from '../../auth.service';

@Component({
    selector: 'app-bookings',
    template: `
<div class="page-wrap">
  <div class="page-top">
    <div>
      <h2 class="page-title">Đặt lịch luyện nói</h2>
      <p class="page-subtitle" *ngIf="auth.isTeacher || auth.isAdmin">Quản lý slot thời gian giảng dạy của bạn</p>
      <p class="page-subtitle" *ngIf="!auth.isTeacher && !auth.isAdmin">Đặt lịch luyện nói 1-1 với giáo viên</p>
    </div>
    <button mat-raised-button color="primary" *ngIf="auth.isTeacher || auth.isAdmin" (click)="showCreate = !showCreate">
      <mat-icon>add</mat-icon> Tạo slot mới
    </button>
  </div>

  <!-- CREATE SLOT (Teacher/Admin) -->
  <mat-card class="create-card" *ngIf="showCreate && (auth.isTeacher || auth.isAdmin)">
    <h3>Tạo slot thời gian trống</h3>
    <form [formGroup]="createForm" (ngSubmit)="onCreate()">
      <div class="form-row">
        <mat-form-field appearance="outline" class="half-w">
          <mat-label>Bắt đầu</mat-label>
          <input matInput type="datetime-local" formControlName="startTime">
        </mat-form-field>
        <mat-form-field appearance="outline" class="half-w">
          <mat-label>Kết thúc</mat-label>
          <input matInput type="datetime-local" formControlName="endTime">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:150px">
          <mat-label>Course ID</mat-label>
          <input matInput type="number" formControlName="courseId">
        </mat-form-field>
      </div>
      <div class="form-actions">
        <button mat-stroked-button type="button" (click)="showCreate = false">Huỷ</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || saving">
          {{ saving ? 'Đang lưu...' : 'Tạo slot' }}
        </button>
      </div>
    </form>
  </mat-card>

  <div class="spinner-wrap" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

  <!-- CALENDAR VIEW -->
  <div *ngIf="!loading">
    <!-- Group slots by date -->
    <div *ngFor="let day of groupedDays" class="day-group">
      <div class="day-header">
        <mat-icon>event</mat-icon>
        {{ day.date | date:'EEEE, dd/MM/yyyy' }}
        <span class="slot-count">{{ day.slots.length }} slot</span>
      </div>

      <div class="slots-row">
        <div class="slot-card" *ngFor="let s of day.slots"
             [class.booked]="s.isBooked"
             [class.mine]="isMySlot(s)">
          <!-- Time -->
          <div class="slot-time">
            <mat-icon>schedule</mat-icon>
            {{ s.startTime | date:'HH:mm' }} — {{ s.endTime | date:'HH:mm' }}
          </div>

          <!-- Teacher name (for students) -->
          <div class="slot-teacher" *ngIf="!auth.isTeacher && !auth.isAdmin">
            <mat-icon>person</mat-icon> {{ s.teacher }}
          </div>

          <!-- Student name (for teachers) -->
          <div class="slot-student" *ngIf="(auth.isTeacher || auth.isAdmin) && s.isBooked">
            <mat-icon>school</mat-icon> {{ s.student }}
          </div>

          <!-- Status chip -->
          <div class="slot-status">
            <span class="status-chip available" *ngIf="!s.isBooked">Trống</span>
            <span class="status-chip booked" *ngIf="s.isBooked && !isMySlot(s)">Đã đặt</span>
            <span class="status-chip mine" *ngIf="isMySlot(s)">Lịch của bạn</span>
          </div>

          <!-- Actions -->
          <div class="slot-actions">
            <!-- Student: book button -->
            <button mat-raised-button color="primary" *ngIf="!auth.isTeacher && !auth.isAdmin && !s.isBooked"
                    (click)="onBook(s.id)" [disabled]="booking === s.id">
              <mat-icon>event_available</mat-icon>
              {{ booking === s.id ? 'Đang đặt...' : 'Đặt lịch' }}
            </button>
            <!-- Student: cancel their own booking -->
            <button mat-stroked-button color="warn" *ngIf="isMySlot(s)" (click)="onCancel(s.id)">
              <mat-icon>cancel</mat-icon> Huỷ
            </button>
            <!-- Teacher: cancel or delete slot -->
            <ng-container *ngIf="auth.isTeacher || auth.isAdmin">
              <button mat-stroked-button color="warn" *ngIf="s.isBooked" (click)="onCancel(s.id)" matTooltip="Huỷ booking của học viên">
                <mat-icon>event_busy</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="onDelete(s.id)" matTooltip="Xoá slot">
                <mat-icon>delete</mat-icon>
              </button>
            </ng-container>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div class="empty-state" *ngIf="groupedDays.length === 0">
      <mat-icon>event_busy</mat-icon>
      <p *ngIf="auth.isTeacher || auth.isAdmin">Bạn chưa tạo slot nào. Hãy tạo slot thời gian trống!</p>
      <p *ngIf="!auth.isTeacher && !auth.isAdmin">Hiện chưa có slot trống nào. Hãy quay lại sau!</p>
    </div>
  </div>
</div>
  `,
    styles: [`
    .page-wrap { padding:24px; }
    .page-top  { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .page-title { font-size:1.5rem; font-weight:700; margin:0 0 4px; }
    .page-subtitle { color:var(--text-muted); font-size:.9rem; margin:0; }

    /* Create form */
    .create-card { padding:24px; margin-bottom:24px; }
    .create-card h3 { margin-bottom:16px; font-weight:700; }
    .form-row { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start; margin-bottom:8px; }
    .half-w  { flex:1; min-width:180px; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; }

    /* Day groups */
    .day-group { margin-bottom:28px; }
    .day-header {
      display:flex; align-items:center; gap:8px;
      font-weight:700; font-size:1rem; margin-bottom:12px;
      padding-bottom:8px; border-bottom:2px solid var(--border);
    }
    .day-header mat-icon { color:var(--primary); }
    .slot-count { font-size:.75rem; font-weight:500; background:#e8eaf6; color:var(--primary); padding:2px 8px; border-radius:12px; margin-left:4px; }

    /* Slot cards */
    .slots-row { display:flex; gap:16px; flex-wrap:wrap; }
    .slot-card {
      background:#fff; border-radius:12px; padding:16px;
      border:2px solid var(--border); min-width:200px; max-width:240px;
      transition:border-color .2s, box-shadow .2s;
      box-shadow:var(--shadow);
    }
    .slot-card:hover { box-shadow:0 8px 24px rgba(57,73,171,.12); }
    .slot-card.booked { border-color:#ffcc02; background:#fffff0; }
    .slot-card.mine   { border-color:#43a047; background:#f1f8e9; }

    .slot-time { display:flex; align-items:center; gap:6px; font-weight:700; font-size:1rem; margin-bottom:8px; }
    .slot-time mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; color:var(--primary); }
    .slot-teacher, .slot-student { display:flex; align-items:center; gap:4px; font-size:.82rem; color:var(--text-muted); margin-bottom:8px; }
    .slot-teacher mat-icon, .slot-student mat-icon { font-size:.9rem; width:.9rem; height:.9rem; }

    .slot-status { margin-bottom:12px; }
    .status-chip { font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:12px; }
    .status-chip.available { background:#e8f5e9; color:#2e7d32; }
    .status-chip.booked    { background:#fff8e1; color:#f57f17; }
    .status-chip.mine      { background:#e3f2fd; color:#1565c0; }

    .slot-actions { display:flex; gap:6px; flex-wrap:wrap; }
    .slot-actions button { flex:1; }

    /* Misc */
    .spinner-wrap { display:flex; justify-content:center; padding:48px; }
    .empty-state  { text-align:center; padding:64px; color:var(--text-muted); }
    .empty-state mat-icon { font-size:3rem; width:3rem; height:3rem; display:block; margin:0 auto 12px; }
  `]
})
export class BookingsComponent implements OnInit {
    slots: BookingSlot[] = [];
    groupedDays: { date: Date; slots: BookingSlot[] }[] = [];
    loading = true;
    saving = false;
    showCreate = false;
    booking: number | null = null;
    createForm: FormGroup;

    constructor(
        public auth: AuthService,
        private bookingService: BookingService,
        private fb: FormBuilder,
        private snackBar: MatSnackBar
    ) {
        this.createForm = this.fb.group({
            startTime: ['', Validators.required],
            endTime: ['', Validators.required],
            courseId: [null, Validators.required],
        });
    }

    ngOnInit() { this.load(); }

    load() {
        this.loading = true;
        const mySlots = this.auth.isTeacher || this.auth.isAdmin;
        this.bookingService.getSlots(mySlots).subscribe({
            next: data => {
                this.slots = data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                this.groupByDay();
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    groupByDay() {
        const map = new Map<string, BookingSlot[]>();
        for (const s of this.slots) {
            const d = new Date(s.startTime);
            const key = d.toDateString();
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(s);
        }
        this.groupedDays = [...map.entries()].map(([, slots]) => ({ date: new Date(slots[0].startTime), slots }));
    }

    isMySlot(s: BookingSlot): boolean {
        return s.isBooked && s.studentId === this.auth.currentUser?.id;
    }

    onCreate() {
        if (this.createForm.invalid) return;
        this.saving = true;
        const v = this.createForm.value;
        this.bookingService.createSlot({
            startTime: new Date(v.startTime).toISOString(),
            endTime: new Date(v.endTime).toISOString(),
            courseId: v.courseId
        }).subscribe({
            next: () => {
                this.saving = false; this.showCreate = false; this.createForm.reset(); this.load();
                this.snackBar.open('Đã tạo slot!', '✕', { duration: 3000 });
            },
            error: err => {
                this.saving = false;
                this.snackBar.open(err?.error?.message || 'Lỗi khi tạo slot.', '✕', { duration: 3000 });
            }
        });
    }

    onBook(id: number) {
        this.booking = id;
        this.bookingService.book(id).subscribe({
            next: () => { this.booking = null; this.load(); this.snackBar.open('Đặt lịch thành công! 🎉', '✕', { duration: 3000 }); },
            error: err => { this.booking = null; this.snackBar.open(err?.error?.message || 'Lỗi khi đặt lịch.', '✕', { duration: 3000 }); }
        });
    }

    onCancel(id: number) {
        if (!confirm('Huỷ lịch này?')) return;
        this.bookingService.cancel(id).subscribe({
            next: () => { this.load(); this.snackBar.open('Đã huỷ lịch.', '✕', { duration: 2000 }); },
            error: () => this.snackBar.open('Lỗi khi huỷ lịch.', '✕', { duration: 2000 })
        });
    }

    onDelete(id: number) {
        if (!confirm('Xoá slot này?')) return;
        this.bookingService.delete(id).subscribe({ next: () => this.load() });
    }
}
