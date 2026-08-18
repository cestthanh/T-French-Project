import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/authService';
import { BlogService } from 'src/app/services/blogService';
import { BlogPost } from 'src/app/interface';

interface Feature { icon: string; title: string; desc: string; }
interface Step { icon: string; title: string; desc: string; }
interface Tier {
  level: string; name: string; desc: string; price: string; period: string;
  items: string[]; popular: boolean;
}
interface Faq { q: string; a: string; }

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  latestPosts: BlogPost[] = [];
  contactSent = false;
  contactForm: FormGroup;
  openFaq: number | null = 0;

  readonly heroStats = [
    { value: '500+', label: 'Học viên' },
    { value: '20+', label: 'Giáo viên' },
    { value: 'DELF/DALF', label: 'Chứng chỉ' },
  ];

  readonly features: Feature[] = [
    { icon: 'book-open', title: 'Tài liệu bảo mật', desc: 'Kho PDF & video độc quyền cho học viên đã đăng ký khoá học.' },
    { icon: 'clipboard-list', title: 'Bài tập & Chấm điểm', desc: 'Nộp bài trực tuyến, nhận phản hồi chi tiết từ giáo viên.' },
    { icon: 'calendar-days', title: 'Đặt lịch luyện nói', desc: 'Book buổi Speaking 1-1 với giáo viên theo khung giờ trống.' },
    { icon: 'globe', title: 'Tư vấn du học Pháp', desc: 'Thông tin visa, học bổng, trường đại học Pháp cập nhật.' },
  ];

  readonly steps: Step[] = [
    { icon: 'user', title: 'Tạo tài khoản', desc: 'Đăng ký miễn phí trong 30 giây, không cần thẻ thanh toán.' },
    { icon: 'graduation-cap', title: 'Chọn khoá học', desc: 'Từ A1 cho người mới đến C1 chuẩn bị hồ sơ du học.' },
    { icon: 'clipboard-check', title: 'Học & làm bài', desc: 'Truy cập tài liệu, nộp bài tập và nhận điểm cùng nhận xét.' },
    { icon: 'message-circle', title: 'Luyện nói 1-1', desc: 'Đặt lịch với giáo viên vào khung giờ phù hợp với bạn.' },
  ];

  readonly tiers: Tier[] = [
    {
      level: 'A1 — A2', name: 'Cơ Bản', desc: 'Dành cho người mới bắt đầu hoàn toàn.',
      price: '1.8tr', period: '/ khoá', popular: false,
      items: ['Bảng chữ cái & phát âm', 'Hội thoại hàng ngày', 'Ngữ pháp nền tảng', 'Tài liệu PDF & video'],
    },
    {
      level: 'B1 — B2', name: 'Trung Cấp', desc: 'Giao tiếp tự tin, luyện thi DELF.',
      price: '2.5tr', period: '/ khoá', popular: true,
      items: ['Nghe – Nói – Đọc – Viết', 'Luyện thi DELF B1/B2', 'Văn hoá & Xã hội Pháp', '4 buổi luyện nói 1-1', 'Chấm bài chi tiết'],
    },
    {
      level: 'C1 — Du học', name: 'Nâng Cao', desc: 'Chuẩn bị hồ sơ & phỏng vấn du học.',
      price: '3.2tr', period: '/ khoá', popular: false,
      items: ['Luyện thi DALF C1', 'Viết luận học thuật', 'Hỗ trợ hồ sơ du học', 'Mock interview Campus France'],
    },
  ];

  readonly faqs: Faq[] = [
    { q: 'Tôi chưa biết gì về tiếng Pháp, bắt đầu từ đâu?', a: 'Khoá A1 được thiết kế cho người mới hoàn toàn: bắt đầu từ bảng chữ cái, quy tắc phát âm và các mẫu câu giao tiếp cơ bản nhất. Bạn không cần chuẩn bị gì trước.' },
    { q: 'Học online có hiệu quả bằng học tại lớp không?', a: 'Toàn bộ tài liệu, bài tập và phản hồi của giáo viên đều diễn ra trên nền tảng, cộng thêm các buổi luyện nói 1-1 trực tiếp. Bạn học theo tốc độ của mình nhưng vẫn có giáo viên theo sát.' },
    { q: 'Bằng DELF/DALF có giá trị bao lâu?', a: 'Chứng chỉ DELF và DALF do Bộ Giáo dục Pháp cấp và có giá trị vĩnh viễn, được công nhận tại hầu hết các trường đại học Pháp và các nước nói tiếng Pháp.' },
    { q: 'Trung tâm có hỗ trợ làm hồ sơ du học không?', a: 'Có. Khoá Nâng Cao bao gồm hỗ trợ hoàn thiện hồ sơ Campus France, luyện phỏng vấn thử và tư vấn chọn trường phù hợp với ngành học của bạn.' },
    { q: 'Tôi có thể đổi lịch buổi luyện nói không?', a: 'Được. Bạn có thể huỷ và đặt lại slot khác ngay trong Dashboard, miễn là trước giờ học. Slot đã huỷ sẽ được mở lại cho học viên khác.' },
  ];

  readonly contactDetails = [
    { icon: 'map-pin', label: 'Địa chỉ', value: 'Hà Nội, Việt Nam' },
    { icon: 'mail', label: 'Email', value: 'contact@tfrench.vn' },
    { icon: 'phone', label: 'Hotline', value: '0912 345 678' },
  ];

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private blogService: BlogService,
  ) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.blogService.getPosts(1, 3).subscribe({
      next: res => (this.latestPosts = res.posts),
      error: () => {},
    });
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
  }

  submitContact(): void {
    if (this.contactForm.invalid) return;
    // TODO: wire to backend contact endpoint (no lead-capture API exists yet)
    this.contactSent = true;
    this.contactForm.reset();
  }
}
