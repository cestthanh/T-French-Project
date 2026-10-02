# Decisions

Trang này giúp phiên mới phân biệt quyết định đã ghi nhận với câu hỏi còn mở. Nguồn gốc là [mục 14 của đề xuất](../DE_XUAT_PHAT_TRIEN_DU_AN.md) và phụ lục D. Khi một quyết định thay đổi, cập nhật nguồn gốc và [STATUS.md](STATUS.md), rồi đối chiếu code.

## Đã ghi nhận và triển khai trong code

| Quyết định | Hệ quả hiện tại |
| --- | --- |
| Tách `Course` và `CourseClass` | Một chương trình có thể có nhiều lớp với giáo viên, lịch, sĩ số và trạng thái riêng |
| Khóa miễn phí tự kích hoạt; khóa trả phí cần Admin duyệt | Enrollment có luồng `Active` hoặc `Pending` tùy giá khóa |
| Quiz MVP chỉ một lượt làm | Backend có ràng buộc một `QuizAttempt` cho mỗi cặp Quiz–Student |
| Điểm Quiz lấy từ tổng điểm câu hỏi | Đề có câu một đáp án, nhiều đáp án và tự luận với điểm từng câu |

Các dòng trên mô tả code hiện tại và những ô đã đánh dấu trong tài liệu đề xuất; không thay thế cho một đặc tả nghiệp vụ đầy đủ.

## Quy tắc kỹ thuật của đợt nâng cấp 02/10/2026

- Bài tập mới trên UI chọn lớp; tài liệu chọn lớp, khóa hoặc mọi tài khoản đăng nhập. API vẫn đọc nội dung cũ không có `ClassId` theo phạm vi khóa; migration không tự gán lớp cho dữ liệu lịch sử.
- Nội dung theo lớp yêu cầu Enrollment Active đúng lớp. Quyền quản lý bài tập thuộc giáo viên lớp hoặc Admin; tài liệu vẫn do người tải lên hoặc Admin sửa/xóa.
- API sửa thông thường không đổi lớp bài tập hoặc bỏ/đổi lớp đã gắn vào tài liệu, tránh client cũ làm rộng quyền do thiếu `ClassId`. Phân loại lại dữ liệu cũ và chính sách production cần xử lý riêng.

## Còn cần quyết định

| Chủ đề | Câu hỏi cần chốt trước khi mở rộng |
| --- | --- |
| Học offline/hybrid | Có quản lý phòng học và tài nguyên vật lý không? |
| Bài tập và booking | Chính sách nộp trễ, hủy lịch, no-show là gì? |
| Blog | Ai được viết, duyệt và xuất bản? |
| Dữ liệu | Thời hạn giữ lead, bài nộp, file, audit log; xử lý dữ liệu học viên dưới tuổi thành niên |
| Liên lạc | Nhà cung cấp email, consent marketing và thông báo |
| Vận hành | Staging, người chịu trách nhiệm backup/restore và xác nhận hosting production |

Các câu hỏi này chưa được tự động giải quyết bởi việc có code hoặc hướng dẫn triển khai. Danh sách đầy đủ vẫn nằm trong [đề xuất](../DE_XUAT_PHAT_TRIEN_DU_AN.md), mục 14.

Các câu hỏi chi tiết về phạm vi tài liệu/bài tập theo lớp, nộp trễ, nộp lại và công bố điểm được ghi trong [đánh giá phân hệ học tập](LEARNING_ASSESSMENT_PLAN.md) và [kế hoạch luồng vai trò](LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md); chúng vẫn là đề xuất cho đến khi chủ dự án chốt.
