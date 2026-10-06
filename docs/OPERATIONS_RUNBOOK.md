# Staging, kiểm kê dữ liệu, backup và restore

Đây là quy trình đã thử cục bộ ngày 07/10/2026. Không xác nhận Railway hoặc lịch backup của môi trường bên ngoài đã hoạt động. Mỗi môi trường phải dùng secret và volume riêng.

## Chạy staging Docker

Từ thư mục gốc, đặt biến môi trường trong terminal riêng. Ví dụ PowerShell:

```powershell
$env:TFRENCH_STAGING_JWT_KEY = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:TFRENCH_STAGING_ADMIN_EMAIL = 'admin@example.test'
$env:TFRENCH_STAGING_ADMIN_PASSWORD = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
docker compose -f compose.staging.yaml up --build -d
```

Mở `http://localhost:8088`; health tại `/health`. Giữ thông tin Admin trong nơi quản lý mật khẩu của mình; không đưa vào Git/log. Sau lần tạo Admin đầu tiên, có thể bỏ biến bootstrap; JWT secret vẫn phải giữ ổn định. `staging_data` tách khỏi dữ liệu production. Không dùng `docker compose down -v` khi cần giữ dữ liệu.

Để tự kiểm tra cold start Production và phục hồi trong môi trường tạm:

```powershell
docker build -t tfrench-staging:local .
python ops/staging_smoke.py --image tfrench-staging:local
```

Script tạo secret ngẫu nhiên và thư mục tạm, chạy image bằng user mặc định, kiểm tra SPA/health/API 404, không có tài khoản demo; tạo tài liệu/file, dừng writer, backup/restore, đăng nhập vào container đã phục hồi và đối chiếu byte file qua API. Script dọn container và dữ liệu tạm sau khi xong. Đây không phải triển khai Railway.

## Kiểm kê trước migration

Tải bản sao database **cùng upload** của môi trường cần nâng cấp về nơi riêng; bảo vệ bản sao như dữ liệu người dùng. Chạy:

```powershell
python ops/data_backup.py audit --database C:/private/data/tfrench.db --uploads C:/private/data/uploads
```

Lệnh kiểm tra integrity, foreign key, file tham chiếu/size và nhóm bài nộp trùng, chỉ in số lượng. Nếu thiếu file hoặc có lỗi FK, khắc phục trước khi triển khai. Nếu số nhóm duplicate khác 0, dừng nâng cấp unique index; lập phương án đối soát giữ lịch sử, không tự xóa bản ghi.

Migration mới giữ ClassId/OpenAt/CutoffAt null cho Assignment lịch sử; bài cũ giữ Published. Điểm cũ đã chấm được gán ReleasedAt. API bài mới có cutoff rõ ràng và công bố điểm chủ động. Snapshot lịch sử đã thử không thay thế kiểm kê dữ liệu hiện hành trên Railway.

## Backup nhất quán

1. Dừng service/writer của môi trường cần chụp. `--service-stopped` là xác nhận của người vận hành, script không tự xác minh mọi tiến trình đã dừng.
2. Dùng thư mục đích mới, nằm ngoài repository và ngoài upload storage.
3. Chạy backup rồi verify, sau đó khởi động lại service.

```powershell
python ops/data_backup.py backup --database C:/private/data/tfrench.db --uploads C:/private/data/uploads --destination C:/private/backups/snapshot-20261007 --service-stopped
python ops/data_backup.py verify --bundle C:/private/backups/snapshot-20261007
```

Bundle gồm database SQLite, upload và manifest SHA-256. Backup dùng SQLite backup API, chuẩn hóa database bản sao sang journal DELETE để thao tác verify không phát sinh WAL/SHM ngoài inventory. Không sửa database nguồn. Symlink/path thoát thư mục, file thiếu và lỗi integrity/FK bị từ chối. Giữ bundle trong nơi hạn chế truy cập; mã hóa và retention tùy chính sách vận hành đã chốt.

## Restore và đường lui

```powershell
python ops/data_backup.py restore --bundle C:/private/backups/snapshot-20261007 --destination C:/private/restored-20261007
```

Restore xác minh toàn bộ bundle trước khi tạo đích; đích phải chưa tồn tại. Sau đó kiểm tra integrity/FK và file tham chiếu. Trên Linux, gán quyền sở hữu database/upload cho UID chạy ứng dụng (image hiện dùng UID 1654) trong **thư mục phục hồi đã xác minh**, rồi gắn thư mục đó vào một container tách biệt để kiểm tra đăng nhập, bài nộp/điểm và tải file.

Chỉ chuyển service sang bản đã phục hồi khi kiểm tra xong. Nếu lùi sau triển khai, phải đối soát các bài nộp/ghi danh phát sinh sau snapshot; không ghi đè dữ liệu mới bằng backup cũ mà chưa quyết định cách bảo toàn chúng.

## E2E với dữ liệu demo tách biệt

```powershell
docker build -t tfrench-e2e .
docker run -d --name tfrench-e2e -p 127.0.0.1:8089:8080 -e ASPNETCORE_ENVIRONMENT=Development -e DemoData__Enabled=true -e Frontend__ServeInDevelopment=true tfrench-e2e
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
```

Sau test, dừng và xóa **container `tfrench-e2e` đã tạo cho test**. Không trỏ test tới database của người dùng thật. Cấu hình `Frontend:ServeInDevelopment` chỉ mở SPA đã build trong máy chạy test; production không seed demo.

Workflow [.github/workflows/validation.yml](../.github/workflows/validation.yml) chạy backend, frontend, E2E, production smoke và restore. Cần push commit và xem run trên GitHub để xác nhận CI hosted; kết quả cục bộ ở [STATUS.md](STATUS.md).
