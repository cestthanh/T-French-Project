# Đề xuất phát triển nền tảng T-French

> Tài liệu thảo luận và duyệt ý tưởng — chưa phải kế hoạch triển khai.
>
> Ngày đánh giá: 22/09/2026

## 1. Kết luận và định hướng đề xuất

T-French hiện đã có nền tảng tốt cho một sản phẩm lai giữa:

- Website marketing và blog.
- Hệ thống quản lý học tập nội bộ (LMS).
- Quản lý khách hàng quan tâm (CRM đơn giản).
- Quản lý lịch luyện nói.

Định hướng phù hợp nhất là tiếp tục phát triển theo mô hình **modular monolith**: một frontend Angular, một backend ASP.NET Core và một cơ sở dữ liệu. Quy mô trung tâm nhỏ chưa cần microservice. Điều quan trọng trước mắt là hoàn thiện các luồng nghiệp vụ, siết bảo mật và tạo khả năng vận hành ổn định.

Đề xuất chia mục tiêu thành ba mức:

1. **An toàn để vận hành:** không lộ secret, không còn tài khoản demo, cấu hình production đúng, dữ liệu có backup và các quyền truy cập được kiểm tra chặt chẽ.
2. **Hoàn chỉnh nghiệp vụ cốt lõi:** quản lý khóa học/lớp học, ghi danh, bài tập, tài liệu và lịch học không còn phụ thuộc vào việc nhập ID thủ công.
3. **Tăng trưởng:** SEO, thanh toán, tự động hóa CRM, thông báo, báo cáo và các tính năng AI có kiểm soát.

## 2. Nguyên tắc sản phẩm

### 2.1. Đơn giản cho trung tâm nhỏ

- Không xây quá nhiều phân hệ trước khi luồng chính chạy trọn vẹn.
- Mỗi vai trò chỉ nhìn thấy các công cụ thực sự cần dùng.
- Các thao tác thường xuyên phải thực hiện được mà không cần biết ID kỹ thuật.
- Ưu tiên tự động hóa các việc lặp lại: nhắc lịch, nhắc hạn bài, gửi xác nhận và tổng hợp báo cáo.

### 2.2. Một nguồn dữ liệu thống nhất

- Một người chỉ có một tài khoản nhưng có thể được gán nhiều vai trò nếu sau này cần.
- Khóa học, lớp học, buổi học, tài liệu, bài tập và lịch luyện nói phải liên kết rõ ràng.
- Khách tư vấn khi chuyển thành học viên có thể liên kết với tài khoản mới, không phải nhập lại dữ liệu.

### 2.3. Bảo mật theo dữ liệu, không chỉ theo màn hình

- Ẩn nút trên frontend chỉ là trải nghiệm người dùng; mọi quyền phải được kiểm tra lại ở backend.
- Quyền truy cập tài liệu phải dựa trên khóa học/lớp học và trạng thái ghi danh.
- Mọi hành động nhạy cảm cần có lịch sử audit.

## 3. Thứ tự ưu tiên tổng thể

| Mức | Nội dung | Lý do |
|---|---|---|
| P0 | Cấu hình production, secret, tài khoản demo, validation và lỗi 500 | Blocker trước khi có người dùng thật |
| P0 | Sửa quyền sở hữu khóa học/tài liệu/bài tập/lịch | Tránh truy cập hoặc thay đổi dữ liệu trái phép |
| P0 | Backup, phục hồi và nhật ký audit | Bảo vệ dữ liệu vận hành |
| P1 | Quản lý khóa học/lớp học và ghi danh hoàn chỉnh | Xương sống của toàn hệ thống |
| P1 | Hoàn thiện LMS, tài liệu và booking | Giá trị chính cho học viên/giáo viên |
| P1 | Email/thông báo và quy trình CRM | Giảm việc thủ công cho trung tâm |
| P1 | SEO kỹ thuật cho portal/blog | Tạo kênh thu hút khách hàng |
| P2 | Thanh toán, báo cáo nâng cao, chứng chỉ | Mở rộng kinh doanh |
| P2 | AI hỗ trợ học tập và tư vấn | Chỉ làm khi dữ liệu và quy trình đã ổn định |

## 4. Đề xuất tính năng theo phân hệ

### 4.1. Tài khoản và xác thực

#### Nên có trong bản vận hành đầu tiên

- Xác minh email sau khi đăng ký.
- Quên mật khẩu và đặt lại mật khẩu bằng token dùng một lần.
- Cho phép người dùng xem và đăng xuất các phiên đang hoạt động.
- Admin có thể khóa/mở khóa tài khoản thay vì chỉ xóa.
- Buộc đổi mật khẩu ở lần đăng nhập đầu đối với tài khoản do admin tạo.
- MFA cho Admin; khuyến khích MFA cho Teacher.
- Trang báo rõ phiên đã hết hạn thay vì để các API âm thầm lỗi.
- Ghi nhận lần đăng nhập gần nhất, lần đổi mật khẩu gần nhất và trạng thái tài khoản.

#### Có thể bổ sung sau

- Đăng nhập Google/Microsoft.
- Một người có nhiều vai trò, ví dụ giáo viên đồng thời là quản trị nội dung.
- Tài khoản phụ huynh để theo dõi tiến độ của học viên nhỏ tuổi.

### 4.2. Khóa học, lớp học và ghi danh

Hiện tại `Course` đang gánh cả khái niệm nội dung khóa học và lớp đang diễn ra. Nên tách:

- **Course/Course Template:** sản phẩm đào tạo, ví dụ “Tiếng Pháp A1”.
- **Class/Cohort:** một đợt học cụ thể, có giáo viên, ngày khai giảng, lịch học, sĩ số và trạng thái.
- **Enrollment:** ghi danh của học viên trong một lớp, có trạng thái chờ duyệt/đã xác nhận/tạm dừng/hoàn thành/hủy.

Tính năng đề xuất:

- CRUD khóa học và lớp học bằng UI.
- Chọn giáo viên từ danh sách thay vì tự gán theo người tạo.
- Chương trình học theo chương/bài.
- Ngày bắt đầu, ngày kết thúc, sĩ số tối đa và hình thức online/offline/hybrid.
- Danh sách chờ khi lớp đủ chỗ.
- Ghi danh miễn phí, admin duyệt, hoặc ghi danh sau thanh toán tùy loại khóa học.
- Chuyển lớp, bảo lưu và hủy ghi danh có lý do.
- Tiến độ học tập theo phần trăm bài học/bài tập hoàn thành.
- Xuất danh sách lớp ra CSV/XLSX.

### 4.3. Bài học và nội dung LMS

Nên bổ sung một tầng `Module/Lesson` giữa khóa học và tài liệu/bài tập:

```text
Khóa học → Lớp học → Chương → Bài học → Tài liệu/Bài tập
```

Mỗi bài học có thể có:

- Nội dung rich text.
- Video, audio, PDF và link ngoài.
- Thứ tự hiển thị.
- Điều kiện mở khóa theo ngày hoặc theo bài trước.
- Trạng thái đã xem/đã hoàn thành.
- Ghi chú cá nhân và bookmark của học viên.

### 4.4. Bài tập và chấm điểm

#### Nên bổ sung

- Sửa bài tập trên giao diện.
- Lưu nháp và hẹn giờ công bố bài tập.
- Cho phép cấu hình nộp trễ, số lần nộp và hạn cuối tuyệt đối.
- Học viên có thể nộp lại; lưu lịch sử từng phiên bản thay vì ghi đè.
- Rubric chấm điểm theo tiêu chí.
- Thang điểm cấu hình theo bài: 10, 100 hoặc đạt/không đạt.
- Validate điểm ở backend.
- Giáo viên trả file đã sửa, audio nhận xét hoặc nhận xét theo đoạn.
- Chấm hàng loạt và lọc “chưa chấm”.
- Gradebook theo lớp và xuất điểm.
- Thông báo khi có bài mới, sắp hết hạn hoặc đã được chấm.
- Audit ai đã sửa điểm và sửa lúc nào.

#### Có thể bổ sung sau

- Câu hỏi trắc nghiệm tự chấm.
- Ngân hàng câu hỏi và trộn đề.
- Peer review có ẩn danh.
- Kiểm tra tương đồng giữa các bài nộp.

### 4.5. Quiz/Test online

Phân hệ này **chưa tồn tại trong hệ thống hiện tại**. Assignment hiện chỉ cho học viên nộp file, link hoặc ghi chú rồi giáo viên chấm thủ công; không thể thay thế một bài kiểm tra làm trực tiếp trên web.

Nên xây Quiz/Test thành module riêng nhưng dùng chung Course/Class, deadline, gradebook và notification với LMS.

#### MVP đã thống nhất về mặt ý tưởng

- Giáo viên tạo bài test ở trạng thái nháp, preview rồi publish.
- Hỗ trợ câu hỏi trắc nghiệm một đáp án, nhiều đáp án và tự luận ngắn/dài.
- Giáo viên đặt đáp án đúng, điểm từng câu và lời giải.
- Cấu hình thời gian mở/đóng bài, thời lượng làm bài và số lần được làm.
- Học viên làm trực tiếp trên web; đáp án được tự lưu định kỳ.
- Server quyết định thời gian còn lại và trạng thái nộp, không tin đồng hồ trên trình duyệt.
- Trắc nghiệm được chấm tự động; tự luận chuyển sang hàng chờ giáo viên chấm.
- Tổng điểm chỉ hoàn tất sau khi phần tự luận đã được chấm.
- Giáo viên cấu hình khi nào học viên được xem điểm, đáp án đúng và lời giải.
- Giáo viên xem kết quả theo học viên và thống kê theo từng câu hỏi.

#### Mô hình dữ liệu định hướng

```text
Quiz
  ├── QuizQuestion
  │     └── QuestionOption
  └── QuizAttempt
        └── AttemptAnswer
```

- `Quiz` giữ cấu hình chung, thời gian, số lần làm, chính sách công bố kết quả và liên kết Course/Class/Lesson.
- `QuizQuestion` giữ loại câu hỏi, nội dung, thứ tự, số điểm và rubric nếu là tự luận.
- `QuestionOption` giữ lựa chọn và đáp án đúng; dữ liệu đáp án đúng không được gửi xuống client khi học viên đang làm bài.
- `QuizAttempt` là một lượt làm có thời điểm bắt đầu, deadline phía server, trạng thái và tổng điểm.
- `AttemptAnswer` giữ snapshot câu hỏi/lựa chọn tại thời điểm làm để việc sửa đề sau này không làm thay đổi kết quả cũ.

#### Yêu cầu an toàn và toàn vẹn kết quả

- Chỉ học viên có enrollment hợp lệ mới bắt đầu bài test.
- Tạo attempt và nộp bài phải idempotent, chống double-click/request đồng thời.
- Không gửi đáp án đúng, lời giải hoặc rubric bí mật trong payload làm bài.
- Auto-save có version/concurrency token để tab cũ không ghi đè đáp án mới.
- Hết giờ phải được chốt bởi backend; frontend countdown chỉ để hiển thị.
- Log thời điểm bắt đầu, auto-save, submit, auto-submit và các lần giáo viên sửa điểm.
- Sanitize rich text của câu hỏi và câu trả lời.
- Không quảng cáo khả năng “chống gian lận tuyệt đối”; các biện pháp như trộn câu, trộn đáp án, fullscreen hoặc cảnh báo đổi tab chỉ là tín hiệu hỗ trợ.

#### Mở rộng sau MVP

- Ngân hàng câu hỏi, tag theo CEFR/kỹ năng/chủ đề và tái sử dụng câu hỏi.
- Rút ngẫu nhiên câu hỏi theo blueprint và trộn thứ tự đáp án.
- Audio cho bài nghe, recording cho bài nói và câu hỏi điền khuyết.
- Import/export câu hỏi theo định dạng chuẩn phù hợp.
- Phân tích độ khó, độ phân biệt và tỷ lệ chọn từng đáp án.
- Chấm tự luận theo rubric, chấm ẩn danh và chấm hai vòng nếu cần.
- AI gợi ý phản hồi hoặc sinh câu hỏi, nhưng giáo viên phải duyệt trước khi publish.

#### Các quyết định cần chốt trước khi lập kế hoạch Quiz

- Thang điểm mặc định và quy tắc làm tròn.
- Một hay nhiều lượt làm; lấy điểm cao nhất, mới nhất hay trung bình.
- Có cho quay lại câu trước không.
- Có cho nộp muộn hoặc tiếp tục khi mất kết nối không.
- Khi nào hiển thị điểm, đáp án đúng và lời giải.
- Tự luận có bắt buộc giáo viên chấm trước khi công bố điểm trắc nghiệm không.
- MVP có cần câu hỏi nghe/nói hay chỉ trắc nghiệm + viết như yêu cầu hiện tại.

#### Tiêu chí hoàn thành MVP

1. Giáo viên tạo và publish được đề kết hợp trắc nghiệm + tự luận.
2. Học viên hợp lệ làm bài, reload trang vẫn tiếp tục đúng attempt và không mất đáp án đã lưu.
3. Server tự nộp hoặc từ chối thay đổi khi hết giờ.
4. Phần trắc nghiệm được chấm đúng và không lộ đáp án trước thời điểm cho phép.
5. Giáo viên chấm tự luận; tổng điểm và phản hồi hiển thị theo publication policy.
6. Có integration test cho quyền truy cập, timer, auto-save, grading và hai request đồng thời.

### 4.6. Kho tài liệu

#### Hoàn thiện nghiệp vụ

- Chọn khóa học/lớp học bằng dropdown; không nhập ID.
- Sửa metadata và thay file từ giao diện.
- Phân loại theo thư mục, tag, loại file và bài học.
- Quyền truy cập rõ ràng: công khai, toàn bộ học viên, một khóa học, một lớp học hoặc một nhóm người.
- Preview PDF, ảnh, audio/video nếu định dạng phù hợp.
- Theo dõi phiên bản tài liệu.
- Hiển thị dung lượng sử dụng theo khóa/lớp/người tải lên.
- Chính sách hết hạn hoặc tự ẩn tài liệu.

#### Bảo vệ nội dung

- File private luôn đi qua endpoint kiểm tra quyền.
- Link tải có thời hạn nếu chuyển sang object storage.
- Không coi GUID khó đoán là cơ chế phân quyền.
- Có job dọn file upload nhưng không được gắn với bản ghi nào.
- Quét virus/malware trước khi cho tải xuống.
- Kiểm tra MIME bằng nội dung/signature, không chỉ phần mở rộng.
- Giới hạn tổng quota và tần suất upload.
- Với video giá trị cao, cân nhắc streaming/HLS và watermark; không hứa “chống tải tuyệt đối” vì điều đó không khả thi trên web.

### 4.7. Booking và lịch học

#### Bản hoàn chỉnh tối thiểu

- Giáo viên chọn lớp/khóa học từ dropdown.
- Chỉ tạo slot cho lớp mình phụ trách; admin được chọn giáo viên.
- Không tạo hoặc đặt slot trong quá khứ.
- Học viên chỉ đặt lịch thuộc lớp mình đang học, trừ slot được đánh dấu công khai.
- Cấu hình thời hạn được đặt và thời hạn được hủy.
- Kiểm soát double booking bằng transaction/constraint, không chỉ kiểm tra trước khi lưu.
- Hiển thị múi giờ rõ ràng và lưu thời gian theo UTC.
- Lịch dạng tuần/tháng và bộ lọc giáo viên/lớp.
- Slot lặp lại hàng tuần.
- Trạng thái: trống, đã đặt, đã xác nhận, hoàn thành, học viên vắng, giáo viên vắng, đã hủy.
- Lý do hủy và lịch sử thay đổi.
- Email/thông báo nhắc trước buổi học.

#### Mở rộng

- Danh sách chờ khi slot đã đầy.
- Tự động gửi link Google Meet/Teams/Zoom.
- Đồng bộ Google Calendar hoặc Outlook Calendar.
- Credit/quota buổi luyện nói theo gói học.

### 4.8. Blog, CMS và SEO

#### CMS

- Trình soạn thảo rich text an toàn.
- Draft, preview, scheduled publishing và revision history.
- Category riêng thay vì chỉ lưu chuỗi tag.
- Thư viện ảnh và tối ưu kích thước ảnh.
- Tác giả, biên tập viên và quy trình duyệt bài nếu có nhiều nhân sự.
- Canonical URL và redirect khi đổi slug.
- Nội dung liên quan, bài nổi bật và tìm kiếm toàn văn.

#### SEO kỹ thuật

- SSR hoặc prerender cho landing page, course và blog.
- Title/meta description/OpenGraph/Twitter Card theo từng trang.
- Schema.org phù hợp cho Article, Course, Organization và FAQ.
- `sitemap.xml`, `robots.txt`, canonical URL và trang 404 đúng HTTP status.
- URL thân thiện, breadcrumb và internal linking.
- Tối ưu Core Web Vitals, ảnh responsive và lazy loading.
- Theo dõi index/click/conversion bằng công cụ analytics phù hợp.

### 4.9. CRM khách hàng tiềm năng

Nên phát triển `ContactLead` thành một pipeline nhỏ, không cần biến thành CRM lớn:

- Nguồn lead: trang chủ, bài blog, chiến dịch, giới thiệu, sự kiện.
- UTM campaign/source/medium.
- Người phụ trách và ngày cần liên hệ tiếp.
- Timeline cuộc gọi, email, ghi chú và thay đổi trạng thái.
- Nhắc việc quá hạn.
- Phát hiện trùng theo email/số điện thoại nhưng không làm mất lịch sử.
- Chuyển lead thành tài khoản/học viên và ghi danh lớp.
- Mẫu email trả lời nhanh.
- Export và báo cáo tỷ lệ chuyển đổi theo nguồn.
- Consent nhận tư vấn/marketing và khả năng unsubscribe.
- Chính sách lưu trữ/xóa dữ liệu lead không còn cần thiết.

### 4.10. Thông báo

Nên có một `Notification` module thống nhất thay vì gửi rải rác:

- Thông báo trong ứng dụng.
- Email giao dịch: xác minh, quên mật khẩu, xác nhận ghi danh, bài mới, chấm điểm, booking và hủy lịch.
- Tùy chọn nhận thông báo của từng người.
- Template có thể chỉnh sửa bởi admin.
- Hàng đợi gửi lại khi nhà cung cấp email tạm lỗi.
- Trạng thái gửi, lỗi và audit.

SMS/Zalo chỉ nên bổ sung khi có nhu cầu vận hành rõ ràng và đã đánh giá chi phí, consent.

### 4.11. Dashboard và báo cáo

#### Học viên

- Tiến độ khóa học.
- Bài sắp đến hạn/quá hạn.
- Điểm gần đây và phản hồi mới.
- Lịch học sắp tới.
- Hoạt động cần thực hiện tiếp theo.

#### Giáo viên

- Bài chờ chấm.
- Học viên có nguy cơ tụt tiến độ.
- Lịch dạy sắp tới.
- Tỷ lệ nộp bài và điểm trung bình theo lớp.
- Tài liệu/bài học được xem nhiều.

#### Admin

- Lead mới, tỷ lệ chuyển đổi và nguồn lead.
- Doanh thu/ghi danh nếu có thanh toán.
- Lớp sắp đầy, lớp sắp khai giảng.
- Tỷ lệ hoàn thành, attendance và no-show.
- Dung lượng file và lỗi hệ thống gần đây.

Chỉ hiển thị số liệu dẫn đến hành động; tránh dashboard có nhiều biểu đồ nhưng không hỗ trợ quyết định.

### 4.12. Thanh toán và tài chính

Chỉ triển khai sau khi quy trình ghi danh được xác định rõ.

- Đơn hàng và trạng thái thanh toán tách khỏi Enrollment.
- Học phí toàn phần hoặc trả theo đợt.
- Mã giảm giá/học bổng.
- Biên nhận/hóa đơn theo yêu cầu pháp lý thực tế.
- Webhook có chữ ký và cơ chế idempotency.
- Đối soát; không dựa riêng vào redirect từ cổng thanh toán.
- Quy trình hoàn tiền/hủy đơn.

Không lưu thông tin thẻ trên hệ thống T-French.

## 5. Đề xuất bảo mật

### 5.1. Việc bắt buộc trước production

- Đưa JWT key, connection string và thông tin dịch vụ ra secret manager/environment variable.
- Xóa hoặc vô hiệu hóa toàn bộ tài khoản/seed demo trong production.
- Tách cấu hình Development, Staging và Production.
- Bắt buộc HTTPS; cấu hình HSTS và redirect HTTP sang HTTPS.
- Giới hạn CORS đúng domain, không dùng wildcard với credential.
- Thêm global exception handler; không trả stack trace/database exception cho client.
- Trả lỗi theo một schema thống nhất, ví dụ Problem Details.
- Validate toàn bộ DTO ở backend; không tin validation Angular.
- Kiểm tra resource ownership ở mọi endpoint create/update/delete/publish/grade/book.
- Không ghi password, token, nội dung file hoặc PII nhạy cảm vào log.

### 5.2. Session và token

Phương án khuyến nghị:

- Access token ngắn hạn.
- Refresh token xoay vòng, lưu hash trong database.
- Refresh token đặt trong cookie `HttpOnly`, `Secure`, `SameSite` phù hợp.
- Có session ID/token version để thu hồi khi đổi quyền, khóa tài khoản hoặc đổi mật khẩu.
- Admin có thể buộc đăng xuất mọi phiên của một người dùng.

Nếu tiếp tục lưu access token trong `localStorage`, cần hiểu rằng XSS có thể đánh cắp token; khi đó CSP và việc tránh render HTML không tin cậy càng quan trọng.

### 5.3. Phòng chống abuse

- Rate limit cho login, register, reset password, contact lead và upload.
- Account lockout tăng dần sau nhiều lần đăng nhập sai.
- CAPTCHA có điều kiện sau hành vi bất thường, không nhất thiết bắt mọi người dùng giải CAPTCHA.
- Giới hạn request body, độ dài chuỗi, page size và số lượng bản ghi export.
- Idempotency hoặc unique constraint cho ghi danh, nộp bài và booking để chống request đồng thời.

### 5.4. Phân quyền

- Viết authorization policy tập trung thay vì rải nhiều so sánh role thủ công.
- Tách quyền như `Course.Edit`, `Assignment.Grade`, `Lead.Manage`, `Blog.Publish` nếu hệ thống phát triển.
- Teacher chỉ sửa dữ liệu của lớp mình, trừ khi được phân công thêm.
- Admin quan trọng nên có nguyên tắc “không tự xóa/hạ quyền admin cuối cùng”.
- Mọi thay đổi quyền phải ghi audit và làm token hiện có mất hiệu lực.

### 5.5. Audit log

Ghi tối thiểu:

- Ai thực hiện.
- Hành động gì.
- Đối tượng nào.
- Thời điểm, IP và user agent hợp lý.
- Giá trị trước/sau đối với role, điểm, trạng thái lead, ghi danh và publish.
- Correlation ID để truy vết một request xuyên suốt log.

Audit log nên append-only ở cấp ứng dụng và không cho admin thông thường chỉnh sửa.

### 5.6. Dữ liệu cá nhân và quyền riêng tư

- Chỉ thu thập dữ liệu thực sự cần.
- Công bố mục đích sử dụng ở form đăng ký/tư vấn.
- Có consent riêng cho marketing.
- Quy định thời gian giữ lead, log và file bài tập.
- Có quy trình xuất, sửa, ẩn danh hoặc xóa dữ liệu theo yêu cầu hợp lệ.
- Không đưa dữ liệu cá nhân/bài làm vào dịch vụ AI bên ngoài nếu chưa có consent và thỏa thuận xử lý dữ liệu phù hợp.

## 6. Kiến trúc và dữ liệu

### 6.1. Tiếp tục modular monolith

Nên chia backend theo module nghiệp vụ thay vì chỉ theo loại file:

```text
Modules/
  Identity/
  Courses/
  Learning/
  Files/
  Booking/
  Content/
  Leads/
  Notifications/
```

Mỗi module có entity, DTO, validation, service, authorization policy và endpoint liên quan. Chưa cần tách thành nhiều service triển khai độc lập.

### 6.2. Database

- SQLite phù hợp local/demo; production nên cân nhắc PostgreSQL.
- Thêm unique constraint cho Enrollment `(ClassId, StudentId)` và submission phù hợp với chính sách số lần nộp.
- Dùng concurrency token hoặc transaction cho booking.
- Index các cột hay lọc: status, class, due date, published date, assigned user.
- Không trả entity EF trực tiếp; luôn dùng response DTO để tránh lộ trường nhạy cảm và vòng tham chiếu.
- Có migration review và kế hoạch rollback/backup trước khi migrate production.
- Dùng soft delete cho dữ liệu nghiệp vụ cần audit; hard delete cho dữ liệu tạm hoặc theo chính sách xóa riêng tư.

### 6.3. File storage

- Local disk chỉ phù hợp một server và cần backup đồng bộ với database.
- Khi triển khai nhiều instance, chuyển sang S3-compatible object storage hoặc dịch vụ tương đương.
- Database và file storage phải được backup/restore như một cặp nhất quán.
- Có bảng trạng thái quét file và lifecycle dọn file orphan.

### 6.4. Background jobs

Nên dùng background job cho:

- Gửi email.
- Nhắc hạn bài/lịch học.
- Dọn file orphan.
- Tạo thumbnail/preview.
- Scheduled publishing.
- Export báo cáo lớn.

Job cần idempotent, có retry giới hạn và dead-letter/failed-job view.

### 6.5. API

- Chuẩn hóa paging, filter, sort và lỗi.
- Có OpenAPI/Swagger cho môi trường nội bộ.
- API versioning trước khi có mobile app hoặc đối tác tích hợp.
- Cancellation token cho truy vấn/tác vụ dài.
- Không dùng `any` ở frontend cho payload quan trọng; sinh hoặc chia sẻ type từ API schema nếu phù hợp.

## 7. UX, accessibility và chất lượng giao diện

- Thay mọi ô nhập ID bằng autocomplete/select có tên dễ hiểu.
- Có skeleton/error state/retry rõ ràng thay vì im lặng khi API lỗi.
- Confirm dialog riêng cho thao tác nguy hiểm; không phụ thuộc `window.confirm` lâu dài.
- Form hiển thị lỗi ở đúng trường và giữ dữ liệu khi submit lỗi.
- Thiết kế trạng thái empty/loading/error/success cho mọi màn hình.
- Bàn phím sử dụng được toàn bộ chức năng; focus state rõ.
- Label, aria, contrast và kích thước vùng bấm đạt yêu cầu accessibility.
- Kiểm tra mobile thật, đặc biệt bảng admin, gradebook và calendar.
- Chuẩn hóa hiển thị ngày giờ theo locale `vi-VN` và múi giờ người dùng.
- Không hard-code số liệu marketing nếu chưa được xác nhận; cho phép admin cấu hình nội dung quan trọng.
- Trang chi tiết khóa học phải lấy outcomes/curriculum thật từ dữ liệu, không dùng cùng một danh sách tĩnh cho mọi khóa.

## 8. Kiểm thử và tiêu chuẩn hoàn thành

### 8.1. Test pyramid đề xuất

- **Unit tests:** validator, authorization policy, service nghiệp vụ, utility.
- **Integration tests:** API + database thật cho auth, course, enrollment, assignment, file, booking và lead.
- **Frontend component tests:** form, role-specific UI, error/loading state.
- **E2E tests:** các hành trình quan trọng trên browser.
- **Security tests:** truy cập chéo người dùng/lớp, upload nguy hiểm, rate limit, token bị thu hồi.

### 8.2. Hành trình E2E bắt buộc

1. Khách đọc blog → gửi tư vấn → admin xử lý → chuyển thành học viên.
2. Học viên đăng ký → xác minh email → ghi danh lớp → truy cập tài liệu.
3. Giáo viên tạo bài → học viên nộp → giáo viên chấm → học viên nhận thông báo.
4. Giáo viên mở slot → học viên đặt → cả hai nhận nhắc → hủy/hoàn thành đúng chính sách.
5. Admin đổi quyền/khóa tài khoản → phiên cũ bị thu hồi ngay.
6. Người dùng A không thể đọc file, điểm, bài nộp hoặc lịch riêng của người dùng B.

### 8.3. Definition of Done

Một tính năng chỉ được coi là hoàn thành khi:

- Có acceptance criteria được duyệt.
- Backend validation và authorization đầy đủ.
- Có loading/empty/error/success state trên UI.
- Có migration và rollback/backup consideration nếu đổi dữ liệu.
- Có test tự động cho happy path và quyền truy cập.
- Có log/metric cần thiết.
- Không còn secret hoặc dữ liệu demo production.
- Tài liệu vận hành được cập nhật.

## 9. Vận hành và triển khai

### 9.1. Môi trường

- Development, Staging và Production độc lập.
- Mỗi môi trường có database, file store và secret riêng.
- Frontend lấy API URL theo build/runtime config đúng môi trường.
- Seed demo chỉ chạy theo cờ cấu hình Development.

### 9.2. CI/CD

Pipeline tối thiểu:

1. Restore dependencies.
2. Format/lint.
3. Build frontend/backend.
4. Unit/integration tests.
5. Dependency và secret scan.
6. Build artifact/container.
7. Deploy staging.
8. Smoke test.
9. Phê duyệt rồi deploy production.

### 9.3. Quan sát hệ thống

- Structured logging.
- Error tracking.
- Health/readiness endpoint.
- Metric latency, error rate, login failure, email failure, job backlog và dung lượng file.
- Alert có ngưỡng thực tế; tránh gửi quá nhiều cảnh báo vô nghĩa.

### 9.4. Backup và khôi phục

- Backup database tự động.
- Backup file storage cùng thời điểm hợp lý.
- Mã hóa backup và giới hạn người truy cập.
- Kiểm tra restore định kỳ; “có file backup” chưa chứng minh rằng có thể phục hồi.
- Xác định RPO/RTO phù hợp với quy mô trung tâm.

## 10. Hiệu năng và khả năng mở rộng

- Pagination cho toàn bộ danh sách admin, lead, user, submission và file.
- Không tải content blog/file metadata lớn trong list nếu không cần.
- Cache dữ liệu public ít thay đổi như khóa học và blog đã publish.
- CDN cho asset public và ảnh.
- Nén response, image optimization và lazy loading.
- Tránh N+1 query; theo dõi slow query.
- Giới hạn export và chạy export lớn qua background job.
- Chỉ scale ngang khi số liệu thực tế chứng minh cần; không thiết kế phân tán quá sớm.

## 11. Đề xuất AI — chỉ sau khi nền tảng ổn định

### 11.1. Use case có giá trị

- Gợi ý sửa ngữ pháp và diễn đạt cho bài viết tiếng Pháp.
- Sinh bài luyện tập theo trình độ và mục tiêu DELF/DALF.
- Tạo flashcard/tóm tắt từ bài học đã được giáo viên duyệt.
- Transcript và phản hồi phát âm từ bài nói.
- Trợ lý hỏi đáp dựa trên tài liệu của đúng khóa học mà học viên có quyền truy cập.
- Tóm tắt lead và đề xuất việc cần làm tiếp theo cho admin.

### 11.2. Guardrail bắt buộc

- AI chỉ hỗ trợ, giáo viên quyết định điểm và phản hồi chính thức.
- Hiển thị rõ nội dung do AI tạo.
- Không gửi dữ liệu vượt quá phạm vi cần thiết.
- Kiểm tra quyền trước khi đưa tài liệu vào retrieval.
- Có opt-out, retention policy và audit.
- Bộ đánh giá riêng cho tiếng Pháp, trình độ CEFR và lỗi hallucination.
- Theo dõi chi phí trên từng use case; có quota và fallback khi nhà cung cấp lỗi.

## 12. Roadmap đề xuất

### Giai đoạn 0 — Production safety baseline (P0)

- Sửa URL frontend/backend và cấu hình môi trường.
- Di chuyển secret; tắt demo seed production.
- Global error handling và validation DTO.
- Sửa các lỗ hổng ownership/authorization.
- Rate limit cơ bản và audit log hành động nhạy cảm.
- Backup/restore tối thiểu.
- Integration test cho auth, authorization, file và booking.

**Điều kiện qua cổng:** không còn secret/tài khoản mặc định; không còn lỗi 500 với input hợp lệ về mặt giao thức; test truy cập chéo đều bị từ chối.

### Giai đoạn 1 — Khóa học và ghi danh

- Tách Course và Class/Cohort.
- UI quản lý khóa/lớp/giáo viên.
- Enrollment workflow và trạng thái.
- Dropdown thay ID thủ công.
- Liên kết lead → student → enrollment.

**Điều kiện qua cổng:** admin có thể tạo lớp, gán giáo viên, ghi danh học viên và học viên chỉ thấy dữ liệu lớp của mình.

### Giai đoạn 2 — LMS hoàn chỉnh

- Module/Lesson.
- Tài liệu theo lớp/bài học.
- Sửa bài tập, nhiều lần nộp, rubric, gradebook.
- Quiz/Test MVP kết hợp trắc nghiệm một/nhiều đáp án và tự luận.
- Auto-save, timer phía server, auto-grade trắc nghiệm và hàng chờ chấm tự luận.
- Thông báo bài mới/hạn/chấm điểm.
- Test E2E giáo viên–học viên.

### Giai đoạn 3 — Booking hoàn chỉnh

- Calendar UI, recurring slot, timezone.
- Policy đặt/hủy/no-show.
- Transaction/concurrency protection.
- Reminder và tích hợp meeting/calendar nếu cần.

### Giai đoạn 4 — Marketing, SEO và CRM

- SSR/prerender và metadata.
- CMS revision/scheduled publishing.
- Lead timeline, assignment và reminder.
- Analytics/conversion funnel có consent.

### Giai đoạn 5 — Thương mại và tăng trưởng

- Thanh toán/học phí nếu mô hình kinh doanh yêu cầu.
- Báo cáo vận hành.
- Chứng chỉ.
- AI pilot nhỏ với một use case đo lường được.

## 13. Những thứ chưa nên làm ngay

- Microservices, Kubernetes hoặc event streaming phức tạp.
- Mobile app native khi web responsive chưa hoàn chỉnh.
- Gamification lớn trước khi có dữ liệu về hành vi học tập.
- AI chấm điểm tự động hoàn toàn.
- DRM được quảng cáo là chống sao chép tuyệt đối.
- Tích hợp quá nhiều kênh nhắn tin khi chưa có module notification ổn định.
- Dashboard phân tích phức tạp khi dữ liệu đầu vào chưa chuẩn hóa.

## 14. Các quyết định cần duyệt trước khi lập kế hoạch triển khai

### Sản phẩm và kinh doanh

- [x] Khóa học hỗ trợ cả miễn phí và trả phí.
- [x] Miễn phí tự kích hoạt; trả phí chuyển trạng thái chờ Admin xác nhận.
- [x] Tách Course và Class/Cohort.
- [ ] Có học offline/hybrid và cần quản lý phòng học không?
- [x] Quiz/Test MVP cho phép một lượt làm.
- [x] Quiz/Test dùng thang điểm linh hoạt, tính từ tổng điểm các câu hỏi.
- [ ] Chính sách nộp trễ, hủy lịch và no-show là gì?
- [ ] Ai được viết, duyệt và publish blog?

### Dữ liệu và quyền riêng tư

- [ ] Thời gian lưu lead, bài nộp, file và audit log?
- [ ] Có học viên dưới tuổi thành niên không?
- [ ] Có cho phép gửi email marketing không, và consent được lấy thế nào?
- [ ] Có cho phép dùng bài làm/giọng nói với dịch vụ AI bên ngoài không?

### Kỹ thuật và vận hành

- [ ] Hosting dự kiến ở đâu?
- [ ] Chọn PostgreSQL production hay tiếp tục SQLite trong giai đoạn đầu?
- [ ] File lưu local, object storage hay dịch vụ cloud?
- [ ] Nhà cung cấp email nào?
- [ ] Có staging riêng trước production không? Khuyến nghị: có.
- [ ] Ai nhận cảnh báo và chịu trách nhiệm backup/restore?

### Phạm vi giai đoạn đầu

- [ ] Duyệt Giai đoạn 0 — Production safety baseline.
- [ ] Duyệt Giai đoạn 1 — Khóa học và ghi danh.
- [ ] Chọn phân hệ tiếp theo: LMS hay Booking.
- [ ] Tạm hoãn thanh toán và AI cho đến khi core workflow ổn định. Khuyến nghị: có.

## 15. Đề xuất chốt phạm vi gần nhất

Nếu chỉ chọn một đợt triển khai tiếp theo, nên chọn:

> **Harden hệ thống + hoàn thiện quản lý khóa học/lớp học và ghi danh.**

Đợt này tạo nền móng cho gần như mọi tính năng còn lại. Khi quan hệ giữa người dùng, khóa học, lớp học và quyền truy cập đã đúng, việc hoàn thiện tài liệu, bài tập, booking, báo cáo và thanh toán sẽ ít phải sửa lại dữ liệu hơn.

---

## Phụ lục A — Review lại các tính năng đã triển khai

Phụ lục này đánh giá mã nguồn hiện tại, không chỉ dựa trên việc màn hình hoặc endpoint đã tồn tại. Mỗi phân hệ được xếp vào một trong bốn hướng xử lý:

- **Giữ và gia cố:** thiết kế nền tảng hợp lý, chỉ cần sửa lỗi và bổ sung kiểm thử.
- **Refactor:** nghiệp vụ đúng hướng nhưng đang phân tán, trùng lặp hoặc khó mở rộng.
- **Làm lại luồng:** vẫn có thể tái sử dụng một phần code, nhưng mô hình hoặc trải nghiệm hiện tại không đáp ứng nghiệp vụ.
- **Thay thế:** cách hiện tại không phù hợp cho production và nên được thay bằng cơ chế khác.

### A.1. Bảng quyết định nhanh

| Phân hệ hiện tại | Đánh giá | Quyết định đề xuất | Ưu tiên |
|---|---|---|---|
| JWT login/register | Chạy được nhưng vòng đời phiên chưa an toàn | Refactor lớn | P0 |
| Profile/đổi mật khẩu | Luồng cơ bản dùng được | Giữ và gia cố | P1 |
| Course catalog công khai | Hiển thị tốt ở mức demo | Giữ UI, làm lại mô hình dữ liệu | P1 |
| Course management | Thiếu UI và thiếu nghiệp vụ | Làm lại luồng | P1 |
| Enrollment | Chỉ có `IsActive`, chưa phải quy trình ghi danh | Làm lại | P1 |
| Assignment/submission | Core flow khá tốt | Refactor có kiểm soát | P1 |
| File storage | Cách bảo vệ download đúng hướng | Giữ và gia cố | P0/P1 |
| Resource library | Backend khá, UI chưa nối được tài liệu với khóa | Refactor | P1 |
| Booking | Có demo flow nhưng thiếu ràng buộc quan trọng | Làm lại luồng | P1 |
| Public blog | Đọc bài ổn, SEO chưa đạt | Giữ UI, refactor CMS/API | P1 |
| Admin blog | CRUD được nhưng trùng logic với public controller | Refactor | P1 |
| Contact leads | Dùng được cho quy mô nhỏ | Giữ và mở rộng | P1 |
| User administration | Có đổi role/xóa nhưng chưa an toàn | Làm lại thao tác quản trị | P0/P1 |
| Dashboard | Có số liệu hữu ích ban đầu | Giữ và chỉnh lại nguồn dữ liệu | P2 |
| Design system/components | Đồng nhất và tái sử dụng khá tốt | Giữ | P2 |
| Automated tests | Phạm vi quá hẹp | Bổ sung lại theo risk | P0/P1 |

### A.2. Authentication và session

#### Phần nên giữ

- Mật khẩu đã được băm bằng BCrypt.
- JWT có issuer, audience, lifetime và role claim.
- Tài khoản bị `IsActive = false` không đăng nhập mới được.
- Frontend có interceptor gắn bearer token và guard cho route.

#### Điểm chưa ổn

- Kiểm tra email trùng diễn ra trước khi trim/lowercase. Email trùng khác hoa/thường hiện gây database exception và trả `500`.
- Frontend coi “có chuỗi token trong localStorage” là đang đăng nhập, không kiểm tra hết hạn.
- Không có refresh token, thu hồi phiên hoặc danh sách session.
- Đổi role, khóa hoặc xóa tài khoản không làm JWT cũ mất hiệu lực ngay.
- Thông tin user trong localStorage có thể cũ sau khi đổi profile/role.
- Interceptor chưa xử lý `401` tập trung.
- Thiếu xác minh email, quên mật khẩu, rate limit và MFA cho admin.
- Secret JWT và tài khoản demo không phù hợp production.

#### Đề xuất sửa/làm lại

1. Chuẩn hóa email trước mọi truy vấn và lưu trữ; dùng unique index với giá trị normalized.
2. Tách `User`, `Session/RefreshToken` và quy trình thu hồi phiên.
3. Dùng access token ngắn hạn + rotating refresh token HttpOnly.
4. Thêm `SecurityStamp` hoặc `TokenVersion`; thay đổi role/password/lock sẽ vô hiệu token cũ.
5. Frontend khởi tạo phiên bằng endpoint `/auth/me` thay vì tin hoàn toàn vào user JSON trong localStorage.
6. Xử lý `401` một lần ở interceptor: thử refresh hợp lệ, nếu không thì xóa phiên và đưa về login.
7. Thêm email verification, password reset và MFA cho Admin.

#### Tiêu chí nghiệm thu lại

- Email khác hoa/thường không thể tạo hai tài khoản và không gây `500`.
- Khóa hoặc hạ quyền tài khoản làm phiên hiện tại mất quyền ngay.
- Token hết hạn được xử lý rõ ràng, không để UI ở trạng thái đăng nhập giả.
- Không tồn tại secret hoặc tài khoản mặc định trong artifact production.

### A.3. Profile

#### Phần nên giữ

- Xem/sửa tên, số điện thoại, avatar và đổi mật khẩu đã chạy thành luồng riêng.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại.

#### Điểm chưa ổn

- Sau khi sửa tên/avatar, `AuthService.currentUser` và localStorage không được cập nhật; navbar/sidebar có thể hiển thị dữ liệu cũ đến lần đăng nhập sau.
- Avatar nhận URL bên ngoài tùy ý, có thể gây tracking, nội dung hỏng hoặc nguồn không dùng HTTPS.
- Đổi mật khẩu không thu hồi các phiên khác.
- Chưa có quy trình đổi email và xác minh lại.

#### Đề xuất

- API update profile trả về `UserDto` đầy đủ; frontend cập nhật session state ngay.
- Ưu tiên avatar upload qua kho file riêng hoặc kiểm soát domain/HTTPS.
- Sau đổi mật khẩu, thu hồi toàn bộ refresh token khác và cho người dùng chọn giữ phiên hiện tại.
- Nếu cho đổi email, yêu cầu xác minh địa chỉ mới trước khi kích hoạt.

### A.4. Course catalog và trang chi tiết khóa học

#### Phần nên giữ

- List/detail công khai, slug/ID route, tìm kiếm phía client và CTA đăng ký có thể tái sử dụng.
- Query công khai chỉ trả khóa đã publish.
- Giao diện hiện tại phù hợp làm lớp presentation.

#### Điểm chưa ổn

- “Bạn sẽ học được gì” là danh sách hard-code giống nhau cho mọi khóa.
- Không có curriculum, lịch khai giảng, hình thức học, thời lượng, sĩ số và prerequisite.
- Course đang trộn “sản phẩm đào tạo” và “lớp học đang mở”.
- Backend có tạo/publish nhưng frontend không có màn quản lý.
- Teacher có thể gọi publish cho course không thuộc mình vì endpoint chưa kiểm tra ownership.
- Admin tạo course sẽ trở thành `TeacherId` dù tài khoản mang role Admin.
- Không có update/delete/archive.
- Giá khóa học chỉ để hiển thị; khóa có giá vẫn tự enroll ngay.

#### Quyết định đề xuất

Giữ giao diện catalog, nhưng **làm lại mô hình và luồng quản lý**:

- `Course` là nội dung/sản phẩm.
- `Class/Cohort` là đợt học cụ thể.
- `CourseOutcome`, `Module`, `Lesson` là nội dung thật thay cho dữ liệu hard-code.
- Admin tạo course, chọn giáo viên khi tạo class.
- Publish phải dùng policy kiểm tra quyền sở hữu/phân công.
- Dùng archive thay vì hard delete đối với khóa đã có học viên.

#### Tiêu chí nghiệm thu lại

- Admin quản lý trọn CRUD/publish từ UI.
- Teacher chỉ sửa/publish lớp được phân công.
- Một course có thể mở nhiều lớp ở các thời điểm/giáo viên khác nhau.
- Course trả phí không tạo enrollment active trước khi thỏa điều kiện kinh doanh đã duyệt.

### A.5. Enrollment

#### Hiện trạng

Enrollment hiện chỉ thể hiện quan hệ course–student với cờ `IsActive`. Cách này đủ cho demo nhưng không biểu diễn được chờ duyệt, thanh toán, bảo lưu, hoàn thành hoặc hủy.

#### Điểm chưa ổn

- Chưa có unique constraint ở database cho cặp học viên–khóa/lớp; request đồng thời có thể tạo bản ghi trùng.
- Admin/teacher không có màn quản lý danh sách ghi danh.
- Không có lịch sử trạng thái và lý do thay đổi.
- Không phân biệt ngày ghi danh với ngày bắt đầu/quyền truy cập hết hạn.
- Các module khác phụ thuộc trực tiếp vào `IsActive`, làm khó mở rộng.

#### Đề xuất làm lại

- Enrollment thuộc `ClassId`, có trạng thái `Pending`, `Active`, `Paused`, `Completed`, `Cancelled`, `Expired`.
- Thêm unique constraint, timestamps và actor thực hiện thay đổi.
- Quyền tài liệu/bài tập dựa trên policy từ trạng thái enrollment.
- UI cho admin ghi danh/chuyển lớp/bảo lưu/hủy; giáo viên xem roster nhưng không tùy tiện đổi học phí/quyền.

### A.6. Assignment và submission

#### Phần nên giữ

- Student chỉ thấy assignment của khóa đang học.
- Teacher chỉ thấy/chấm course mình dạy; Admin có quyền toàn cục.
- Detail của student chỉ trả bài nộp của chính họ, tránh lộ điểm và phản hồi của bạn học.
- File brief/submission đi qua kiểm tra quyền.
- Có cả upload file và link ngoài.

Đây là phân hệ cũ có nền tảng tốt nhất và không cần viết lại toàn bộ.

#### Điểm chưa ổn

- Backend chưa validate grade; UI giới hạn 0–10 nhưng API có thể nhận giá trị bất kỳ.
- Học viên vẫn có thể nộp sau deadline; chưa có policy nộp trễ.
- Mỗi học viên chỉ nộp một lần ở application logic nhưng không có database constraint chống race.
- Không có resubmit/version history.
- Backend có update assignment nhưng UI chưa có sửa.
- Không thể chủ động gỡ attachment hiện tại trong update vì `null` đang được hiểu là “không thay đổi”.
- Khi upload rồi hủy form, file trở thành orphan.
- Grade và feedback thay đổi không có audit.
- Kiểu `any` được dùng nhiều ở trang detail, làm lỗi contract khó phát hiện khi build.

#### Đề xuất refactor

- Tách `Assignment`, `Submission` và `SubmissionAttempt`.
- Assignment có cấu hình max attempts, late policy, grade scale và publish state.
- Mỗi attempt giữ nguyên file/note/thời điểm; submission giữ kết quả tổng hợp.
- Validation và policy nằm ở backend.
- Dùng DTO typed đầy đủ ở frontend.
- Thêm UI sửa, draft/publish, rubric và grade audit.

#### Tiêu chí nghiệm thu lại

- Không thể gửi điểm ngoài thang đã cấu hình.
- Hai request đồng thời không tạo hai submission trái policy.
- Quy tắc nộp trễ được hiển thị và thực thi giống nhau ở frontend/backend.
- Học viên thấy đúng lịch sử của mình; không bao giờ thấy submission của người khác.

### A.7. File upload và download

#### Phần nên giữ

- File nằm ngoài web root.
- Tên vật lý dùng GUID, không dùng trực tiếp tên file người dùng.
- Có whitelist extension, kích thước tối đa và content type do server quyết định.
- Download và metadata đều kiểm tra quyền theo đối tượng đang gắn file.
- Submission của học viên khác không bị lộ chỉ vì cùng course.

#### Điểm chưa ổn

- Validation mới dựa chủ yếu vào extension; chưa kiểm tra signature/MIME thực.
- Chưa quét malware.
- Không có trạng thái quarantine/scanning.
- Không có API/job dọn file chưa được attach.
- Local disk làm triển khai nhiều instance và backup khó hơn.
- Quy trình xóa file và database chưa có transaction/outbox; có thể tạo orphan khi một bước thất bại.
- Chưa có quota theo user/course và rate limit upload.

#### Quyết định đề xuất

Giữ thiết kế download authorization hiện tại, bổ sung lifecycle:

```text
Uploaded → Quarantined → Scanned → Available → Attached → Archived/Deleted
```

Ở quy mô nhỏ có thể tiếp tục local disk trong Development, nhưng Production nên dùng object storage nếu có khả năng chạy nhiều server hoặc cần backup tin cậy.

### A.8. Resource library

#### Phần nên giữ

- Backend đã lọc dữ liệu theo role/enrollment.
- Hỗ trợ file nội bộ và external link.
- Có public/private và category.

#### Điểm chưa ổn

- Form frontend không có `courseId`, nên tài liệu private được tạo từ UI không thể đến được học viên của một course.
- Không có UI update dù backend có endpoint update.
- Teacher chỉ thấy public hoặc file mình upload; có thể không thấy tài liệu private do admin đưa vào chính course mình dạy.
- Endpoint category lấy category từ toàn bộ tài liệu thay vì tập tài liệu user được phép xem.
- Khái niệm `IsPublic` chưa rõ: public với tất cả người đăng nhập hay cả guest? Controller file hiện yêu cầu đăng nhập.
- Update không hỗ trợ thao tác “xóa source hiện tại nhưng chưa thay source khác” một cách rõ ràng.

#### Đề xuất refactor

- Thay boolean đơn lẻ bằng `Visibility`: `PublicWeb`, `Authenticated`, `Course`, `Class`, `SpecificUsers` nếu thực sự cần.
- Resource gắn được với Lesson/Class thay vì chỉ Course.
- Dùng cùng một authorization policy cho list, info và download để tránh lệch quyền.
- Bổ sung course/class selector, edit, version và preview trên UI.

### A.9. Booking

#### Phần nên giữ

- Có kiểm tra giờ bắt đầu trước giờ kết thúc.
- Có kiểm tra overlap cơ bản cho teacher và student.
- Student chỉ thấy slot trống và slot mình đã đặt.
- Hủy/xóa có kiểm tra role/ownership ở một mức nhất định.

#### Lỗi và thiếu sót cần xử lý

- Tạo slot không kiểm tra Course tồn tại, dẫn đến lỗi foreign key và `500`.
- Không kiểm tra teacher có dạy course đó không.
- Student có thể đặt slot của course mình không học.
- Có thể tạo/đặt slot trong quá khứ.
- Check-then-save không chống được hai request book đồng thời.
- Frontend bắt nhập Course ID thủ công.
- Admin gọi danh sách với `mySlots=true`; backend khi đó lọc `TeacherId == adminId`, nên admin thường không thấy lịch toàn hệ thống.
- Không có timezone rõ ràng, recurring slot, cancellation window hoặc trạng thái hoàn thành/no-show.
- Trường `Notes` có trong model nhưng DTO/UI chưa sử dụng.

#### Quyết định đề xuất

Làm lại luồng booking quanh một service/policy duy nhất:

1. Teacher chọn Class mình phụ trách.
2. Server kiểm tra thời gian, quyền, overlap và booking window.
3. Student chỉ thấy/đặt slot mà enrollment cho phép.
4. Booking dùng transaction/concurrency token hoặc atomic update.
5. Admin có filter toàn hệ thống; teacher mặc định chỉ xem lịch mình.
6. Mọi thời gian lưu UTC, API trả timezone context và UI hiển thị rõ.

### A.10. Blog và CMS

#### Phần nên giữ

- Public list/detail chỉ trả bài đã publish.
- Pagination, tag và slug đã có nền tảng.
- Admin có create/edit/delete/publish UI.
- List admin không tải content lớn; detail edit mới tải toàn bài.

#### Điểm chưa ổn

- Logic blog bị chia và trùng giữa `BlogController` và `AdminController`.
- Hai luồng normalize/kiểm tra slug không hoàn toàn giống nhau.
- Teacher được tạo/publish qua API chung nhưng không có UI quản lý tương ứng.
- Quyền Author/Editor/Publisher chưa được định nghĩa rõ.
- Ý nghĩa `PublishedAt` chưa nhất quán: có nơi muốn giữ lần publish đầu, có nơi unpublish đặt về null và republish tạo ngày mới.
- Chưa có draft revision, preview, scheduled publish và redirect khi đổi slug.
- Nội dung HTML cần có chính sách sanitize ở server/CMS, không chỉ dựa vào client render.
- Chưa có SSR/meta/schema/sitemap nên mục tiêu SEO chưa đạt.

#### Đề xuất refactor

- Một `Content/Blog` module duy nhất với service và policy.
- `CreatedAt`, `UpdatedAt`, `FirstPublishedAt`, `LastPublishedAt` tách rõ.
- Role/quyền: Author viết, Editor sửa, Publisher công bố; với đội nhỏ có thể map Admin vào tất cả quyền.
- Lưu revision và slug history.
- Public API chỉ đọc snapshot đã publish; admin API quản lý draft.

### A.11. Contact leads

#### Phần nên giữ

- Form công khai đã thực sự lưu dữ liệu thay vì chỉ báo thành công giả.
- Admin-only list/stats/update/delete được bảo vệ.
- Có search, status, internal note, handled-by và repeat window.
- UI xử lý lead tương đối đầy đủ cho một trung tâm nhỏ.

#### Điểm chưa ổn

- Backend chỉ kiểm tra email không rỗng, chưa validate định dạng/độ dài DTO đầy đủ.
- Repeat guard chỉ theo email và 10 phút; attacker có thể đổi email liên tục.
- Không có rate limit theo IP/device hoặc CAPTCHA thích ứng.
- List chưa pagination; dữ liệu sẽ chậm khi lead tăng.
- Không có owner/follow-up date/timeline.
- Delete hard-delete làm mất lịch sử; chưa có retention/consent.
- Chưa nối lead với user/enrollment khi chuyển đổi.

#### Đề xuất

Giữ module, bổ sung validation + rate limit trước; sau đó mở rộng pipeline/timeline. Không cần thay bằng CRM lớn ở giai đoạn hiện tại.

### A.12. User administration

#### Phần nên giữ

- Danh sách, tìm kiếm và lọc role đủ dùng ban đầu.
- Response không trả password hash.
- Backend bảo vệ controller bằng Admin role.

#### Điểm chưa ổn

- Xóa user dễ thất bại vì foreign key từ course, submission, file, booking.
- Admin có thể tự xóa hoặc hạ quyền chính mình; chưa bảo vệ admin cuối cùng.
- Đổi role không thu hồi token cũ.
- Không có khóa/mở khóa trên UI dù model có `IsActive`.
- Không có audit cho đổi role/xóa tài khoản.
- Không có pagination.
- Role đơn (`enum`) sẽ hạn chế nếu sau này một người có nhiều trách nhiệm.

#### Đề xuất làm lại thao tác quản trị

- Thay nút xóa mặc định bằng Disable/Archive.
- Hard delete chỉ qua quy trình riêng sau khi kiểm tra dữ liệu và chính sách quyền riêng tư.
- Chặn tự hạ quyền/xóa admin cuối cùng.
- Thu hồi session ngay sau thay đổi quyền.
- Ghi audit before/after.
- Nếu dự kiến multi-role, chuyển sang `Roles` + `UserRoles`; nếu không, giữ enum để tránh over-engineering.

### A.13. Dashboard và thống kê

#### Phần nên giữ

- Có dashboard theo vai trò và các con số liên quan trực tiếp đến công việc.
- Tách admin stats và user-level stats là hợp lý.

#### Điểm chưa ổn

- Một số con số phụ thuộc mô hình Course/Enrollment hiện tại và sẽ sai nghĩa khi thêm Class/EnrollmentStatus.
- Không có link từ stat card tới danh sách đã lọc tương ứng.
- Lỗi tải dữ liệu thường chỉ dừng loading, không cho retry hoặc giải thích.
- Chưa có “as of” time/timezone và định nghĩa metric.
- Query thống kê sẽ cần tối ưu khi dữ liệu tăng.

#### Đề xuất

- Không làm lại UI ngay; đợi mô hình Course/Class/Enrollment ổn định rồi sửa query.
- Mỗi card phải click được tới màn hình hành động.
- Định nghĩa metric bằng tài liệu và integration test.
- Chỉ thêm chart khi có câu hỏi kinh doanh cụ thể.

### A.14. Frontend architecture và design system

#### Phần nên giữ

- Lazy-loaded feature modules.
- Base controls, shared navbar/footer, toast và design token tập trung.
- Giao diện có ngôn ngữ thiết kế nhất quán và responsive foundation tốt.

#### Điểm chưa ổn

- Nhiều lỗi HTTP bị nuốt bằng `error: () => {}` hoặc chỉ tắt loading.
- Một số model quan trọng dùng `any`.
- Các form course/assignment/booking chưa dùng dữ liệu chọn quan hệ mà nhập ID.
- `window.confirm` khó đồng bộ UI và không đủ linh hoạt.
- Chưa có global loading/error strategy, cache/query state hoặc handling 401 thống nhất.
- Không có frontend test.
- Nội dung marketing/số liệu/giá đang hard-code trong component.

#### Đề xuất refactor từng bước

- Chuẩn hóa API error model và error presentation.
- Thay `any` bằng interface sinh/tạo từ contract.
- Tạo reusable entity selector cho Course/Class/User.
- Tạo confirm dialog component.
- Tách nội dung marketing có nhu cầu chỉnh sửa sang CMS/config; không biến mọi text thành database nếu hiếm khi thay đổi.
- Bổ sung component/accessibility tests cho base controls và critical forms.

### A.15. API, validation và lỗi

#### Điểm chưa ổn chung

- DTO record gần như không có validation attribute/validator.
- Một số input sai dẫn tới database exception `500` thay vì `400/409`.
- Controller chứa cả authorization, query, mapping, business rule và file cleanup.
- Có endpoint trả trực tiếp entity EF, làm contract không ổn định và có nguy cơ lộ navigation/property sau này.
- Lỗi chưa theo schema thống nhất.
- Paging chưa clamp page/pageSize.

#### Đề xuất

- Validation layer tập trung cho mọi request DTO.
- Global exception mapping: validation `400`, auth `401/403`, missing `404`, conflict `409`, unexpected `500` với correlation ID.
- Application service/use case cho nghiệp vụ; controller chỉ nhận request và trả response.
- Response DTO rõ ràng; không serialize entity.
- Chuẩn hóa pagination/filter/sort.
- Authorization policy/resource-based authorization dùng chung.

### A.16. Database và migration

#### Phần nên giữ

- EF Core migration và quan hệ cơ bản đã được thiết lập.
- Một số index quan trọng đã có cho email, slug, public file ID và lead status.
- Delete behavior đã được cân nhắc ở file, teacher, lead và submission.

#### Điểm cần cải thiện

- Thiếu unique constraint nghiệp vụ cho enrollment và submission hiện tại.
- Booking chưa có concurrency protection.
- SQLite phù hợp demo nhưng hạn chế khi nhiều ghi đồng thời và vận hành production.
- Auto-migrate ngay khi startup có thể rủi ro khi migration lớn hoặc nhiều instance cùng khởi động.
- Seed dữ liệu demo đang chạy trong startup không phụ thuộc môi trường.

#### Đề xuất

- Thêm constraint/index từ business invariants, không chỉ dựa vào code kiểm tra trước.
- Production migration chạy như deployment step có backup và kiểm soát, không để mọi app instance tự migrate tùy ý.
- Chuyển PostgreSQL trước khi có lưu lượng production đáng kể hoặc nhiều tác vụ ghi đồng thời.
- Seed Development/Test tách riêng; production chỉ có bootstrap admin an toàn dùng một lần nếu cần.

### A.17. Kiểm thử hiện tại

#### Phần nên giữ

- Smoke test hiện có tập trung đúng vào authorization pipeline cho file, lead và blog.
- Test file đã quan tâm tới cross-user access và không lộ điểm/password hash.

#### Khoảng trống

- Chưa có .NET test project.
- Không có Angular unit/component test.
- Không có browser E2E.
- Auth, course, enrollment, assignment, booking, profile và admin chưa được phủ đủ.
- Script Bash phụ thuộc môi trường ngoài và chưa nằm trong CI.
- Chưa có test concurrency, migration, backup/restore hoặc production config.

#### Đề xuất

- Giữ smoke scripts như lớp cuối, nhưng chuyển phần lớn case sang integration test tự chạy trong CI.
- Ưu tiên test theo rủi ro: auth/session → authorization/file → booking concurrency → enrollment → assignment privacy → admin actions.
- Bổ sung một số E2E critical journey, không cố kiểm thử mọi chi tiết CSS bằng browser.

## Phụ lục B — Backlog sửa tính năng cũ đề xuất

| Mã | Công việc | Hướng xử lý | Ưu tiên | Độ lớn tương đối |
|---|---|---|---|---|
| LEG-001 | Chuẩn hóa email trước kiểm tra trùng | Sửa lỗi | P0 | S |
| LEG-002 | Đồng bộ URL/config frontend–backend theo môi trường | Sửa cấu hình | P0 | S |
| LEG-003 | Đưa secret ra ngoài repo, tắt demo seed production | Bảo mật | P0 | S |
| LEG-004 | Global exception handler + validation DTO | Refactor nền | P0 | M |
| LEG-005 | Thu hồi session khi đổi role/password/lock | Refactor auth | P0 | L |
| LEG-006 | Sửa ownership khi publish course | Sửa bảo mật | P0 | S |
| LEG-007 | Chặn self-delete/last-admin và thay delete bằng disable | Sửa quản trị | P0 | M |
| LEG-008 | Validate course/teacher/time khi tạo booking | Sửa nghiệp vụ | P0 | M |
| LEG-009 | Chống double booking bằng concurrency/transaction | Sửa dữ liệu | P0 | M |
| LEG-010 | Thêm course/class selector, bỏ nhập ID | Cải thiện UX | P1 | M |
| LEG-011 | Gắn resource với course/class từ UI | Hoàn thiện luồng | P1 | M |
| LEG-012 | Validate grade/deadline và thêm audit điểm | Sửa LMS | P1 | M |
| LEG-013 | UI sửa assignment/resource | Hoàn thiện UI | P1 | M |
| LEG-014 | Dọn orphan file + MIME scan/quarantine | Gia cố file | P1 | L |
| LEG-015 | Hợp nhất hai luồng Blog API | Refactor CMS | P1 | M |
| LEG-016 | Pagination cho admin users/leads/submissions | Hiệu năng | P1 | M |
| LEG-017 | Cập nhật Auth state sau sửa profile | Sửa UX | P1 | S |
| LEG-018 | Chuẩn hóa xử lý 401 và API errors ở Angular | Refactor frontend | P1 | M |
| LEG-019 | Bổ sung integration tests cho core modules | Test | P1 | L |
| LEG-020 | Thay hard-code course outcomes bằng dữ liệu thật | Sản phẩm | P1 | M |
| LEG-021 | SSR/prerender và metadata cho public pages | SEO | P1 | L |
| LEG-022 | Tái tạo dashboard metric sau khi đổi data model | Refactor báo cáo | P2 | M |

Ký hiệu độ lớn tương đối:

- **S:** thay đổi cục bộ, ít ảnh hưởng data model.
- **M:** chạm cả frontend và backend hoặc cần migration nhỏ.
- **L:** thay đổi nền tảng, cần migration/rollout/test theo nhiều bước.

## Phụ lục C — Thứ tự sửa code cũ để tránh làm lại hai lần

Không nên xử lý backlog theo từng màn hình độc lập. Thứ tự khuyến nghị:

1. **Cấu hình và security baseline:** LEG-001 đến LEG-009.
2. **Chốt mô hình Course–Class–Enrollment.** Đây là prerequisite cho resource, assignment, booking và dashboard.
3. **Sửa Resource và Assignment** trên data model mới.
4. **Làm lại Booking** sau khi đã có Class/Enrollment policy.
5. **Hợp nhất CMS/Blog và làm SEO.**
6. **Chuẩn hóa frontend error/state và bổ sung test xuyên suốt**, không để test đến cuối toàn dự án.
7. **Tái tạo dashboard/report cuối cùng** vì đây là lớp tổng hợp phụ thuộc các module phía dưới.

Nguyên tắc quan trọng: không nên đầu tư sâu vào UI quản lý Course hiện tại rồi mới tách Class/Cohort; làm như vậy gần như chắc chắn phải viết lại UI và API lần thứ hai.

## Phụ lục D — Nhật ký triển khai

### 22/09/2026 — Giai đoạn 0A: Security/configuration baseline

Đã thực hiện:

- [x] Đồng bộ API development về `http://localhost:5083/api`.
- [x] Thêm cấu hình frontend production dùng same-origin `/api`.
- [x] Loại JWT key khỏi `appsettings.json`; production bắt buộc cung cấp secret.
- [x] Chỉ chạy demo seeder trong Development và khi `DemoData:Enabled` được bật.
- [x] Thêm global exception handler trả Problem Details, không trả stack trace cho client.
- [x] Chuẩn hóa email trước khi kiểm tra trùng và lưu tài khoản.
- [x] Nâng mật khẩu tối thiểu từ 6 lên 8 ký tự ở register/change-password và frontend.
- [x] Đối chiếu JWT với user active/role trong database ở mỗi request để khóa/đổi role có hiệu lực ngay.
- [x] Frontend kiểm tra `exp` của JWT thay vì chỉ kiểm tra token có tồn tại.
- [x] Đồng bộ tên/avatar trong session frontend ngay sau khi sửa profile.
- [x] Chặn teacher publish course không thuộc mình.
- [x] Admin tạo course phải chỉ định một teacher hợp lệ.
- [x] Booking kiểm tra course ownership, thời gian tương lai và enrollment.
- [x] Claim một booking slot bằng atomic update để tránh ghi đè người đặt trước.
- [x] Admin xem được lịch toàn hệ thống nhưng không tạo slot mang danh teacher.
- [x] Chặn admin tự hạ quyền, tự vô hiệu hóa/xóa và bảo vệ admin active cuối cùng.
- [x] Thêm thao tác khóa/kích hoạt lại tài khoản trên UI Admin.
- [x] Rate limiting theo IP/user cho login, register, contact lead và upload.
- [x] Backend validation cho auth, lead, assignment/submission/grade, resource URL/source/course và booking.

Đã xác minh:

- [x] Backend build thành công, 0 warning/0 error.
- [x] Frontend production build thành công.
- [x] Email trùng khác hoa/thường trả `409`, không còn `500`.
- [x] Tạo booking với course không hợp lệ hoặc thời gian quá khứ trả `400`.
- [x] Admin không thể tạo slot teacher (`403`) hoặc tự hạ quyền (`400`).
- [x] JWT cũ bị từ chối `401` ngay sau khi role thay đổi.
- [x] Auth rate limit trả `429` ở request thứ 11 trong cửa sổ một phút.
- [x] Điểm ngoài thang 10, deadline quá khứ, bài nộp rỗng, URL không an toàn và email sai đều trả `400`.

Chưa hoàn thành trong Giai đoạn 0:

- [ ] Hoàn tất validation cho các DTO còn lại và chuẩn hóa toàn bộ API errors.
- [x] Audit log cho các hành động nhạy cảm cốt lõi và màn hình tra cứu dành cho Admin.
- [ ] Chốt retention/export policy cho audit log.
- [ ] Refresh token/session management đầy đủ.
- [ ] File MIME signature scan, malware quarantine và orphan cleanup.
- [x] Integration test project cho Course/Class/Enrollment, lead conversion và Quiz/Test.
- [ ] Thiết lập CI chạy build/test tự động.
- [ ] Backup/restore runbook và staging configuration.

Ghi chú: cơ chế kiểm tra user/role từ database trên mỗi request là giải pháp an toàn, đơn giản cho quy mô hiện tại. Khi lưu lượng tăng, có thể thay bằng security stamp cache và refresh-token session mà vẫn giữ hành vi thu hồi quyền tức thời.

### 22/09/2026 — Giai đoạn 1: Course–Class–Enrollment

Đã thực hiện:

- [x] Tách `Course` (chương trình) và `CourseClass` (lớp/cohort) bằng migration có backfill dữ liệu cũ.
- [x] Thêm trạng thái lớp, hình thức Online/Offline/Hybrid, lịch học, sĩ số và giáo viên phụ trách.
- [x] Thêm workflow Enrollment: Active, Pending, Paused, Completed, Cancelled, Expired.
- [x] Khóa miễn phí kích hoạt ngay; khóa trả phí chờ Admin duyệt.
- [x] Kiểm tra sĩ số và ngăn một học viên có hai đăng ký đang hiệu lực trong cùng khóa.
- [x] UI Admin/Giáo viên tạo khóa, publish, tạo/sửa lớp, xem học viên và duyệt trạng thái.
- [x] Trang chi tiết khóa cho học viên chọn lớp đang mở trước khi đăng ký.
- [x] Admin có thể thêm học viên trực tiếp vào lớp.
- [x] Lead tư vấn có thể được chuyển thành/liên kết với tài khoản Student và Enrollment; mật khẩu tạm chỉ trả một lần nếu tạo tài khoản mới.

Đã xác minh:

- [x] Migration chạy thành công trên bản sao database cũ và giữ toàn bộ enrollment hiện có.
- [x] Runtime test trả đúng `Active` cho khóa miễn phí, `Pending` cho khóa trả phí và `Active` sau khi Admin duyệt.
- [x] Backend và frontend production build thành công.

### 22/09/2026 — Giai đoạn 2A: Quiz/Test online MVP

Đã thực hiện:

- [x] Quiz theo lớp, draft/publish, thời gian mở–đóng, thời lượng do server quyết định và một lượt làm.
- [x] Câu một đáp án, nhiều đáp án và tự luận có thể kết hợp trong cùng một đề; tổng điểm do giáo viên phân bổ.
- [x] Học viên làm bài trên web, reload tiếp tục lượt cũ, countdown theo deadline server và auto-save có version chống tab cũ ghi đè.
- [x] Background worker phía server tự chốt bài hết giờ kể cả khi học viên đã đóng tab.
- [x] Không gửi đáp án đúng/lời giải xuống client khi bài đang làm.
- [x] Nộp bài idempotent; trắc nghiệm tự chấm; bài có tự luận chuyển `PendingGrading`.
- [x] UI giáo viên xem kết quả, chấm điểm/nhận xét tự luận; hoàn tất thành `Graded`.
- [x] Học viên viết tự luận trực tiếp trên web bằng ô nhập lớn, có bộ đếm từ tham khảo và không giới hạn số từ ở giao diện.
- [x] Chỉ học viên có Enrollment `Active` đúng lớp mới được bắt đầu bài.
- [x] Integration test chạy bằng database SQLite tạm, không làm thay đổi dữ liệu thật.

Đã xác minh:

- [x] Đề kết hợp ba loại câu trả kết quả cuối cùng đúng 10/10 sau khi chấm tự luận.
- [x] Đáp án đúng không xuất hiện trong payload trước khi hoàn tất chấm.
- [x] Bắt đầu hai lần trả cùng attempt; autosave dùng version cũ trả `409`.
- [x] `dotnet test TFrench.sln`: 3/3 integration tests pass, gồm cả deadline worker không cần request từ trình duyệt.
- [x] Backend build 0 warning/0 error và frontend production build thành công.

Phạm vi còn lại của Giai đoạn 2 (Module/Lesson, gradebook/rubric nâng cao, notification và E2E trình duyệt) tiếp tục được giữ trong roadmap; chưa được đánh dấu hoàn thành chỉ vì Quiz MVP đã xong.

### 22/09/2026 — Bổ sung audit trail

- [x] Ghi actor, IP, thời gian, loại hành động, đối tượng và metadata tối thiểu.
- [x] Bao phủ đổi role, khóa/kích hoạt/xóa user, đổi mật khẩu, thay trạng thái Enrollment, thêm học viên vào lớp, chuyển lead, publish/unpublish Quiz và chấm tự luận.
- [x] Thêm API có giới hạn số bản ghi và UI Admin lọc/xem nhật ký.
- [x] Không ghi mật khẩu, JWT hay nội dung đáp án tự luận vào metadata audit.

### 23/09/2026 — Chuẩn bị triển khai bản trải nghiệm

- [x] Thêm Dockerfile nhiều giai đoạn để build Angular và ASP.NET Core thành một image production.
- [x] ASP.NET phục vụ frontend cùng domain, hỗ trợ Angular client-side routes và vẫn trả `404` cho API không tồn tại.
- [x] Chuyển SQLite và file upload sang `/data` để gắn Railway Volume, giữ dữ liệu qua các lần deploy.
- [x] Thêm `/health` kiểm tra kết nối database để Railway giám sát deployment.
- [x] Tự chạy migration khi khởi động; chỉ tạo Admin đầu tiên khi production chưa có Admin và đã cung cấp bootstrap secret.
- [x] Không seed hoặc hiển thị tài khoản demo trong production.
- [x] Bổ sung hướng dẫn Railway, biến môi trường, volume, domain, backup và chạy Docker local tại `DEPLOY_RAILWAY.md`.
- [x] Xác minh production smoke test: frontend/SPA route `200`, health `200`, API không tồn tại `404`, Admin đăng nhập nhận JWT và lần khởi động sau không cần bootstrap password.
- [x] Backend integration tests `4/4` pass và frontend production build thành công.
- [x] Nâng Angular tuần tự từ 17 lên 21.2 LTS bằng migration chính thức; audit dependency production từ 8 cảnh báo xuống 0.
- [x] Nâng các package ASP.NET Core/EF Core 9 lên patch 9.0.20 và IdentityModel 8.23; NuGet vulnerability audit không phát hiện package dễ tổn thương.

Còn cần chủ dự án thao tác trên tài khoản bên ngoài: push code lên GitHub, tạo Railway service, gắn volume `/data`, nhập secret, tạo domain và bật backup volume.
