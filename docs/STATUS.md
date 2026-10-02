# Trạng thái T-French

**Cập nhật:** 02/10/2026. Đây là ảnh chụp trạng thái repository, không phải xác nhận hệ thống đã triển khai trên Railway. Đọc `git status --short --branch` trước khi tiếp tục vì working tree có thể thay đổi giữa các phiên.

## Điểm xuất phát

- Nhánh được rà soát: `tuanthanh_dev`; nền nghiệp vụ trước đợt này ở `7fc9a1e` (`feat: complete learning workflows and production deployment`, 23/09/2026). Bản nâng backend/test/Docker lên .NET 10 đã được commit riêng tại `000d4eb` ngày 02/10/2026. Các commit mới chưa được đẩy lên remote trong phiên này.
- Bộ tài liệu bàn giao gồm `README.md`, `AGENTS.md`, các trang trong `docs/`, `frontend/README.md` và chỉnh sửa lịch sử trong `DE_XUAT_PHAT_TRIEN_DU_AN.md`. Luôn xem `git status --short --branch` trước khi tiếp tục; không suy từ tài liệu rằng working tree đang sạch.
- Frontend dùng Angular 21; backend nhắm `net10.0`, EF Core/ASP.NET Core 10.0.12; SQLite lưu dữ liệu, file upload nằm ngoài `wwwroot`. Dockerfile build cả frontend và backend thành một container.

## Tiến độ theo giai đoạn

| Giai đoạn | Đã có | Còn lại / chưa xác nhận |
| --- | --- | --- |
| 0 — An toàn vận hành | Cấu hình secret production, phân quyền/ownership cốt lõi, validation một số luồng, rate limit, audit log, health check, migration và bootstrap Admin | Validation/API errors đồng nhất, quản lý phiên/refresh token, kiểm tra nội dung file, CI, quy trình backup/restore, staging; chưa xác nhận Railway đang chạy |
| 1 — Khóa học và ghi danh | Course/Class, trạng thái Enrollment, tự kích hoạt khóa miễn phí, duyệt khóa trả phí, UI quản lý lớp và chuyển lead thành học viên | Cần tiếp tục mở rộng kiểm thử và hoàn thiện các quyết định nghiệp vụ còn mở |
| 2 — LMS | Bài tập/tài liệu hiện có; Quiz MVP theo lớp với autosave, deadline phía server, tự chấm trắc nghiệm và chấm tự luận | Module/Lesson, gradebook/rubric nâng cao, notification và E2E trình duyệt |
| 3–5 | Có roadmap đề xuất | Booking nâng cao, SEO/CMS/CRM nâng cao, thanh toán, báo cáo và AI chưa được đánh dấu hoàn thành |

Chi tiết và lịch sử triển khai nằm trong `DE_XUAT_PHAT_TRIEN_DU_AN.md`, đặc biệt **phụ lục D**. Phần đánh giá ban đầu trong tài liệu đó là ảnh chụp trước các thay đổi ngày 22–23/09; đừng dùng nó làm trạng thái hiện tại nếu không đối chiếu code.

## Bằng chứng kiểm tra gần nhất

- Ngày 02/10/2026: chạy lại `npm run build -- --configuration production` trong `frontend/`: **thành công**. Chạy `dotnet test TFrench.sln --verbosity minimal` trong container SDK 10 trên working tree hiện tại: **4/4 integration tests pass**. Đây là xác minh trước khi sửa autosave quiz; kiểm thử chức năng mới cần ghi riêng sau khi triển khai.
- Ngày 02/10/2026: sửa autosave quiz bằng revision cục bộ: đáp án sửa trong lúc request đang chạy được lưu tiếp; nộp/quay lại đợi server xác nhận; lỗi lưu/xung đột giữ đáp án trên trang và có thao tác xử lý; cảnh báo khi rời trang. `npm test -- --watch=false --browsers=ChromeHeadless`: **5/5 pass**; frontend production build sau sửa: **thành công**. Chưa có E2E với API thật hoặc kiểm thử thủ công hai tab.
- Ngày 02/10/2026: đọc **snapshot SQLite cũ** `tfrench.backup-20260922-180557.db` ở chế độ read-only: `PRAGMA quick_check=ok`; 12 Resource, 1 Assignment, 8 Submission, 29 StoredFile, 8 Enrollment; không có bảng Class/Quiz vì snapshot trước các migration đó. Không thấy cặp Submission trùng trong snapshot. Đây không phải kiểm kê database production hoặc phép thử migration trên schema hiện tại.
- Ngày 30/09/2026: `npm run build -- --configuration production` từ `frontend/` **thành công**. Lần chạy đầu trong sandbox bị `spawn EPERM`; chạy lại ngoài sandbox thành công.
- Ngày 30/09/2026: chạy `dotnet test TFrench.sln --verbosity minimal` trong container `mcr.microsoft.com/dotnet/sdk:10.0` với working tree hiện tại: **4/4 integration tests pass**, 0 fail. Máy Windows chỉ có SDK 9 nên lệnh test trực tiếp trên host không dùng để xác minh bản nâng cấp; lệnh container có trong `README.md`.
- Ngày 30/09/2026: `docker build -t tfrench-docs-verify .` **thành công** với Dockerfile hiện tại. Các bước restore/publish/build trong lần chạy này được Docker lấy từ cache; integration tests ở dòng trên đã biên dịch lại backend bằng SDK 10.
- Có ba smoke suite Bash cho file, lead và blog trong `backend/tests/`; chúng cần API đang chạy. Có test frontend cho autosave quiz; chưa có browser E2E hoặc workflow CI trong repository.
- Không có bằng chứng trong repository về URL Railway, backup volume đang bật hay lần restore đã thử. `DEPLOY_RAILWAY.md` là hướng dẫn triển khai, không phải báo cáo môi trường thực tế.
- Ngày 01/10/2026: rà soát code của Resource/Assignment/Quiz và ghi đánh giá, thiết kế đề xuất, thứ tự cải thiện tại [LEARNING_ASSESSMENT_PLAN.md](LEARNING_ASSESSMENT_PLAN.md). Chưa triển khai các đề xuất trong file này.
- Ngày 01/10/2026: đối chiếu tài liệu Moodle, OWASP, W3C; vẽ luồng học viên, giáo viên, Admin và viết [kế hoạch nâng cấp chi tiết](LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md) với gói W0–W7, migration và tiêu chí nghiệm thu. Đây là kế hoạch, chưa phải code đã triển khai.

## Việc tiếp theo

1. Tiếp tục P0 theo [kế hoạch W0–W7](LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md): W4 autosave đã có test; W0 mới kiểm kê được snapshot cũ, cần đối chiếu dữ liệu hiện hành trước migration; tiếp theo là W1 về phạm vi và quyền theo lớp. Khi triển khai thật, kiểm tra lại runtime production và health endpoint trên môi trường đích.
2. Hoàn thiện các mục còn mở của giai đoạn 0: CI build/test, backup/restore có thử phục hồi, staging và những khoảng trống về validation/session/file.
3. Chọn phạm vi tiếp theo của giai đoạn 2 hoặc 3 dựa trên quyết định sản phẩm; không tự coi roadmap đề xuất là phạm vi đã duyệt.

Đối với phân hệ học tập, xem luồng và thứ tự W0–W7 trong [LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md](LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md). Cần chốt các chính sách ở mục 7 trước khi bật thay đổi phạm vi/migration trên production; các sửa lỗi độc lập như autosave quiz có thể làm sớm.

**Các quyết định còn cần chủ dự án chốt:** chính sách nộp trễ/hủy lịch/no-show; quyền biên tập blog; retention dữ liệu và audit; email/consent; staging và trách nhiệm backup. Danh sách đầy đủ nằm ở mục 14 của tài liệu đề xuất.
