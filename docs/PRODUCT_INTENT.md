# Product intent

T-French phục vụ một trung tâm tiếng Pháp nhỏ. Sản phẩm kết hợp website giới thiệu và blog với công cụ học tập, quản lý lớp và tiếp nhận khách tư vấn. Bốn nhóm người dùng là khách vãng lai, học viên, giáo viên và Admin.

## Giá trị của từng luồng

| Nhóm | Việc cần làm trên hệ thống |
| --- | --- |
| Khách vãng lai | Tìm hiểu dịch vụ/khóa học, đọc blog, gửi yêu cầu tư vấn |
| Học viên | Đăng ký lớp, xem tài liệu/bài tập, nộp bài, làm quiz, đặt lịch luyện nói |
| Giáo viên | Quản lý phần học được giao, giao và chấm bài, tạo/chấm quiz, mở lịch luyện nói |
| Admin | Quản lý tài khoản, khóa/lớp và ghi danh, xử lý lead, xem audit log |

## Nguyên tắc sản phẩm

- Ưu tiên luồng học viên–giáo viên–Admin chạy trọn vẹn trước khi mở rộng tính năng.
- Mỗi vai trò chỉ thấy công cụ cần dùng; backend kiểm tra quyền theo dữ liệu và quan hệ sở hữu.
- Người vận hành không phải nhập ID kỹ thuật trong các thao tác thông thường.
- Giữ một nguồn dữ liệu thống nhất cho khóa học, lớp, học viên, bài tập và tài liệu.
- Thanh toán, SEO/CRM nâng cao và AI nằm ở các giai đoạn sau của roadmap đề xuất; xem [trạng thái hiện tại](STATUS.md) để biết phần nào đã triển khai.

Nguồn chi tiết: [mục tiêu ban đầu](../context.txt) và [đề xuất phát triển](../DE_XUAT_PHAT_TRIEN_DU_AN.md), mục 1–4. Tài liệu đề xuất là bản đánh giá ngày 22/09/2026; đối chiếu phụ lục D và code khi cần trạng thái mới nhất.
