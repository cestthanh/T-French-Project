# Reliability

Trang này ghi những cơ chế có thể xác nhận từ repository và phần còn cần xác minh khi vận hành. Hướng dẫn cấu hình chi tiết nằm trong [DEPLOY_RAILWAY.md](../DEPLOY_RAILWAY.md); kết quả kiểm tra mới nhất ở [STATUS.md](STATUS.md).

## Cơ chế hiện có trong code

- Production yêu cầu JWT secret; demo seeder chỉ chạy trong Development. Nếu database production chưa có Admin, bootstrap yêu cầu các biến cấu hình Admin đầu tiên.
- Backend chạy EF Core migrations khi khởi động và cung cấp `/health` để kiểm tra khả năng kết nối database.
- JWT được đối chiếu với trạng thái active/role của user trong database ở mỗi request. API có exception handler, rate limit cho auth/lead/upload và audit ở một số hành động nhạy cảm.
- File upload lưu ngoài `wwwroot`; đường tải file đi qua controller có kiểm tra truy cập. Việc kiểm tra nội dung file sâu hơn và dọn file mồ côi còn trong backlog.
- Docker image production đặt SQLite và file tại `/data`; hướng dẫn Railway yêu cầu gắn volume và chỉ chạy một replica khi dùng SQLite.

## Trạng thái vận hành chưa được chứng minh từ repository

Không có bằng chứng trong repository về domain Railway đang hoạt động, volume backup đang bật, lần khôi phục dữ liệu đã thử, staging, cảnh báo sự cố trên Railway. Repository hiện có workflow CI, công cụ backup/restore và smoke staging cục bộ; xem bằng chứng ngày 07/10 trong STATUS.md. [DEPLOY_RAILWAY.md](../DEPLOY_RAILWAY.md) là runbook cấu hình, không phải biên bản đã triển khai. Trước khi có người dùng thật, cần xác nhận các việc này trên môi trường đích và ghi kết quả có ngày vào [STATUS.md](STATUS.md).

## Kiểm tra sau mỗi lần triển khai

1. Kiểm tra service khởi động và `/health` trả kết quả khỏe mạnh.
2. Mở trang chủ và một route Angular trực tiếp; kiểm tra API không tồn tại trả `404`.
3. Đăng nhập bằng tài khoản phù hợp, thử một luồng nghiệp vụ chính và xem log lỗi.
4. Xác nhận dữ liệu SQLite và file upload vẫn còn sau lần triển khai; kiểm tra backup/restore theo quy trình vận hành đã chốt.

Danh sách trên là bước cần thực hiện, không phải tuyên bố đã hoàn thành trên Railway. Không lưu secret, mật khẩu bootstrap hoặc dữ liệu người dùng trong tài liệu/Git.

## Bằng chứng cục bộ 07/10

Production Docker smoke đã xác minh health/SPA/API 404/bootstrap, không có demo account. Sau backup DB cùng upload và restore sang thư mục tách biệt, container mới đăng nhập được và file tải qua API có byte giống gốc. Tool verify kiểm tra inventory/hash/integrity/FK và file tham chiếu; backup dùng SQLite backup API và yêu cầu dừng writer để đồng bộ upload. Quy trình ở [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md).

Đây không xác nhận backup lịch định kỳ, mã hóa/retention hoặc Railway. Audit full npm còn 19 dev dependency findings; audit runtime sau vá Angular 21.2.24 là 0. Không đồng nhất một lần smoke pass với việc đã vận hành production.
