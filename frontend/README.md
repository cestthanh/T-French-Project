# T-French frontend

Giao diện Angular 21 cho website công khai và dashboard theo vai trò. Trang public gồm home, khóa học, blog và đăng nhập/đăng ký; dashboard tải các module bài tập, tài liệu, booking, lớp học, quiz, admin và profile khi cần.

## Chạy development

Từ thư mục `frontend/`:

```powershell
npm ci
npm start
```

Mở `http://localhost:4200`. Backend development cần chạy tại `http://localhost:5083`; URL API được khai báo trong `src/environments/environment.ts`. Cấu hình production thay nó bằng `/api` cùng domain qua `src/environments/environment.production.ts`.

## Build và kiểm thử

```powershell
npm run build -- --configuration production
```

Đầu ra nằm trong `dist/frontend/browser/` và được Dockerfile chép vào `wwwroot` của ASP.NET Core. Test autosave quiz nằm trong `src/app/view/quiz/quiz.spec.ts`; chạy headless bằng `npm test -- --watch=false --browsers=ChromeHeadless`. Browser E2E cho luồng học tập nằm trong `e2e/learning.spec.ts`; chạy `npm run test:e2e` với container test tách biệt theo [runbook](../docs/OPERATIONS_RUNBOOK.md).

Xem [README gốc](../README.md) để chạy cả hệ thống và [trạng thái dự án](../docs/STATUS.md) để biết kết quả kiểm tra gần nhất.
