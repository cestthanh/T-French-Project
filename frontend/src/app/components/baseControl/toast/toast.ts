import { Component } from '@angular/core';
import { Toast, ToastService, ToastTone } from 'src/app/services/share/toastService';

/** Renders the queue held by `ToastService`. Mounted once, in the app shell. */
@Component({
    selector: 'tf-toast-container',
    templateUrl: './toast.html',
    standalone: false
})
export class BaseToast {
  readonly toasts$ = this.toastService.toasts$;

  readonly fill: Record<ToastTone, string> = {
    success: 'bg-success',
    error: 'bg-danger',
    info: 'bg-ink',
  };

  readonly icon: Record<ToastTone, string> = {
    success: 'circle-check',
    error: 'circle-alert',
    info: 'sparkles',
  };

  constructor(public toastService: ToastService) {}

  trackById(_: number, toast: Toast): number {
    return toast.id;
  }
}
