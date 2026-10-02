# T-French

Nền tảng cho một trung tâm tiếng Pháp nhỏ: website giới thiệu và blog, quản lý học viên, khóa học/lớp học, ghi danh, tài liệu, bài tập, quiz, lịch luyện nói và lead tư vấn.

**Bắt đầu một phiên làm việc:** đọc [trạng thái hiện tại](docs/STATUS.md), sau đó kiểm tra `git status --short --branch`. [AGENTS.md](AGENTS.md) ghi quy ước bàn giao cho các phiên làm việc. [Đề xuất phát triển](DE_XUAT_PHAT_TRIEN_DU_AN.md) là tài liệu định hướng và nhật ký chi tiết; các nhận định ở phần đánh giá ban đầu có thể đã được triển khai sau đó.

## Cấu trúc

| Đường dẫn | Nội dung |
| --- | --- |
| `frontend/` | Angular 21, giao diện công khai và dashboard theo vai trò |
| `backend/TFrench.API/` | ASP.NET Core API, EF Core, SQLite, migration và xử lý nghiệp vụ |
| `backend/TFrench.API.Tests/` | Integration tests dùng database SQLite tạm |
| `backend/tests/` | Smoke tests Bash chạy với API đang hoạt động |
| `Dockerfile` | Build frontend và backend thành một image phục vụ cùng domain |
| `DEPLOY_RAILWAY.md` | Các bước cấu hình Railway, volume và biến môi trường |

## Chạy trên máy cá nhân

Cần .NET **10 SDK**, Node.js/npm tương thích với Angular 21. Dockerfile dùng Node 20. Backend development tự chạy migration và, theo cấu hình hiện tại, tạo dữ liệu mẫu; không dùng database development cho dữ liệu thật.

Mở hai terminal từ thư mục gốc dự án:

```powershell
cd backend
dotnet run --project TFrench.API --launch-profile http
```

```powershell
cd frontend
npm ci
npm start
```

Frontend chạy tại `http://localhost:4200`; API tại `http://localhost:5083/api`. Frontend development dùng URL API này, còn bản production dùng `/api` cùng domain. Có thể kiểm tra kết nối database qua `http://localhost:5083/health`.

## Kiểm tra

```powershell
cd backend
dotnet test TFrench.sln
```

Nếu máy chưa có .NET 10 SDK nhưng Docker đang chạy, từ thư mục gốc có thể dùng container SDK 10:

```powershell
$repoPath = (Get-Location).Path
docker run --rm --mount "type=bind,source=$repoPath,target=/src" -w /src/backend mcr.microsoft.com/dotnet/sdk:10.0 dotnet test TFrench.sln --verbosity minimal
```

```powershell
cd frontend
npm run build -- --configuration production
```

Các smoke tests Bash có hướng dẫn riêng tại [backend/tests/README.md](backend/tests/README.md). Hiện repository chưa có test frontend `*.spec.ts` hoặc workflow CI; xem [STATUS.md](docs/STATUS.md) để biết kết quả kiểm tra gần nhất và các giới hạn môi trường.

## Triển khai và tài liệu

Đọc [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md) trước khi triển khai. Repository có cấu hình Docker và hướng dẫn vận hành, nhưng không tự chứng minh rằng một môi trường Railway đang chạy. Các secret, database và file tải lên không được commit.

Thiết kế giao diện ban đầu nằm trong [new_prompt_frontend.md](new_prompt_frontend.md); [context.txt](context.txt) ghi mục tiêu sản phẩm ban đầu. Trạng thái mới nhất của công việc được duy trì trong [docs/STATUS.md](docs/STATUS.md).

## Bản đồ tài liệu cho phiên mới

[AGENTS.md](AGENTS.md) là điểm vào với sáu mục: [Product intent](docs/PRODUCT_INTENT.md), [Architecture](docs/ARCHITECTURE.md), [Active plans](docs/STATUS.md), [Decisions](docs/DECISIONS.md), [Reliability](docs/RELIABILITY.md) và [Validation](docs/VALIDATION.md). Mỗi trang tóm tắt phần cần biết và dẫn tới nguồn chi tiết trong code hoặc tài liệu hiện có.

Đánh giá riêng cho kho tài liệu, bài tập và quiz nằm trong [LEARNING_ASSESSMENT_PLAN.md](docs/LEARNING_ASSESSMENT_PLAN.md); sơ đồ luồng học viên/giáo viên/Admin và kế hoạch nâng cấp chi tiết nằm trong [LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md](docs/LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md).
