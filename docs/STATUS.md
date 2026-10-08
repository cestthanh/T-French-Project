# Trạng thái T-French

**Cập nhật:** 08/10/2026. Đây là ảnh chụp trạng thái repository, không phải xác nhận hệ thống đã triển khai trên Railway. Đọc `git status --short --branch` trước khi tiếp tục vì working tree có thể thay đổi giữa các phiên.

**Đợt 07/10:** Đã triển khai và kiểm thử cục bộ [phạm vi hoàn thiện được yêu cầu](LEARNING_COMPLETION_EXECUTION.md): deadline/nộp trễ, công bố kết quả, lượt nộp lại, bảng điểm/việc cần làm, preview quiz, E2E/CI và công cụ staging/backup. Railway chưa có triển khai được xác nhận; đọc [runbook vận hành](OPERATIONS_RUNBOOK.md) trước khi bật trên dữ liệu thật.

**Đợt 08/10:** Đã push 10 commit trước đó cùng README mới (`9628b4c`) lên `origin/tuanthanh_dev`; đối chiếu `git ls-remote` khớp HEAD sau push. [README](../README.md) hướng dẫn cài công cụ, clone đúng nhánh, chạy .NET/Node hoặc Docker, đăng nhập demo, thử ba vai trò, kiểm thử và giữ dữ liệu. Đã kiểm tra 25 liên kết nội bộ, 16 khối lệnh PowerShell (0 lỗi cú pháp) và `git diff --check`.

**Nhập đề quiz từ Word (08/10):** Theo yêu cầu chủ dự án, trình soạn quiz có thêm **Nhập từ file Word** (`.docx` hoặc dán văn bản) bên cạnh soạn tay, kèm file mẫu `frontend/src/assets/templates/mau-de-kiem-tra.docx`; link http(s) (Google Drive cho phần nghe) trong mô tả/câu hỏi/lời giải hiển thị thành link mở tab mới. Đọc `.docx` bằng API trình duyệt, không thêm dependency (đã thử `mammoth` nhưng kéo `sprintf-js` có advisory chưa có bản vá, làm `npm audit --omit=dev` của CI thất bại). Không đổi backend/database. Quy tắc ở [DECISIONS.md](DECISIONS.md). Kiểm tra cục bộ: unit **19/19 pass** (11 mới), production build pass, E2E Chromium với image Docker mới **3/3 pass** (2 cũ + `quiz-import.spec.ts`), `npm audit --omit=dev` 0 vulnerabilities, `git diff --check` pass; chưa chạy backend tests vì backend không đổi và máy chỉ có SDK 9. Bước tiếp: giáo viên thử với đề Word thật, chỉnh nhận dạng theo các mẫu gặp phải; đối chiếu kết quả Actions của commit này.

**CI hosted đã xác nhận:** [Run 37659677512](https://github.com/cestthanh/T-French-Project/actions/runs/37659677512), SHA `7b15b38`, **3/3 job pass**: backend; frontend (audit runtime/unit/build); browser-and-restore (Python tests/Docker build/Production smoke/E2E/backup/restore). Run đầu tiên lỗi khi dọn upload thuộc UID container trên Linux; bản sửa thu hồi ownership chỉ trong fixture tạm sau khi dừng container đã được CI kiểm chứng. Cục bộ ngày 08/10 chạy lại Python backup tests **2/2 pass**, Python compile và diff check pass; không chạy lại bộ test ứng dụng cục bộ vì máy có SDK 9 và Docker engine chưa chạy. Commit tài liệu bàn giao sau SHA này không thay đổi code; kết quả từng commit tiếp theo xem [Actions của nhánh](https://github.com/cestthanh/T-French-Project/actions?query=branch%3Atuanthanh_dev).

## Điểm xuất phát

- Commit chức năng mới: `efb64af`; CI/E2E/staging/backup và bản vá Angular: `49f59b2`; README cho người mới: `9628b4c`. Đã push lên nhánh hiện tại; xem Git log/status cho commit tài liệu và trạng thái thực tế.
- Nhánh được rà soát và push: `tuanthanh_dev`; nền nghiệp vụ trước đợt này ở `7fc9a1e` (`feat: complete learning workflows and production deployment`, 23/09/2026). Bản nâng backend/test/Docker lên .NET 10 đã được commit riêng tại `000d4eb` ngày 02/10/2026.
- Bộ tài liệu bàn giao gồm `README.md`, `AGENTS.md`, các trang trong `docs/`, `frontend/README.md` và chỉnh sửa lịch sử trong `DE_XUAT_PHAT_TRIEN_DU_AN.md`. Luôn xem `git status --short --branch` trước khi tiếp tục; không suy từ tài liệu rằng working tree đang sạch.
- Frontend dùng Angular 21; backend nhắm `net10.0`, EF Core/ASP.NET Core 10.0.12; SQLite lưu dữ liệu, file upload nằm ngoài `wwwroot`. Dockerfile build cả frontend và backend thành một container.

## Tiến độ theo giai đoạn

| Giai đoạn | Đã có | Còn lại / chưa xác nhận |
| --- | --- | --- |
| 0 — An toàn vận hành | Cấu hình secret production, phân quyền/ownership cốt lõi, validation một số luồng, rate limit, audit log, health check, migration, bootstrap Admin; CI hosted pass ngày 08/10 | Validation/session/file chuyên sâu và backup định kỳ trên production; staging/restore cục bộ và CI đã thử, Railway chưa xác nhận |
| 1 — Khóa học và ghi danh | Course/Class, trạng thái Enrollment, tự kích hoạt khóa miễn phí, duyệt khóa trả phí, UI quản lý lớp và chuyển lead thành học viên | Cần tiếp tục mở rộng kiểm thử và hoàn thiện các quyết định nghiệp vụ còn mở |
| 2 — LMS | Tài liệu/bài tập theo lớp, deadline/nộp trễ, nháp/công bố kết quả, lịch sử lượt; Quiz hỗn hợp/preview/autosave; overview và gradebook theo lớp | Module/Lesson, rubric/gradebook nâng cao, notification và ngoại lệ thời gian; E2E luồng học tập đã có |
| 3–5 | Có roadmap đề xuất | Booking nâng cao, SEO/CMS/CRM nâng cao, thanh toán, báo cáo và AI chưa được đánh dấu hoàn thành |

Chi tiết và lịch sử triển khai nằm trong `DE_XUAT_PHAT_TRIEN_DU_AN.md`, đặc biệt **phụ lục D**. Phần đánh giá ban đầu trong tài liệu đó là ảnh chụp trước các thay đổi ngày 22–23/09; đừng dùng nó làm trạng thái hiện tại nếu không đối chiếu code.

## Bằng chứng kiểm tra gần nhất

Ngày **07/10/2026**, trên working tree của đợt này:

| Kiểm tra | Lệnh / môi trường | Kết quả |
| --- | --- | --- |
| Backend | `dotnet test TFrench.sln --verbosity minimal` trong container SDK 10 | **14/14 pass**: deadline, nộp trễ, đóng/nộp đồng thời, retry, grade redaction/release, grant/lịch sử, quyền lớp/quiz và file dùng chung |
| Frontend unit | `npm test -- --watch=false --browsers=ChromeHeadless`, Windows/Chrome | **8/8 pass** |
| Browser E2E | `npm run test:e2e`, Chromium/Asia-Bangkok, API thật trong Docker | **2/2 pass**: ba vai trò, file, công bố điểm/bảng điểm/nộp lại; preview, mạng chậm, lỗi lưu, reload và hai tab quiz |
| Build | Frontend production build trong `docker build -t tfrench-assessment-verify .` | **Thành công**, image backend/Angular cùng domain |
| Production + restore | `python ops/staging_smoke.py --image tfrench-assessment-verify` | **Pass**: health/SPA/404/bootstrap, không demo account; restore DB/upload rồi tải file qua API có byte giống gốc |
| Backup utility | `python -m unittest discover -s ops -p 'test_*.py' -v` | **2/2 pass**, gồm nguồn WAL, verify lặp, dữ liệu hỏng/thiếu và từ chối ghi đè |
| Dependency runtime | `npm audit --omit=dev` sau vá Angular 21.2.24 | **0 vulnerabilities**; audit đầy đủ còn 19 mục dev dependency, chưa coi toàn bộ toolchain đã sạch |
| Diff | `git diff --check` | **Pass** |

Migration `20261006214939_LearningDeadlinesAndResults` đã chạy trên bản sao snapshot lịch sử: giữ nguyên cột dữ liệu gốc của **12 Resource, 1 Assignment, 8 Submission, 29 StoredFile**; quick_check OK, 0 lỗi FK; điểm đã chấm cũ đều có ReleasedAt. Assignment cũ giữ phạm vi khóa và cutoff null. Đây là rehearsal database lịch sử; chưa kiểm kê dữ liệu hiện hành của production.

Đã có workflow `.github/workflows/validation.yml` và staging `compose.staging.yaml`. Các lệnh tương ứng đã chạy cục bộ ngày 07/10; hosted CI ngày 08/10 pass ở SHA `7b15b38` như ghi ở đầu trang. Smoke suites Bash khác ở `backend/tests/` chưa chạy lại trong đợt này. Nhật ký mốc trước nằm trong Git và phụ lục D của tài liệu đề xuất.

## Việc tiếp theo

1. Review thay đổi trên `tuanthanh_dev` trước khi merge/deploy; toàn bộ code đã push và CI đã pass ở SHA nêu trên. Với commit tiếp theo, tiếp tục đối chiếu kết quả Actions theo SHA.
2. Trên môi trường đích: lấy snapshot DB **và upload** hiện hành, audit/migration rehearsal, cấu hình secret/volume riêng, chạy staging và kiểm tra backup/restore. Repository chưa xác nhận Railway, lịch backup hay người chịu trách nhiệm vận hành.
3. Các mở rộng ngoài phạm vi đợt này: rubric cấu trúc, notification, Module/Lesson, ngoại lệ thời gian theo học viên, quét nội dung file/retention và hoàn thiện session/validation chung. Không tự coi chúng đã được duyệt chỉ vì có roadmap.

**Quy tắc đã áp dụng:** bài mới mặc định khóa theo hạn; giáo viên bật nộp trễ nếu cần, không tự trừ điểm; điểm mới là nháp tới release, chấm lại cần release lại; cấp lượt mới có lý do và hạn riêng, giữ các lượt cũ. Chi tiết ở [DECISIONS.md](DECISIONS.md).
