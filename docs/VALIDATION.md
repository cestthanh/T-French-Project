# Validation

Các lệnh kiểm tra và phạm vi phủ nằm ở đây; kết quả chạy gần nhất có ngày nằm trong [STATUS.md](STATUS.md). Khi sửa nghiệp vụ hoặc phân quyền, thêm kiểm thử tại lớp thích hợp rồi ghi rõ lệnh và kết quả thực chạy.

## Lệnh chính

| Kiểm tra | Lệnh và điều kiện |
| --- | --- |
| Backend integration | Từ `backend/`: `dotnet test TFrench.sln` với .NET 10 SDK |
| Backend qua Docker | Từ thư mục gốc: dùng lệnh container SDK 10 trong [README.md](../README.md) |
| Frontend production build | Từ `frontend/`: `npm run build -- --configuration production` |
| API smoke tests | Chạy backend Development trước; từ `backend/tests/` chạy `./run-all.sh` trong Bash theo [hướng dẫn](../backend/tests/README.md) |
| Kiểm tra diff | `git diff --check` và xem `git status --short --branch` |

## Phạm vi kiểm thử hiện có

- `backend/TFrench.API.Tests/LearningWorkflowTests.cs` có bốn integration tests dùng database SQLite tạm: health, worker chốt quiz hết giờ, ghi danh miễn phí/trả phí và chuyển lead, luồng quiz gồm bảo mật đáp án/autosave/chấm điểm.
- `backend/tests/` có ba smoke suites cho file, lead và blog. Chúng cần API đang chạy và dữ liệu mẫu Development; xem README của thư mục đó trước khi chạy.
- `frontend/` có cấu hình Karma và lệnh `npm test`, nhưng chưa có test `*.spec.ts`. Repository cũng chưa có browser E2E hoặc workflow CI.

Build thành công không chứng minh quyền truy cập, khôi phục dữ liệu hay môi trường production đã đúng. Những khoảng trống này được theo dõi tại [STATUS.md](STATUS.md).
