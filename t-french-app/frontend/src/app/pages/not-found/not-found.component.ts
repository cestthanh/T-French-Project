import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  template: `
<div class="nf-wrap">
  <div class="nf-card">
    <div class="nf-emoji">🇫🇷</div>
    <h1>404</h1>
    <p class="nf-title">Trang không tồn tại</p>
    <p class="nf-sub">Có lẽ trang này đã bị xoá hoặc đường dẫn bị sai.</p>
    <a routerLink="/home" mat-raised-button color="primary" class="nf-btn">
      Về trang chủ
    </a>
  </div>
</div>
  `,
  styles: [`
    .nf-wrap {
      min-height:100vh; display:flex; align-items:center; justify-content:center;
      background:var(--bg,#f5f5f5);
    }
    .nf-card {
      text-align:center; background:#fff; border-radius:20px;
      padding:56px 48px; box-shadow:0 8px 40px rgba(0,0,0,.08); max-width:420px;
    }
    .nf-emoji { font-size:3.5rem; margin-bottom:8px; }
    h1 { font-size:4rem; font-weight:900; color:#3949ab; margin:0 0 8px; letter-spacing:-2px; }
    .nf-title { font-size:1.3rem; font-weight:700; margin-bottom:8px; }
    .nf-sub   { color:#757575; margin-bottom:28px; line-height:1.6; }
    .nf-btn   { text-decoration:none !important; }
  `]
})
export class NotFoundComponent {}
