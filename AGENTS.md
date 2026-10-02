# T-French — hướng dẫn cho phiên làm việc mới

Đọc sáu mục dưới đây theo thứ tự. Trước khi sửa code, chạy `git status --short --branch` và xem diff: working tree có thể chứa thay đổi chưa commit của phiên trước. Giữ nguyên các thay đổi không thuộc việc đang làm.

## Product intent

Đọc [docs/PRODUCT_INTENT.md](docs/PRODUCT_INTENT.md) để biết người dùng, giá trị từng luồng và nguyên tắc sản phẩm. T-French phục vụ một trung tâm tiếng Pháp nhỏ; ưu tiên nghiệp vụ cốt lõi và quyền truy cập đúng theo dữ liệu.

- Mục tiêu ban đầu: [context.txt](context.txt).
- Định hướng sản phẩm và phạm vi đề xuất: [DE_XUAT_PHAT_TRIEN_DU_AN.md](DE_XUAT_PHAT_TRIEN_DU_AN.md), mục 1–4.

## Architecture

Đọc [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) để biết thành phần, luồng dữ liệu và nơi tìm code. Frontend Angular nằm trong `frontend/`; API ASP.NET Core và SQLite nằm trong `backend/TFrench.API/`.

- Lệnh chạy và bản đồ repository: [README.md](README.md).
- Cấu hình triển khai một container: [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md).

## Active plans

[docs/STATUS.md](docs/STATUS.md) là điểm vào cho tiến độ hiện tại: commit/working tree, mốc đã làm, việc còn mở, kết quả kiểm tra và bước tiếp theo. Phụ lục D của [tài liệu đề xuất](DE_XUAT_PHAT_TRIEN_DU_AN.md) là nhật ký triển khai chi tiết; roadmap ở mục 12 là đề xuất, không tự động là kế hoạch đã duyệt.

Đánh giá chuyên đề về tài liệu, bài tập và quiz nằm trong [docs/LEARNING_ASSESSMENT_PLAN.md](docs/LEARNING_ASSESSMENT_PLAN.md). [Luồng ba vai trò và kế hoạch triển khai chi tiết](docs/LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md) chuyển đánh giá này thành các gói W0–W7, migration và tiêu chí nghiệm thu. Đây là đề xuất; các câu hỏi nghiệp vụ chưa được coi là đã chốt.

Sau thay đổi đáng kể, cập nhật `docs/STATUS.md` với ngày, kết quả đã xác minh, việc đang làm và bước tiếp theo. Giữ mục này ngắn để phiên sau đọc nhanh.

## Decisions

Đọc [docs/DECISIONS.md](docs/DECISIONS.md) để phân biệt quyết định đã ghi nhận với câu hỏi còn mở. Những quyết định quan trọng gồm tách Course/Class, chính sách ghi danh miễn phí/trả phí và Quiz một lượt.

Đọc [mục 14](DE_XUAT_PHAT_TRIEN_DU_AN.md) trước khi thay đổi các nghiệp vụ này. Khi có quyết định mới, cập nhật tài liệu đó và tóm tắt tác động trong `docs/STATUS.md`. Phần đánh giá ban đầu ngày 22/09/2026 là ảnh chụp lịch sử; đối chiếu phụ lục D và code trước khi dựa vào một nhận định cũ.

## Reliability

Đọc [docs/RELIABILITY.md](docs/RELIABILITY.md) để biết cơ chế có trong code, phần chưa xác minh trên môi trường đích và bước kiểm tra sau triển khai. Repository chưa chứng minh Railway, backup hay restore đã được vận hành thực tế.

- Cấu hình và lưu ý vận hành: [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md).
- Không đưa mật khẩu, token, database hoặc file người dùng vào Git hay tài liệu.

## Validation

Đọc [docs/VALIDATION.md](docs/VALIDATION.md) để biết lệnh chạy, phạm vi test hiện có và khoảng trống kiểm thử. Backend nhắm `net10.0`; kết quả gần nhất có ngày nằm trong [docs/STATUS.md](docs/STATUS.md).

Xem [docs/STATUS.md](docs/STATUS.md) cho kết quả gần nhất. Ghi rõ lệnh, kết quả và giới hạn môi trường; không đánh dấu một việc đã kiểm tra chỉ vì nhật ký cũ ghi thành công. Hiện chưa có frontend `*.spec.ts` hoặc workflow CI trong repository.
