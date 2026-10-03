# Validation

Các lệnh kiểm tra và phạm vi phủ nằm ở đây; kết quả chạy gần nhất có ngày nằm trong [STATUS.md](STATUS.md). Khi sửa nghiệp vụ hoặc phân quyền, thêm kiểm thử tại lớp thích hợp rồi ghi rõ lệnh và kết quả thực chạy.

## Lệnh chính

| Kiểm tra | Lệnh và điều kiện |
| --- | --- |
| Backend integration | Từ `backend/`: `dotnet test TFrench.sln` với .NET 10 SDK |
| Backend qua Docker | Từ thư mục gốc: dùng lệnh container SDK 10 trong [README.md](../README.md) |
| Frontend production build | Từ `frontend/`: `npm run build -- --configuration production` |
| Frontend unit test | Từ `frontend/`: `npm test -- --watch=false --browsers=ChromeHeadless`; cần Chrome/Chromium |
| API smoke tests | Chạy backend Development trước; từ `backend/tests/` chạy `./run-all.sh` trong Bash theo [hướng dẫn](../backend/tests/README.md) |
| Kiểm tra diff | `git diff --check` và xem `git status --short --branch` |

## Phạm vi kiểm thử hiện có

- `backend/TFrench.API.Tests/LearningWorkflowTests.cs` có tám integration tests dùng database SQLite tạm: health, worker chốt quiz hết giờ, ghi danh miễn phí/trả phí và chuyển lead, luồng quiz gồm bảo mật đáp án/autosave/chấm điểm, quyền tài liệu/bài tập giữa hai lớp cùng khóa, sửa nháp và khóa sửa quiz, vòng đời nháp/công bố/đóng bài tập, nộp đồng thời/thử lại an toàn. Ca quyền kiểm tra cả danh sách, chi tiết, tải file, nộp/chấm/xóa bài, Enrollment Pending và ngăn sửa làm mất phạm vi lớp. Ca nộp bài kiểm tra cả unique index và giữ bài/file/điểm cũ. File test dùng thư mục tạm riêng.
- `backend/tests/` có ba smoke suites cho file, lead và blog. Chúng cần API đang chạy và dữ liệu mẫu Development; xem README của thư mục đó trước khi chạy.
- `frontend/src/app/view/quiz/quiz.spec.ts` kiểm tra cuộc đua autosave, nộp/quay lại trong lúc lưu, lỗi lưu và xung đột hai tab. Repository vẫn chưa có browser E2E hoặc workflow CI.
- `frontend/src/app/view/quiz/quiz-authoring.spec.ts` kiểm tra sửa nháp giữ giờ/câu hỏi/đáp án, lỗi lưu giữ nội dung, cảnh báo rời trang và xung đột công bố từ phiên khác.

Build thành công không chứng minh quyền truy cập, khôi phục dữ liệu hay môi trường production đã đúng. Những khoảng trống này được theo dõi tại [STATUS.md](STATUS.md).
