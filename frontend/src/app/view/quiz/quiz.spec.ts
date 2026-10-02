import { of, Subject } from 'rxjs';
import { QuizAttempt } from 'src/app/interface';
import { AuthService } from 'src/app/services/authService';
import { ClassService } from 'src/app/services/classService';
import { QuizService } from 'src/app/services/quizService';
import { ToastService } from 'src/app/services/share/toastService';
import { QuizPage } from './quiz';

describe('QuizPage autosave', () => {
  let page: QuizPage;
  let quizService: jasmine.SpyObj<QuizService>;
  let toast: jasmine.SpyObj<ToastService>;

  const attempt = (version = 0): QuizAttempt => ({
    id: 12, status: 'InProgress', version,
    startedAt: new Date().toISOString(),
    deadline: new Date(Date.now() + 60_000).toISOString(),
    quiz: { id: 3, title: 'Bài viết', totalPoints: 10 },
    questions: [{
      id: 1, type: 'Essay', content: 'Viết một đoạn văn', points: 10, order: 1,
      options: [], answer: { textAnswer: '', selectedOptionIds: [] },
    }],
  });

  beforeEach(() => {
    quizService = jasmine.createSpyObj<QuizService>('QuizService',
      ['saveAnswers', 'getAttempt', 'getAvailable', 'submit']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error', 'success']);
    quizService.getAvailable.and.returnValue(of([]));
    page = new QuizPage(
      { currentUser: { role: 'Student' } } as unknown as AuthService,
      quizService, {} as ClassService, toast,
    );
    page.attempt = attempt();
    page.answers = { 1: { textAnswer: '', selectedOptionIds: [] } };
    page.secondsRemaining = 60;
  });

  afterEach(() => page.ngOnDestroy());

  it('saves edits made while an earlier request is in flight', () => {
    const first = new Subject<{ version: number }>();
    const second = new Subject<{ version: number }>();
    quizService.saveAnswers.and.returnValues(first, second);

    page.setEssay(1, 'Bản đầu');
    page.saveAnswers();
    page.setEssay(1, 'Bản mới hơn');

    first.next({ version: 1 });
    expect(page.dirty).toBeTrue();
    expect(quizService.saveAnswers).toHaveBeenCalledTimes(2);
    expect(quizService.saveAnswers.calls.argsFor(1)[2][0].textAnswer).toBe('Bản mới hơn');
    expect(quizService.saveAnswers.calls.argsFor(1)[1]).toBe(1);

    second.next({ version: 2 });
    expect(page.dirty).toBeFalse();
    expect(page.attempt?.version).toBe(2);
  });

  it('waits for the latest server save before submitting', () => {
    const first = new Subject<{ version: number }>();
    const second = new Subject<{ version: number }>();
    quizService.saveAnswers.and.returnValues(first, second);
    quizService.submit.and.returnValue(new Subject<{ status: string }>());
    spyOn(window, 'confirm').and.returnValue(true);

    page.setEssay(1, 'Bản đầu');
    page.saveAnswers();
    page.setEssay(1, 'Bản cuối');
    page.submitAttempt();
    expect(quizService.submit).not.toHaveBeenCalled();

    first.next({ version: 1 });
    expect(quizService.submit).not.toHaveBeenCalled();
    second.next({ version: 2 });
    expect(quizService.submit).toHaveBeenCalledOnceWith(12);
  });

  it('keeps the attempt open until a requested close is saved', () => {
    const inFlight = new Subject<{ version: number }>();
    quizService.saveAnswers.and.returnValue(inFlight);

    page.setEssay(1, 'Chưa xác nhận');
    page.saveAnswers();
    page.closeAttempt();
    expect(page.attempt).not.toBeNull();
    expect(quizService.getAvailable).not.toHaveBeenCalled();

    inFlight.next({ version: 1 });
    expect(page.attempt).toBeNull();
    expect(quizService.getAvailable).toHaveBeenCalled();
  });

  it('preserves local answers on a two-tab conflict until the student resolves it', () => {
    const first = new Subject<{ version: number }>();
    const retried = new Subject<{ version: number }>();
    quizService.saveAnswers.and.returnValues(first, retried);
    quizService.getAttempt.and.returnValue(of(attempt(2)));

    page.setEssay(1, 'Đáp án trên máy này');
    page.saveAnswers();
    first.error({ status: 409, error: { message: 'Đã cập nhật ở tab khác.' } });

    expect(page.answers[1].textAnswer).toBe('Đáp án trên máy này');
    expect(page.saveConflict).toBeTrue();
    expect(quizService.getAttempt).not.toHaveBeenCalled();

    page.resolveConflict(true);
    expect(quizService.saveAnswers.calls.argsFor(1)[1]).toBe(2);
    expect(quizService.saveAnswers.calls.argsFor(1)[2][0].textAnswer).toBe('Đáp án trên máy này');
    retried.next({ version: 3 });
    expect(page.dirty).toBeFalse();
  });

  it('does not submit when the latest save fails and warns before navigation', () => {
    const failed = new Subject<{ version: number }>();
    quizService.saveAnswers.and.returnValue(failed);
    spyOn(window, 'confirm').and.returnValue(true);

    page.setEssay(1, 'Bài chưa lưu');
    page.submitAttempt();
    failed.error({ status: 503 });

    expect(page.dirty).toBeTrue();
    expect(page.saveError).toBeTrue();
    expect(page.submitting).toBeFalse();
    expect(quizService.submit).not.toHaveBeenCalled();
    expect(page.canLeave()).toBeTrue();
    expect(window.confirm).toHaveBeenCalledTimes(2);
  });
});
