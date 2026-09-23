# Triển khai T-French lên Railway

Dự án đã được đóng gói thành **một container duy nhất**: ASP.NET Core phục vụ cả API, giao diện Angular và dữ liệu tĩnh. SQLite cùng file người dùng tải lên được lưu trong Railway Volume tại `/data` để không mất khi deploy lại.

## 1. Những thứ bạn cần chuẩn bị

- Một tài khoản GitHub và repository chứa mã nguồn này.
- Một tài khoản Railway.
- Thẻ thanh toán/gói Railway phù hợp nếu tài khoản yêu cầu.
- Email và mật khẩu mạnh cho tài khoản Admin đầu tiên.

Bạn không cần tự cài .NET hoặc Node.js trên Railway. `Dockerfile` sẽ build cả hai phần.

## 2. Đưa mã nguồn lên GitHub

Commit các thay đổi rồi push repository lên GitHub. Không commit file database, file upload hay mật khẩu; chúng đã được loại khỏi Git bằng `.gitignore`.

## 3. Tạo service Railway

1. Trong Railway, chọn **New Project** → **Deploy from GitHub repo**.
2. Chọn repository T-French.
3. Railway sẽ tự nhận `Dockerfile` ở thư mục gốc và build ứng dụng.

Lần deploy đầu có thể chưa chạy thành công cho tới khi bạn thêm volume và các biến môi trường bên dưới. Đây là hành vi dự kiến.

## 4. Gắn volume lưu dữ liệu

Trong service vừa tạo, thêm một **Volume** và đặt **Mount Path** là:

```text
/data
```

Volume này chứa:

- `/data/tfrench.db`: database SQLite;
- `/data/uploads`: bài nộp và tài liệu được tải lên.

Chỉ nên chạy **một replica** khi còn dùng SQLite. Nhiều replica không thể cùng gắn một volume và dễ gây lỗi ghi đồng thời.

## 5. Khai báo biến môi trường

Mở tab **Variables** của service và thêm:

```text
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_HTTP_PORTS=8080
ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
ConnectionStrings__DefaultConnection=Data Source=/data/tfrench.db
FileStorage__RootPath=/data/uploads
Jwt__Issuer=TFrench.API
Jwt__Audience=TFrench.Client
Jwt__ExpiryHours=24
Jwt__Key=<chuỗi bí mật ngẫu nhiên tối thiểu 32 byte>
BootstrapAdmin__Email=<email admin của bạn>
BootstrapAdmin__Password=<mật khẩu mạnh tối thiểu 12 ký tự>
BootstrapAdmin__FullName=<tên hiển thị của admin>
RAILWAY_RUN_UID=0
```

`RAILWAY_RUN_UID=0` cần thiết vì Railway gắn volume với quyền sở hữu `root`, trong khi image mặc định chạy bằng user không đặc quyền. Chỉ container này chạy bằng root; tài khoản quản trị web vẫn hoàn toàn tách biệt.

Có thể tạo JWT key mạnh bằng PowerShell:

```powershell
$bytes = New-Object byte[] 64
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Không đăng key hay mật khẩu vào GitHub. Sau khi deploy thành công và đăng nhập Admin được, hãy xóa biến `BootstrapAdmin__Password` (có thể xóa luôn các biến `BootstrapAdmin__*`). Ứng dụng không tạo lại hoặc đổi mật khẩu Admin nếu đã có Admin trong database.

## 6. Domain và health check

1. Trong **Settings → Networking**, chọn **Generate Domain**.
2. Đặt đường dẫn health check là `/health`.
3. Mở domain Railway và đăng nhập bằng tài khoản Admin vừa khai báo.

Frontend và API dùng cùng domain; vì vậy không cần cấu hình CORS. Nếu sau này tách frontend sang domain khác, thêm biến:

```text
Cors__AllowedOrigins=https://ten-mien-frontend.example
```

Nhiều origin được ngăn cách bằng dấu phẩy.

## 7. Chạy thử bằng Docker trên máy cá nhân

Máy cần cài Docker Desktop. Từ thư mục gốc dự án:

```powershell
docker build -t tfrench .
docker volume create tfrench-data
docker run --rm --name tfrench -p 8080:8080 --user 0 `
  -v tfrench-data:/data `
  -e ASPNETCORE_ENVIRONMENT=Production `
  -e Jwt__Key="thay-bang-chuoi-ngau-nhien-dai-it-nhat-32-byte" `
  -e Jwt__Issuer="TFrench.API" `
  -e Jwt__Audience="TFrench.Client" `
  -e BootstrapAdmin__Email="admin@example.com" `
  -e BootstrapAdmin__Password="MatKhauRatManh-2026!" `
  -e BootstrapAdmin__FullName="Quản trị viên" `
  tfrench
```

Sau đó mở `http://localhost:8080`. Dữ liệu vẫn nằm trong volume `tfrench-data` khi container dừng.

## 8. Sao lưu và vận hành

- Bật backup cho Railway Volume trước khi có người dùng thật.
- Không xóa volume khi redeploy hoặc đổi cấu hình service.
- Kiểm tra `/health` và log sau mỗi lần deploy.
- Khi quy mô tăng hoặc cần nhiều replica, chuyển SQLite sang PostgreSQL và file upload sang object storage (S3/R2). Đây là bước nâng cấp tiếp theo, không cần cho bản trải nghiệm ban đầu.

## Các file triển khai đã thêm

- `Dockerfile`: build Angular, publish ASP.NET và tạo image chạy production.
- `.dockerignore`: loại build output, database và upload khỏi Docker build context.
- `DEPLOY_RAILWAY.md`: tài liệu này.
- Backend tự migrate database, tạo Admin đầu tiên, phục vụ Angular và cung cấp `/health`.
