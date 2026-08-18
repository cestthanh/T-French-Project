import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

/**
 * Application-wide notification queue, rendered by `BaseToast`.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly subject = new BehaviorSubject<Toast[]>([]);

  readonly toasts$ = this.subject.asObservable();

  success(message: string, duration = 3500): void {
    this.push(message, 'success', duration);
  }

  error(message: string, duration = 4500): void {
    this.push(message, 'error', duration);
  }

  info(message: string, duration = 3500): void {
    this.push(message, 'info', duration);
  }

  dismiss(id: number): void {
    this.subject.next(this.subject.value.filter(t => t.id !== id));
  }

  private push(message: string, tone: ToastTone, duration: number): void {
    const toast: Toast = { id: this.nextId++, message, tone };
    this.subject.next([...this.subject.value, toast]);
    setTimeout(() => this.dismiss(toast.id), duration);
  }
}
