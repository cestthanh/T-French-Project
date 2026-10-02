# Architecture

T-French là một ứng dụng triển khai chung: frontend Angular và backend ASP.NET Core. Dữ liệu nghiệp vụ dùng SQLite qua EF Core; file tải lên được lưu ngoài `wwwroot` và đi qua API có kiểm tra quyền. [README gốc](../README.md) ghi lệnh chạy; [STATUS.md](STATUS.md) ghi phiên bản và kết quả xác minh gần nhất.

## Sơ đồ thành phần

```mermaid
flowchart LR
    Browser[Trình duyệt] --> Angular[Angular frontend]
    Angular --> API[ASP.NET Core API]
    API --> DB[(SQLite / EF Core)]
    API --> Files[(File storage)]
    Worker[QuizDeadlineWorker] --> DB
```

Trong development, `ng serve` chạy frontend riêng và gọi API tại `http://localhost:5083/api`. Ở bản Docker production, ASP.NET Core phục vụ các file Angular và API cùng domain; frontend gọi `/api`. `Dockerfile` dùng Node cho frontend và .NET SDK/runtime cho backend.

## Nơi tìm code

| Mục đích | Đường dẫn |
| --- | --- |
| Routing và màn hình | `frontend/src/app/app-routing.module.ts`, `frontend/src/app/view/` |
| Gọi API, xác thực phía client | `frontend/src/app/services/` |
| HTTP endpoints và kiểm tra quyền | `backend/TFrench.API/Controllers/` |
| Nghiệp vụ, file, audit, quiz deadline | `backend/TFrench.API/Services/` |
| Entity, DTO, quan hệ và migration | `backend/TFrench.API/Models/`, `DTOs/`, `Data/` |
| Khởi tạo middleware, database, health | `backend/TFrench.API/Program.cs` |

## Quan hệ nghiệp vụ chính

- `Course` là chương trình học; `CourseClass` là lớp/cohort của chương trình; `Enrollment` gắn học viên với lớp và có trạng thái.
- `Assignment` và `Submission` phục vụ giao/nộp/chấm bài; `Resource` và `StoredFile` phục vụ tài liệu và file.
- `Resource`/`Assignment` có `ClassId` nullable: có lớp thì kiểm tra Enrollment Active đúng lớp; dữ liệu cũ không có lớp giữ phạm vi khóa. `LearningAccessService` dùng chung quy tắc cho danh sách, chi tiết, file và quyền nộp/chấm bài. Tài liệu `IsPublic` dành cho mọi tài khoản đăng nhập.
- `Quiz` gắn với lớp; `QuizAttempt` là lượt làm của học viên. `QuizDeadlineWorker` chốt các lượt hết giờ ở phía server.
- `ContactLead` lưu yêu cầu tư vấn và có thể liên kết tới học viên/ghi danh. `AuditLog` lưu các hành động nhạy cảm được instrument trong code.

Các quan hệ database nằm trong `backend/TFrench.API/Data/AppDbContext.cs`. Chi tiết vận hành nằm trong [RELIABILITY.md](RELIABILITY.md); không suy từ sơ đồ này rằng mọi luồng đã có kiểm thử đầu cuối.
