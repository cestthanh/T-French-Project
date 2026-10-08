# T-French

Nền tảng cho một trung tâm tiếng Pháp nhỏ: website giới thiệu và blog, quản lý tài khoản, khóa học/lớp học, ghi danh, tài liệu, bài tập, quiz và lịch luyện nói.

**Người mới:** làm theo mục 1 → 2 → 3 hoặc 4 → 5 → 6 bên dưới để chạy và thử ứng dụng. Các lệnh dùng PowerShell; mở terminal tại thư mục được chỉ rõ trước mỗi nhóm lệnh.

**Tiếp tục phát triển:** đọc [trạng thái hiện tại](docs/STATUS.md), chạy `git status --short --branch`, rồi đọc [AGENTS.md](AGENTS.md). [Đề xuất phát triển](DE_XUAT_PHAT_TRIEN_DU_AN.md) có cả đánh giá lịch sử và roadmap đề xuất; đối chiếu STATUS và code để biết phần đã làm.

## 1. Chọn cách chạy và cài công cụ

| Cách chạy | Phù hợp khi | Cần cài | Địa chỉ giao diện |
| --- | --- | --- | --- |
| **A — .NET + Node** | Sửa code, xem thay đổi ngay, dùng nút đăng nhập demo | Git, .NET 10 SDK, Node.js/npm | `http://localhost:4200` |
| **B — Docker** | Chạy ứng dụng đã build mà không cài .NET/Node trên máy | Git, Docker Desktop với Linux containers | `http://localhost:8089` |

Cài công cụ từ nguồn chính thức:

- [Git](https://git-scm.com/downloads/).
- [.NET 10 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/10.0): chọn **SDK**, chỉ cài Runtime thì chưa đủ để build/chạy source.
- [Node.js](https://nodejs.org/en/download): dùng **Node 22 từ 22.12 trở lên trong nhánh 22**, tương ứng môi trường CI. Angular 21 cũng hỗ trợ Node `^20.19.0` và `^24.0.0`; xem [bảng tương thích Angular](https://angular.dev/reference/versions). npm đi cùng Node; không cần cài Angular CLI toàn cục.
- [Docker Desktop](https://docs.docker.com/desktop/): khởi động ứng dụng và chọn Linux containers trước khi dùng cách B.

Sau khi cài, mở terminal mới. Với cách A, kiểm tra:

```powershell
git --version
dotnet --list-sdks
node --version
npm --version
```

Danh sách SDK cần có `10.0.x`; Node cần đáp ứng phiên bản trên. Với cách B, kiểm tra:

```powershell
git --version
docker version
```

`docker version` cần hiện cả **Client** và **Server**. SQLite được ứng dụng tự tạo; không cần cài database server hoặc import file database. Lần cài dependency/build đầu tiên cần mạng để tải package và image.

## 2. Tải code đúng nhánh

Mở terminal ở nơi bạn muốn lưu dự án:

```powershell
git clone --branch tuanthanh_dev https://github.com/cestthanh/T-French-Project.git
cd T-French-Project
git status --short --branch
```

Nếu repository yêu cầu đăng nhập, dùng tài khoản GitHub được cấp quyền. Không đặt token vào URL clone.

**Thư mục gốc** trong hướng dẫn là nơi chứa `README.md`, `Dockerfile`, `frontend/` và `backend/`. Tên thư mục trên máy có thể khác, ví dụ `D:\T-French Project`. Từ đây chọn cách A hoặc B; hai cách lưu dữ liệu riêng.

Nếu đã có code, kiểm tra `git status` trước. Khi đang ở `tuanthanh_dev`, working tree sạch và không có công việc local cần giữ, cập nhật bằng:

```powershell
git pull --ff-only
```

## 3. Cách A — chạy backend và frontend riêng

### 3.1. Terminal thứ nhất: backend

Mở terminal tại **thư mục gốc**:

```powershell
cd backend
dotnet restore TFrench.sln
dotnet run --project TFrench.API --launch-profile http
```

Giữ terminal này mở. Chờ log báo đang lắng nghe tại `http://localhost:5083`. Profile `http` đặt môi trường `Development`; backend tự chạy migration và tạo tài khoản/lớp mẫu khi khởi động.

Mở `http://localhost:5083/health` để kiểm tra backend và kết nối SQLite. API có tiền tố `http://localhost:5083/api`; cổng này phục vụ API khi chạy cách A.

### 3.2. Terminal thứ hai: frontend

Mở **terminal mới tại thư mục gốc**, không mở từ thư mục `backend/` của terminal thứ nhất:

```powershell
cd frontend
npm ci
npm start
```

Chờ Angular build xong, sau đó mở **`http://localhost:4200`**. Hai terminal phải cùng hoạt động. `npm ci` cài theo lockfile; sau lần đầu chỉ cần `npm start`, trừ khi dependency/lockfile thay đổi.

Frontend development gọi API tại `http://localhost:5083/api`, cấu hình trong [environment.ts](frontend/src/environments/environment.ts). Khi bắt đầu, giữ nguyên cổng và dùng `localhost` cho UI để khớp CORS. Không cần tự tạo JWT secret cho môi trường Development.

## 4. Cách B — chạy toàn bộ bằng Docker

Từ **thư mục gốc**, khi Docker Desktop đang chạy:

```powershell
docker build -t tfrench-demo .
docker volume create tfrench-demo-data
docker run -d --name tfrench-demo -p 127.0.0.1:8089:8080 -v tfrench-demo-data:/data -e ASPNETCORE_ENVIRONMENT=Development -e DemoData__Enabled=true -e Frontend__ServeInDevelopment=true tfrench-demo
docker logs -f tfrench-demo
```

Chờ log khởi động thành công. Nhấn `Ctrl+C` để ngừng xem log; container vẫn chạy. Mở:

- Giao diện: **`http://localhost:8089`**.
- Đăng nhập: `http://localhost:8089/auth/login`.
- Health: `http://localhost:8089/health`.
- API: `http://localhost:8089/api`.

Docker build Angular và backend trong cùng image; frontend dùng `/api` cùng địa chỉ. `Frontend__ServeInDevelopment=true` cho phép backend Development phục vụ giao diện đã build. Bỏ biến này thì container Development chỉ phục vụ API.

Đây là cách chạy **demo cục bộ**, có dữ liệu mẫu. Database và upload lưu trong volume `tfrench-demo-data`, không dùng chung với cách A. Nếu container tên `tfrench-demo` đã tồn tại, dùng `docker start tfrench-demo` theo mục 7 thay vì chạy lại lệnh tạo container.

## 5. Đăng nhập lần đầu

Database demo mới có khóa **Tiếng Pháp A1 — Cơ bản**, **Lớp A1 Demo**, giáo viên được giao lớp và học viên đã ghi danh Active. Seeder có thể giữ khóa/lớp đã tồn tại nếu bạn dùng database cũ.

| Vai trò | Email demo | Dùng để thử |
| --- | --- | --- |
| Admin | `admin@tfrench.vn` | Quản lý tài khoản, khóa/lớp, ghi danh |
| Teacher | `teacher@tfrench.vn` | Đưa tài liệu, giao/chấm bài, tạo/chấm quiz |
| Student | `student@tfrench.vn` | Xem lớp/tài liệu, nộp bài, làm quiz, xem kết quả |

**Cách A:** mở `http://localhost:4200/auth/login`, chọn nút **Admin**, **Teacher** hoặc **Student** trong phần **Tài khoản demo** để điền thông tin, rồi bấm **Đăng nhập**.

**Cách B:** frontend được build production nên ẩn các nút điền demo. Xem thông tin đăng nhập mẫu tại ba lệnh `UpsertUser` đầu tiên của [DataSeeder.cs](backend/TFrench.API/Services/DataSeeder.cs), rồi nhập vào trang đăng nhập. Backend của container demo vẫn tạo các tài khoản này.

Để chuyển vai trò, đăng xuất rồi đăng nhập lại; hoặc dùng các hồ sơ trình duyệt riêng. Các tab trong cùng hồ sơ dùng chung phiên đăng nhập.

## 6. Thử một vòng học tập hoàn chỉnh

Dùng lớp demo có sẵn để thử nhanh. Nếu tự tạo dữ liệu, Admin cần tạo khóa/lớp, giao giáo viên và ghi danh học viên vào đúng lớp ở trạng thái **Active** trước.

### 6.1. Tài liệu và bài tập

1. **Admin:** vào **Lớp học** (`/dashboard/classes`), kiểm tra giáo viên và học viên của lớp.
2. **Teacher:** vào **Tài liệu** (`/dashboard/resources`), tạo tài liệu cho lớp; dùng file hoặc đường dẫn ngoài.
3. **Teacher:** vào **Bài tập** (`/dashboard/assignments`), chọn lớp, nhập yêu cầu và hạn. Để thử ngay, giờ mở phải đã tới và hạn nộp còn ở tương lai. Lưu nháp, xem trước rồi **Công bố cho lớp**. Nếu nhận trễ, bật tùy chọn đó và đặt thời điểm khóa nhận bài sau hạn.
4. **Student:** vào **Lớp học & bảng điểm** (`/dashboard/learning`), chọn lớp, mở tài liệu/bài tập và nộp file, link hoặc ghi chú. Kiểm tra biên nhận bài đã nộp.
5. **Teacher:** mở bài tập, chấm điểm và nhận xét, rồi bấm **Công bố kết quả** cho bài nộp.
6. **Student:** xem kết quả tại bài tập và bảng điểm. Điểm đang chấm nháp chưa hiển thị; giáo viên phải công bố.
7. Nếu cần thử nộp lại, **Teacher** dùng **Cấp lượt nộp lại**, nhập lý do và hạn riêng. **Student** nộp lượt mới; bài/file/điểm của lượt trước vẫn nằm trong lịch sử.

Bài tập mới mặc định khóa nhận bài khi hết hạn; hệ thống không tự trừ điểm nộp trễ. Một lượt nộp là mặc định, lượt sau cần được cấp. Khi chấm lại, giáo viên cần công bố kết quả lại.

### 6.2. Kiểm tra online (quiz)

1. **Teacher:** vào **Quiz** (`/dashboard/quizzes`), chọn lớp, đặt giờ mở/đóng và thời lượng; thêm câu một đáp án, nhiều đáp án hoặc tự luận. Hoặc bấm **Nhập từ file Word** để chọn file `.docx` hay dán nội dung từ Word; câu hỏi được đưa vào trình soạn để kiểm tra trước. Cách soạn và file mẫu nằm ngay trong khung nhập (`frontend/src/assets/templates/mau-de-kiem-tra.docx`). Với phần nghe, dán link Google Drive vào mô tả hoặc câu hỏi; học viên bấm link để mở. Xem trước, lưu nháp rồi công bố.
2. **Student:** mở quiz khi trong khung giờ cho phép, bắt đầu làm bài, kiểm tra trạng thái tự lưu rồi nộp. Có thể tải lại trang để tiếp tục lượt đang làm; mỗi học viên có một lượt cho mỗi quiz.
3. **Teacher:** chấm phần tự luận nếu có. Sau giờ đóng đề, bấm **Công bố kết quả đã chấm**.
4. **Student:** xem điểm đã công bố trong kết quả/bảng điểm. Quyền xem đáp án đúng phụ thuộc cấu hình của đề.

Đặt giờ đóng gần hiện tại nếu muốn thử công bố điểm ngay trong một buổi demo. Giờ hiển thị theo trình duyệt; server kiểm tra deadline bằng UTC.

## 7. Dừng, chạy lại và giữ dữ liệu

### Cách A

Nhấn `Ctrl+C` ở cả hai terminal. Lần sau chạy lại lệnh `dotnet run` ở mục 3.1 và `npm start` ở mục 3.2. Theo cấu hình mặc định:

- Database: `backend/TFrench.API/tfrench.db`.
- Upload: `backend/TFrench.API/storage/uploads/`.

Không cần chạy migration bằng tay mỗi lần; backend thực hiện khi khởi động. Database và upload không được đưa vào Git. Khi cần sao lưu dữ liệu, sao lưu cả hai theo [runbook](docs/OPERATIONS_RUNBOOK.md).

### Cách B

```powershell
docker stop tfrench-demo
docker start tfrench-demo
docker logs --tail 100 tfrench-demo
```

Volume `tfrench-demo-data` giữ database/upload qua lần dừng hoặc tạo lại container. Để cập nhật code cho container demo, từ thư mục gốc:

```powershell
docker stop tfrench-demo
docker rm tfrench-demo
docker build -t tfrench-demo .
docker run -d --name tfrench-demo -p 127.0.0.1:8089:8080 -v tfrench-demo-data:/data -e ASPNETCORE_ENVIRONMENT=Development -e DemoData__Enabled=true -e Frontend__ServeInDevelopment=true tfrench-demo
```

Các lệnh trên chỉ tạo lại container demo, vẫn gắn volume cũ. Giữ volume nếu cần dữ liệu; trước khi nâng cấp dữ liệu thật, thực hiện backup và thử migration theo runbook.

## 8. Chạy kiểm thử và build

### Backend

Từ thư mục gốc, với .NET 10 SDK:

```powershell
cd backend
dotnet test TFrench.sln --verbosity minimal
```

Nếu chỉ có Docker, chạy từ **thư mục gốc**:

```powershell
$repoPath = (Get-Location).Path
docker run --rm --mount "type=bind,source=$repoPath,target=/src" -w /src/backend mcr.microsoft.com/dotnet/sdk:10.0 dotnet test TFrench.sln --verbosity minimal
```

### Frontend

Mở terminal tại thư mục gốc; unit tests cần Google Chrome:

```powershell
cd frontend
npm ci
npm test -- --watch=false --browsers=ChromeHeadless
npm run build -- --configuration production
```

Nếu không tìm thấy Chrome trên Windows, đặt `CHROME_BIN` tới file thực tế rồi chạy lại test, ví dụ:

```powershell
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm test -- --watch=false --browsers=ChromeHeadless
```

Build frontend tạo `frontend/dist/frontend/browser/`; cách A vẫn cần backend riêng. Dockerfile tự đưa bản build vào backend để phục vụ cùng địa chỉ.

### Browser E2E — dùng server test riêng

E2E tạo và thay đổi dữ liệu. Từ **thư mục gốc**, tạo server test riêng ở cổng **8090**, tách khỏi demo và dữ liệu người dùng:

```powershell
docker build -t tfrench-e2e .
docker run -d --name tfrench-e2e -p 127.0.0.1:8090:8080 -e ASPNETCORE_ENVIRONMENT=Development -e DemoData__Enabled=true -e Frontend__ServeInDevelopment=true tfrench-e2e
```

Chờ `http://localhost:8090/health` hoạt động, rồi mở terminal mới tại thư mục gốc:

```powershell
cd frontend
npm ci
npx playwright install chromium
$env:TFRENCH_E2E_URL = 'http://127.0.0.1:8090'
npm run test:e2e
```

Sau test, dọn **container test** từ terminal Docker:

```powershell
docker stop tfrench-e2e
docker rm tfrench-e2e
```

Container test không gắn volume demo; xóa nó sẽ bỏ dữ liệu test. Các smoke tests Bash khác có hướng dẫn tại [backend/tests/README.md](backend/tests/README.md). [Workflow CI](.github/workflows/validation.yml) chạy backend, frontend, E2E và staging/restore trên GitHub; kết quả thực tế có ngày ở [STATUS.md](docs/STATUS.md).

## 9. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| `dotnet`, `node`, `npm` không được nhận diện | Kiểm tra đã cài công cụ ở mục 1; mở terminal mới để cập nhật PATH |
| `NETSDK1045` hoặc SDK không hỗ trợ .NET 10 | Cài .NET 10 **SDK**, kiểm tra `dotnet --list-sdks`; hoặc dùng cách B |
| PowerShell chặn `npm.ps1` | Dùng `npm.cmd ci`, `npm.cmd start` và `npm.cmd run ...` tương ứng |
| Frontend mở được nhưng đăng nhập/API lỗi kết nối | Kiểm tra backend đang chạy, `/health` trên cổng 5083 và UI dùng `http://localhost:4200`; xem lỗi backend và Network của trình duyệt |
| Cổng 4200/5083/8089 đã được dùng | Dừng phiên ứng dụng cũ đang dùng cổng; nếu đổi cổng development, cập nhật cả API URL và CORS, không chỉ đổi lệnh chạy |
| Docker báo không kết nối daemon/Linux engine | Mở Docker Desktop, chờ engine sẵn sàng, kiểm tra lại `docker version` |
| Docker báo tên container đã tồn tại | Dùng `docker start tfrench-demo`; để cập nhật image, theo quy trình tạo lại ở mục 7 |
| Docker có health nhưng giao diện trả 404 | Container Development cần `Frontend__ServeInDevelopment=true`; tạo lại container theo mục 7 |
| Không thấy nút tài khoản demo trong Docker | Đây là frontend build production; đăng nhập bằng dữ liệu mẫu ở mục 5 |
| Học viên không thấy bài/tài liệu của lớp | Kiểm tra Enrollment **Active**, đúng lớp; bài/quiz đã công bố và tới giờ mở |
| Học viên chưa thấy điểm | Giáo viên cần công bố kết quả; quiz chỉ công bố sau giờ đóng đề |
| Upload bị từ chối | Kiểm tra loại file được phép theo thông báo và giới hạn mặc định 25 MiB; xem lỗi API |

## 10. Staging và triển khai

Sau khi chạy demo thành công, xem [OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md) để chạy staging Production ở cổng 8088 bằng `compose.staging.yaml`, tạo Admin đầu tiên, kiểm kê dữ liệu và thử backup/restore. Công cụ `ops/` cần Python 3.11 trở lên cho quy trình trong runbook/CI; Python không bắt buộc để chạy ứng dụng.

Production yêu cầu JWT secret và cấu hình bootstrap Admin khi chưa có Admin; không tạo tài khoản demo. Giữ secret ổn định, dùng volume riêng cho database/upload và lưu thông tin đăng nhập ở nơi riêng. Không đưa mật khẩu, token, database hoặc file người dùng vào Git/tài liệu.

Triển khai Railway theo [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md). Repository có cấu hình và bằng chứng kiểm thử cục bộ; trạng thái triển khai thật, backup định kỳ và restore trên môi trường đích cần được xác nhận riêng trong STATUS.

## Cấu trúc repository

| Đường dẫn | Nội dung |
| --- | --- |
| `frontend/` | Angular 21: website, dashboard và browser tests |
| `backend/TFrench.API/` | ASP.NET Core/.NET 10, EF Core, SQLite, migration và nghiệp vụ |
| `backend/TFrench.API.Tests/` | Integration tests với SQLite tạm |
| `backend/tests/` | Smoke tests Bash với API đang chạy |
| `ops/` | Audit dữ liệu, backup/restore và production smoke |
| `Dockerfile`, `compose.staging.yaml` | Image chung frontend/API và môi trường staging |
| `.github/workflows/validation.yml` | Workflow kiểm tra khi push/PR/manual |
| `docs/`, `AGENTS.md` | Trạng thái, quyết định, thiết kế và hướng dẫn bàn giao |

## Bản đồ tài liệu cho phiên mới

[AGENTS.md](AGENTS.md) là điểm vào với sáu mục: [Product intent](docs/PRODUCT_INTENT.md), [Architecture](docs/ARCHITECTURE.md), [Active plans](docs/STATUS.md), [Decisions](docs/DECISIONS.md), [Reliability](docs/RELIABILITY.md) và [Validation](docs/VALIDATION.md).

- [Đánh giá tài liệu, bài tập và quiz](docs/LEARNING_ASSESSMENT_PLAN.md).
- [Sơ đồ ba vai trò và kế hoạch W0–W7](docs/LEARNING_WORKFLOWS_IMPLEMENTATION_PLAN.md).
- [Phạm vi và chính sách đợt hoàn thiện học tập](docs/LEARNING_COMPLETION_EXECUTION.md).
- [Vận hành staging, E2E và backup/restore](docs/OPERATIONS_RUNBOOK.md).
- [Mục tiêu ban đầu](context.txt), [thiết kế giao diện ban đầu](new_prompt_frontend.md) và [nhật ký phát triển](DE_XUAT_PHAT_TRIEN_DU_AN.md).
