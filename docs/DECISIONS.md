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
- Ngày 03/10: bài tập API tạo mới là nháp; giáo viên xem trước rồi công bố, sau đó có thể đóng nhận bài. Chỉ sửa nháp chưa có bài nộp; bài có bài nộp được giữ để chấm/xem kết quả, không xóa. Migration gán Published cho bài tập cũ; DueDate chưa tự khóa nhận bài cho tới khi triển khai chính sách deadline W3.
- Bài tập giữ một lượt nộp như API trước đó, nay có ràng buộc database; request thử lại cùng file/link/ghi chú trả kết quả đã lưu. Khác nội dung bị từ chối, không ghi đè bài hay điểm. `AttemptNumber` chuẩn bị schema cho tương lai, không tự bật quyền nộp lại.

## Nhập đề quiz từ Word — 08/10/2026

Chủ dự án yêu cầu có cả soạn tay và nhập file vì giáo viên soạn đề bằng Word; file nghe để trên Google Drive.

- Nhập `.docx` (hoặc dán văn bản từ Word) chạy trên trình duyệt, không thêm API, bảng hay thư viện. Kết quả chỉ đổ vào trình soạn đề; giáo viên kiểm tra rồi lưu qua API tạo/sửa quiz hiện có nên vẫn qua validation server.
- Định dạng nhận dạng: `Câu N:` (hoặc `N.` khi không có `Câu`), lựa chọn `A.`… đánh dấu đúng bằng `*`, in đậm cả dòng hoặc `Đáp án:`; `(x điểm)`, `[nhiều đáp án]`, `[tự luận]`, `Giải thích:`, `Tiêu chí:`, `Phần N`. Không đoán khi thiếu đáp án đúng: báo lỗi để giáo viên sửa.
- Phần nghe dùng link Drive dạng văn bản, hiển thị thành link mở tab mới; chưa lưu/nhúng audio trong hệ thống. File `.doc` cũ, ảnh và công thức không được đọc.

## Còn cần quyết định

| Chủ đề | Câu hỏi cần chốt trước khi mở rộng |
| --- | --- |
| Học offline/hybrid | Có quản lý phòng học và tài nguyên vật lý không? |
| Booking | Chính sách hủy lịch, no-show là gì? |
| Blog | Ai được viết, duyệt và xuất bản? |
| Dữ liệu | Thời hạn giữ lead, bài nộp, file, audit log; xử lý dữ liệu học viên dưới tuổi thành niên |
| Liên lạc | Nhà cung cấp email, consent marketing và thông báo |
| Vận hành | Staging, người chịu trách nhiệm backup/restore và xác nhận hosting production |

Các câu hỏi này chưa được tự động giải quyết bởi việc có code hoặc hướng dẫn triển khai. Danh sách đầy đủ vẫn nằm trong [đề xuất](../DE_XUAT_PHAT_TRIEN_DU_AN.md), mục 14.

Các câu hỏi chi tiết về phạm vi tài liệu/bài tập theo lớp, nộp trễ, nộp lại và công bố điểm được ghi trong [đánh giá phân hệ học tập](LEARNING_ASSESSMENT_PLAN.md) và [kế hoạch luồng vai trò](LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md); chúng vẫn là đề xuất cho đến khi chủ dự án chốt.

## Chính sách triển khai được chấp thuận ngày 07/10

Theo yêu cầu hoàn thành các bước tiếp theo của chủ dự án:

- Bài tập mới khóa khi hết hạn; giáo viên có thể bật nhận trễ đến cutoff riêng, không tự trừ điểm. Trước OpenAt và tại/sau CutoffAt server từ chối bài mới. Retry bài đã lưu vẫn trả cùng biên nhận.
- Một lượt mặc định; giáo viên/Admin cấp lượt tiếp theo có lý do và deadline riêng. Giữ toàn bộ file, điểm và nội dung lượt trước. Grant không mở lại bài cho toàn lớp.
- Điểm/feedback mới chờ công bố; chấm lại phải công bố lại. Quiz chỉ release sau CloseAt; đáp án/lời giải còn phụ thuộc ShowAnswersAfterGrading. Điểm lịch sử đã chấm giữ quyền xem qua migration.
- Assignment giữ thang 0–10; quiz giữ tổng điểm câu hỏi. Bảng điểm hiển thị điểm gốc/max/% của lượt mới nhất; lịch sử tại bài tập. Chưa gộp các loại bài thành một điểm trung bình có trọng số.
- Backup/restore đi kèm upload; ứng dụng dừng ghi khi chụp; restore luôn tạo đích mới và xác minh trước chuyển service. Staging Docker dùng secret/volume riêng.

Đợt này không chốt retention, quét file, rubric cấu trúc, ngoại lệ thời gian quiz hay chính sách booking. Những dòng ghi 02–03/10 ở trên là lịch sử trước khi deadline/release/grant được bổ sung; xem [đặc tả đợt hoàn thiện](LEARNING_COMPLETION_EXECUTION.md).
