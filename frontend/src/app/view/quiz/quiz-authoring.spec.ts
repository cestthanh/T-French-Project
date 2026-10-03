import { of, Subject } from 'rxjs';
import { ManagedQuiz, ManagedQuizDetail } from 'src/app/interface';
import { AuthService } from 'src/app/services/authService';
import { ClassService } from 'src/app/services/classService';
import { QuizService } from 'src/app/services/quizService';
import { ToastService } from 'src/app/services/share/toastService';
import { QuizPage } from './quiz';

describe('QuizPage draft editing', () => {
  let page: QuizPage;
  let service: jasmine.SpyObj<QuizService>;
  const item = { id: 3, isPublished: false, attemptCount: 0 } as ManagedQuiz;
  const detail: ManagedQuizDetail = {
    id: 3, title: 'Đề đã lưu', description: 'Mô tả', classId: 2,
    isPublished: false, attemptCount: 0,
    openAt: '2026-10-10T11:30:00Z', closeAt: '2026-10-10T12:30:00Z',
    durationMinutes: 45, showAnswersAfterGrading: false,
    questions: [{
      type: 'SingleChoice', content: 'Chọn câu đúng', points: 5,
      explanation: 'Giải thích', options: [{ text: 'Oui', isCorrect: true }, { text: 'Non', isCorrect: false }],
    }, {
      type: 'Essay', content: 'Viết đoạn văn', points: 5, rubric: 'Rõ ý', options: [],
    }],
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<QuizService>('QuizService',
      ['getManagedDetail', 'getManaged', 'create', 'update', 'togglePublish']);
    service.getManaged.and.returnValue(of([]));
    service.getManagedDetail.and.returnValue(of(detail));
    const classes = jasmine.createSpyObj<ClassService>('ClassService', ['getManaged']);
    classes.getManaged.and.returnValue(of([]));
    page = new QuizPage(
      { currentUser: { role: 'Teacher' } } as unknown as AuthService,
      service, classes, jasmine.createSpyObj<ToastService>('ToastService', ['error', 'success']),
    );
  });

  afterEach(() => page.ngOnDestroy());

  it('round-trips the schedule and retains questions and correct answers when updating', () => {
    const saved = new Subject<{ id: number }>();
    service.update.and.returnValue(saved);
    page.editQuiz(item);
    expect(page.draftDirty).toBeFalse();
    page.quizDraft.title = 'Đã chỉnh';
    page.createQuiz();
    const [id, request] = service.update.calls.mostRecent().args;
    expect(id).toBe(3);
    expect(request.openAt).toBe(new Date(detail.openAt).toISOString());
    expect(request.closeAt).toBe(new Date(detail.closeAt).toISOString());
    expect(request.questions[0].options[0].isCorrect).toBeTrue();
    expect(request.questions[1].rubric).toBe('Rõ ý');
    expect(detail.title).toBe('Đề đã lưu');
    page.createQuiz();
    expect(service.update).toHaveBeenCalledTimes(1);
    saved.next({ id: 3 });
    expect(page.editingQuizId).toBeNull();
    expect(page.draftDirty).toBeFalse();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('keeps edited content on a failed save and blocks publishing unsaved changes', () => {
    const failed = new Subject<{ id: number }>();
    service.update.and.returnValue(failed);
    page.editQuiz(item);
    page.quizDraft.questions[1].content = 'Nội dung chưa lưu';
    page.togglePublish(item);
    expect(service.togglePublish).not.toHaveBeenCalled();
    page.createQuiz();
    failed.error({ status: 409 });
    expect(page.creating).toBeFalse();
    expect(page.editingQuizId).toBe(3);
    expect(page.quizDraft.questions[1].content).toBe('Nội dung chưa lưu');
    spyOn(window, 'confirm').and.returnValue(false);
    expect(page.canLeave()).toBeFalse();
    page.newDraft();
    expect(page.editingQuizId).toBe(3);
  });

  it('preserves the current draft when the server reports that another session published the selected quiz', () => {
    page.quizDraft.title = 'Đề đang soạn';
    spyOn(window, 'confirm').and.returnValue(true);
    service.getManagedDetail.and.returnValue(of({ ...detail, isPublished: true }));
    page.editQuiz(item);
    expect(page.quizDraft.title).toBe('Đề đang soạn');
    expect(page.editingQuizId).toBeNull();
    expect(page.loadingEditor).toBeFalse();
  });
});
