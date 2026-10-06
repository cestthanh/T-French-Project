import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subscription } from 'rxjs';
import { apiUrl } from 'src/app/services/Uri/uriConfig';
import { AuthService } from 'src/app/services/authService';
import { ToastService } from 'src/app/services/share/toastService';

interface LearningClass { id: number; name: string; course: string; }
interface Activity { id: number; kind: string; title: string; at: string; state: string; pendingGrading: number; path: string; }
interface Overview { activities: Activity[]; resources: Array<{ id: number; title: string }>; }
interface Gradebook {
  columns: Array<{ key: string; title: string; max: number }>;
  rows: Array<{ studentId: number; name: string; cells: Record<string, { earned?: number; max: number; percent?: number; state: string }> }>;
}

@Component({ selector: 'app-learning', templateUrl: './learning.html', standalone: false })
export class LearningPage implements OnInit, OnDestroy {
  classes: LearningClass[] = [];
  classId: number | null = null;
  overview: Overview | null = null;
  gradebook: Gradebook | null = null;
  loading = true;
  private request?: Subscription;
  readonly labels: Record<string, string> = {
    Draft: 'Bản nháp', Upcoming: 'Sắp mở', Open: 'Đang nhận bài', Late: 'Đang nhận bài trễ',
    Closed: 'Đã khóa', InProgress: 'Đang làm', Submitted: 'Đã nộp', Resubmission: 'Được nộp lại', Released: 'Đã trả kết quả',
  };
  constructor(private http: HttpClient, public auth: AuthService, private toast: ToastService) {}
  ngOnInit(): void {
    this.http.get<LearningClass[]>(`${apiUrl}/learning/classes`).subscribe({
      next: rows => { this.classes = rows; this.classId = rows[0]?.id ?? null; this.load(); },
      error: () => { this.loading = false; this.toast.error('Không tải được lớp học.'); },
    });
  }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
  load(): void {
    this.request?.unsubscribe();
    this.overview = null; this.gradebook = null;
    if (!this.classId) { this.loading = false; return; }
    this.loading = true;
    const base = `${apiUrl}/learning/classes/${this.classId}`;
    this.request = forkJoin({ overview: this.http.get<Overview>(`${base}/overview`), gradebook: this.http.get<Gradebook>(`${base}/gradebook`) }).subscribe({
      next: data => { this.overview = data.overview; this.gradebook = data.gradebook; this.loading = false; },
      error: () => { this.loading = false; this.toast.error('Không tải được nội dung lớp học.'); },
    });
  }
}
