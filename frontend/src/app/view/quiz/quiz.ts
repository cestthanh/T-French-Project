import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  AvailableQuiz,
  ManagedClass,
  ManagedQuiz,
  QuizAttempt,
  QuizQuestionType,
  QuizResult,
  SaveQuizQuestion,
  SaveQuizRequest,
} from 'src/app/interface';
import { AuthService } from 'src/app/services/authService';
import { ClassService } from 'src/app/services/classService';
import { QuizService } from 'src/app/services/quizService';
import { ToastService } from 'src/app/services/share/toastService';
import {
  MAX_IMPORT_BYTES, QuizImportResult, parseQuizBlocks, readDocxBlocks, textToBlocks,
} from './quiz-import';

interface DraftAnswer { textAnswer?: string; selectedOptionIds: number[]; }

@Component({
    selector: 'app-quiz-page', templateUrl: './quiz.html',
    standalone: false
})
export class QuizPage implements OnInit, OnDestroy {
  available: AvailableQuiz[] = [];
  managed: ManagedQuiz[] = [];
  classes: ManagedClass[] = [];
  results: QuizResult[] = [];
  resultQuiz: ManagedQuiz | null = null;
  attempt: QuizAttempt | null = null;
  answers: Record<number, DraftAnswer> = {};
  secondsRemaining = 0;
  loading = true;
  saving = false;
  saveError = false;
  saveConflict = false;
  resolvingConflict = false;
  submitting = false;
  creating = false;
  previewing = false;
  previewAnswers: Record<number, string> = {};
  loadingEditor = false;
  editingQuizId: number | null = null;

  importOpen = false;
  importReading = false;
  importText = '';
  importSource = '';
  importResult: QuizImportResult | null = null;
  /** Problems left in questions already placed in the editor, numbered as in the editor. */
  importNotes: string[] = [];

  quizDraft = {
    title: '', description: '', classId: null as number | null,
    openAt: '', closeAt: '', durationMinutes: 45,
    showAnswersAfterGrading: true,
    questions: [] as SaveQuizQuestion[],
  };

  private draftBaseline = JSON.stringify(this.quizDraft);

  private clock?: ReturnType<typeof setInterval>;
  private autosave?: ReturnType<typeof setInterval>;
  private saveDebounce?: ReturnType<typeof setTimeout>;
  private saveSubscription?: Subscription;
  private editRevision = 0;
  private savedRevision = 0;
  private pendingAction: 'close' | 'submit' | null = null;

  get isStudent(): boolean { return this.auth.currentUser?.role === 'Student'; }
  get dirty(): boolean { return this.editRevision > this.savedRevision; }
  get draftDirty(): boolean { return JSON.stringify(this.quizDraft) !== this.draftBaseline; }
  get canEdit(): boolean {
    return this.attempt?.status === 'InProgress' && this.secondsRemaining > 0 &&
      !this.submitting && !this.resolvingConflict;
  }
  get totalPoints(): number { return this.quizDraft.questions.reduce((sum, q) => sum + Number(q.points || 0), 0); }
  questionTypeLabel(type: QuizQuestionType): string {
    if (type === 'SingleChoice') return 'Trắc nghiệm · Một đáp án';
    if (type === 'MultipleChoice') return 'Trắc nghiệm · Nhiều đáp án';
    return 'Tự luận · Bài viết';
  }
  wordCount(value?: string | null): number {
    const text = value?.trim();
    return text ? text.split(/\s+/u).length : 0;
  }
  get timeLabel(): string {
    const minutes = Math.floor(this.secondsRemaining / 60).toString().padStart(2, '0');
    const seconds = (this.secondsRemaining % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  constructor(
    public auth: AuthService,
    private quizService: QuizService,
    private classService: ClassService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    if (this.isStudent) this.loadAvailable();
    else this.loadManaged();
  }

  ngOnDestroy(): void {
    this.stopTimers();
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveSubscription?.unsubscribe();
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnconfirmedWork()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  canLeave(): boolean {
    if (!this.isStudent) return !this.draftDirty && !this.creating ||
      confirm('Đề đang soạn chưa được lưu. Rời trang sẽ mất thay đổi. Bạn vẫn muốn rời đi?');
    return !this.hasUnconfirmedWork() || confirm('Đáp án chưa được lưu hoặc bài đang được nộp. Rời trang sẽ mất các thay đổi này. Bạn vẫn muốn rời đi?');
  }

  private hasUnconfirmedWork(): boolean {
    if (!this.isStudent) return this.draftDirty || this.creating;
    return this.attempt?.status === 'InProgress' &&
      (this.dirty || this.saving || this.saveError || this.saveConflict || this.submitting);
  }

  loadAvailable(): void {
    this.loading = true;
    this.quizService.getAvailable().subscribe({
      next: rows => { this.available = rows; this.loading = false; },
      error: () => { this.loading = false; this.toast.error('Không tải được danh sách bài test.'); },
    });
  }

  loadManaged(): void {
    this.loading = true;
    this.quizService.getManaged().subscribe({
      next: rows => { this.managed = rows; this.loading = false; },
      error: () => { this.loading = false; this.toast.error('Không tải được bài test.'); },
    });
    this.classService.getManaged().subscribe({
      next: rows => (this.classes = rows),
      error: () => this.toast.error('Không tải được danh sách lớp.'),
    });
  }

  openQuiz(item: AvailableQuiz): void {
    if (!item.attempt && !confirm(`Bắt đầu "${item.title}"? Đồng hồ sẽ chạy ngay và bài chỉ được làm một lần.`)) return;
    this.quizService.start(item.id).subscribe({
      next: started => this.loadAttempt(started.id),
      error: err => this.toast.error(err?.error?.message ?? 'Không thể bắt đầu bài test.'),
    });
  }

  loadAttempt(id: number): void {
    this.quizService.getAttempt(id).subscribe({
      next: attempt => this.applyAttempt(attempt),
      error: () => this.toast.error('Không tải được lượt làm bài.'),
    });
  }

  closeAttempt(): void {
    if (this.pendingAction || this.submitting || this.resolvingConflict) return;
    if (this.saveConflict) {
      this.toast.error('Hãy xử lý xung đột lưu bài trước khi quay lại.');
      return;
    }
    if (this.attempt?.status === 'InProgress' && (this.dirty || this.saving)) {
      this.pendingAction = 'close';
      this.saveAnswers();
      return;
    }
    this.hideAttempt();
  }

  private hideAttempt(): void {
    this.attempt = null;
    this.stopTimers();
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.answers = {};
    this.loadAvailable();
  }

  selectSingle(questionId: number, optionId: number): void {
    if (!this.canEdit) return;
    this.answers[questionId].selectedOptionIds = [optionId];
    this.markDirty();
  }

  toggleMultiple(questionId: number, optionId: number, checked: boolean): void {
    if (!this.canEdit) return;
    const selected = this.answers[questionId].selectedOptionIds;
    this.answers[questionId].selectedOptionIds = checked
      ? [...new Set([...selected, optionId])]
      : selected.filter(id => id !== optionId);
    this.markDirty();
  }

  setEssay(questionId: number, value: string): void {
    if (!this.canEdit) return;
    this.answers[questionId].textAnswer = value;
    this.markDirty();
  }

  isSelected(questionId: number, optionId: number): boolean {
    return this.answers[questionId]?.selectedOptionIds.includes(optionId) ?? false;
  }

  saveAnswers(): void {
    if (!this.attempt || this.attempt.status !== 'InProgress') return;
    if (this.saving || this.saveConflict || this.resolvingConflict) return;
    if (this.saveError && !this.pendingAction) return;
    if (!this.dirty) { this.runPendingAction(); return; }

    this.saving = true;
    this.saveError = false;
    const attemptId = this.attempt.id;
    const sentRevision = this.editRevision;
    const payload = Object.entries(this.answers).map(([questionId, answer]) => ({
      questionId: Number(questionId), textAnswer: answer.textAnswer,
      selectedOptionIds: [...answer.selectedOptionIds],
    }));
    this.saveSubscription = this.quizService.saveAnswers(attemptId, this.attempt.version, payload).subscribe({
      next: result => {
        if (this.attempt?.id !== attemptId) return;
        this.saving = false;
        this.savedRevision = sentRevision;
        this.attempt.version = result.version;
        if (this.dirty) this.saveAnswers();
        else this.runPendingAction();
      },
      error: err => {
        if (this.attempt?.id !== attemptId) return;
        this.saving = false;
        this.saveError = true;
        this.saveConflict = err?.status === 409;
        this.pendingAction = null;
        this.submitting = false;
        this.toast.error(err?.error?.message ?? 'Không thể tự lưu đáp án. Đáp án đang nhập vẫn ở trên trang.');
      },
    });
  }

  submitAttempt(auto = false): void {
    if (!this.attempt || this.attempt.status !== 'InProgress' ||
        this.pendingAction || this.submitting || this.resolvingConflict) return;
    if (!auto && !confirm('Nộp bài ngay? Bạn không thể sửa đáp án sau khi nộp.')) return;
    if (this.saveConflict) {
      this.toast.error('Hãy xử lý xung đột lưu bài trước khi nộp.');
      return;
    }
    this.submitting = true;
    this.pendingAction = 'submit';
    this.saveAnswers();
  }

  private finishSubmit(): void {
    if (!this.attempt) return;
    this.quizService.submit(this.attempt.id).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Đã nộp bài thành công.');
        this.loadAttempt(this.attempt!.id);
        this.loadAvailable();
      },
      error: err => {
        this.submitting = false;
        this.toast.error(err?.error?.message ?? 'Không thể xác nhận nộp bài. Hãy thử lại.');
      },
    });
  }

  retrySave(): void {
    if (!this.attempt || this.saveConflict) return;
    this.saveError = false;
    this.saveAnswers();
  }

  resolveConflict(keepLocal: boolean): void {
    if (!this.attempt || this.resolvingConflict) return;
    if (!keepLocal && !confirm('Tải đáp án trên máy chủ sẽ bỏ các thay đổi chưa lưu trên máy này. Tiếp tục?')) return;
    this.resolvingConflict = true;
    const attemptId = this.attempt.id;
    this.quizService.getAttempt(attemptId).subscribe({
      next: latest => {
        this.resolvingConflict = false;
        if (this.attempt?.id !== attemptId) return;
        if (!keepLocal) {
          this.applyAttempt(latest);
          return;
        }
        if (latest.status !== 'InProgress') {
          this.toast.error('Bài đã chốt trên máy chủ. Hãy tải bản máy chủ để xem kết quả.');
          return;
        }
        this.attempt.version = latest.version;
        this.saveConflict = false;
        this.saveError = false;
        this.saveAnswers();
      },
      error: () => {
        this.resolvingConflict = false;
        this.toast.error('Không tải được trạng thái bài trên máy chủ.');
      },
    });
  }

  private applyAttempt(attempt: QuizAttempt): void {
    this.attempt = attempt;
    this.answers = {};
    for (const question of attempt.questions) {
      this.answers[question.id] = {
        textAnswer: question.answer?.textAnswer ?? '',
        selectedOptionIds: [...(question.answer?.selectedOptionIds ?? [])],
      };
    }
    this.editRevision = 0;
    this.savedRevision = 0;
    this.saving = false;
    this.saveError = false;
    this.saveConflict = false;
    this.pendingAction = null;
    this.submitting = false;
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.startTimers();
  }

  private runPendingAction(): void {
    if (this.dirty || this.saving || this.saveError || this.saveConflict) return;
    const action = this.pendingAction;
    this.pendingAction = null;
    if (action === 'close') this.hideAttempt();
    if (action === 'submit') this.finishSubmit();
  }

  addQuestion(type: QuizQuestionType): void {
    this.quizDraft.questions.push({
      type, content: '', points: 1, explanation: '', rubric: '',
      options: type === 'Essay' ? [] : [
        { text: '', isCorrect: true }, { text: '', isCorrect: false },
      ],
    });
  }

  async importWordFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
      this.toast.error('Chỉ đọc được file Word .docx. Với file .doc, hãy mở bằng Word và lưu lại dạng .docx, hoặc dán nội dung vào ô bên dưới.');
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) { this.toast.error('File Word phải nhỏ hơn 10 MB.'); return; }
    this.importReading = true;
    try {
      this.importResult = parseQuizBlocks(await readDocxBlocks(await file.arrayBuffer()));
      this.importSource = file.name;
    } catch (error) {
      this.importResult = null;
      this.toast.error(error instanceof Error ? error.message : 'Không đọc được file Word.');
    } finally {
      this.importReading = false;
    }
  }

  readPastedText(): void {
    if (!this.importText.trim()) { this.toast.error('Hãy dán nội dung đề vào ô trước.'); return; }
    this.importResult = parseQuizBlocks(textToBlocks(this.importText));
    this.importSource = 'nội dung đã dán';
  }

  get importErrors(): number { return this.importResult?.issues.filter(i => i.level === 'error').length ?? 0; }

  importSummary(result: QuizImportResult): string {
    const count = (type: QuizQuestionType) => result.questions.filter(q => q.type === type).length;
    const points = result.questions.reduce((sum, q) => sum + q.points, 0);
    return `${result.questions.length} câu · ${count('SingleChoice')} một đáp án · ${count('MultipleChoice')} nhiều đáp án · ${count('Essay')} tự luận · ${points} điểm`;
  }

  correctLetters(question: SaveQuizQuestion): string {
    return question.options.map((o, i) => (o.isCorrect ? String.fromCharCode(65 + i) : '')).filter(Boolean).join(', ') || '—';
  }

  applyImport(replace: boolean): void {
    const result = this.importResult;
    if (!result?.questions.length) return;
    if (replace && this.quizDraft.questions.length &&
        !confirm(`Thay ${this.quizDraft.questions.length} câu đang có bằng ${result.questions.length} câu từ ${this.importSource}?`)) return;
    const offset = replace ? 0 : this.quizDraft.questions.length;
    this.quizDraft.questions = [...(replace ? [] : this.quizDraft.questions), ...result.questions];

    const preamble = [...result.preamble];
    if (!this.quizDraft.title.trim() && preamble.length && preamble[0].length <= 200) this.quizDraft.title = preamble.shift()!;
    if (!this.quizDraft.description.trim() && preamble.length) this.quizDraft.description = preamble.join('\n').slice(0, 4000);

    this.importNotes = result.issues.map(issue =>
      issue.question ? `Câu ${offset + issue.question}: ${issue.message}` : issue.message);
    this.toast.success(`Đã đưa ${result.questions.length} câu vào đề. Kiểm tra lại rồi lưu bản nháp.`);
    this.closeImport();
  }

  closeImport(): void {
    this.importOpen = false;
    this.importResult = null;
    this.importText = '';
  }

  removeQuestion(index: number): void { this.quizDraft.questions.splice(index, 1); }
  addOption(question: SaveQuizQuestion): void { question.options.push({ text: '', isCorrect: false }); }
  removeOption(question: SaveQuizQuestion, index: number): void { question.options.splice(index, 1); }

  setCorrect(question: SaveQuizQuestion, optionIndex: number, checked: boolean): void {
    if (question.type === 'SingleChoice') {
      question.options.forEach((option, index) => (option.isCorrect = index === optionIndex));
    } else {
      question.options[optionIndex].isCorrect = checked;
    }
  }

  createQuiz(): void {
    if (this.creating || this.loadingEditor) return;
    if (!this.quizDraft.title.trim() || !this.quizDraft.classId || !this.quizDraft.openAt || !this.quizDraft.closeAt) {
      this.toast.error('Vui lòng nhập đủ tên, lớp và thời gian mở/đóng.'); return;
    }
    if (!this.quizDraft.questions.length) { this.toast.error('Bài test phải có ít nhất một câu hỏi.'); return; }
    if (this.totalPoints <= 0) { this.toast.error('Tổng điểm của đề phải lớn hơn 0.'); return; }

    const openAt = new Date(this.quizDraft.openAt);
    const closeAt = new Date(this.quizDraft.closeAt);
    if (!Number.isFinite(openAt.getTime()) || !Number.isFinite(closeAt.getTime()) || closeAt <= openAt) {
      this.toast.error('Thời gian đóng phải sau thời gian mở.'); return;
    }
    if (!Number.isInteger(this.quizDraft.durationMinutes) || this.quizDraft.durationMinutes < 1 || this.quizDraft.durationMinutes > 480) {
      this.toast.error('Thời lượng phải là số nguyên từ 1 đến 480 phút.'); return;
    }

    const request: SaveQuizRequest = {
      ...this.quizDraft,
      classId: this.quizDraft.classId,
      openAt: openAt.toISOString(),
      closeAt: closeAt.toISOString(),
    };
    this.creating = true;
    const editing = this.editingQuizId != null;
    const save = editing ? this.quizService.update(this.editingQuizId!, request) : this.quizService.create(request);
    save.subscribe({
      next: () => {
        this.creating = false;
        this.resetDraft();
        this.loadManaged();
        this.toast.success(editing ? 'Đã lưu thay đổi bản nháp.' : 'Đã tạo bản nháp bài test. Hãy kiểm tra rồi công bố.');
      },
      error: err => { this.creating = false; this.toast.error(err?.error?.message ?? 'Không thể lưu bài test.'); },
    });
  }

  editQuiz(item: ManagedQuiz): void {
    if (this.creating || this.loadingEditor) return;
    if (item.isPublished || item.attemptCount > 0) {
      this.toast.error('Chỉ sửa được bản nháp chưa có lượt làm.'); return;
    }
    if (this.draftDirty && !confirm('Đề đang soạn chưa lưu. Bỏ thay đổi để mở bản nháp này?')) return;
    this.loadingEditor = true;
    this.quizService.getManagedDetail(item.id).subscribe({
      next: detail => {
        this.loadingEditor = false;
        if (detail.isPublished || detail.attemptCount > 0) {
          this.toast.error('Đề đã được công bố hoặc có lượt làm. Hãy tải lại danh sách.'); return;
        }
        this.editingQuizId = detail.id;
        this.importNotes = [];
        this.closeImport();
        this.quizDraft = {
          title: detail.title, description: detail.description ?? '', classId: detail.classId,
          openAt: this.localDateTime(detail.openAt), closeAt: this.localDateTime(detail.closeAt),
          durationMinutes: detail.durationMinutes, showAnswersAfterGrading: detail.showAnswersAfterGrading,
          questions: detail.questions.map(q => ({
            type: q.type, content: q.content, points: q.points,
            explanation: q.explanation ?? '', rubric: q.rubric ?? '',
            options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
          })),
        };
        this.draftBaseline = JSON.stringify(this.quizDraft);
      },
      error: err => {
        this.loadingEditor = false;
        this.toast.error(err?.error?.message ?? 'Không tải được bản nháp.');
      },
    });
  }

  newDraft(): void {
    if (this.creating || this.loadingEditor) return;
    if (this.draftDirty && !confirm('Bỏ các thay đổi chưa lưu để soạn đề mới?')) return;
    this.resetDraft();
  }

  private localDateTime(value: string): string {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
  }

  releaseResults(item: ManagedQuiz): void {
    if (!confirm('Công bố điểm, nhận xét và đáp án theo cài đặt đề cho các lượt đã chấm?')) return;
    this.quizService.releaseResults(item.id).subscribe({
      next: () => { this.toast.success('Đã công bố kết quả.'); if (this.resultQuiz?.id === item.id) this.viewResults(item); },
      error: err => this.toast.error(err?.error?.message ?? 'Không công bố được kết quả.'),
    });
  }

  togglePublish(item: ManagedQuiz): void {
    if (this.creating || this.loadingEditor) return;
    if (this.editingQuizId === item.id && this.draftDirty) {
      this.toast.error('Hãy lưu thay đổi bản nháp trước khi công bố.'); return;
    }
    this.quizService.togglePublish(item.id).subscribe({
      next: result => {
        item.isPublished = result.isPublished;
        if (this.editingQuizId === item.id) this.resetDraft();
        this.toast.success(result.isPublished ? 'Đã publish bài test.' : 'Đã ẩn bài test.');
      },
      error: err => this.toast.error(err?.error?.message ?? 'Không thể publish bài test.'),
    });
  }

  viewResults(item: ManagedQuiz): void {
    this.resultQuiz = item;
    this.quizService.getResults(item.id).subscribe({
      next: rows => {
        this.results = rows;
        for (const row of rows) for (const answer of row.essayAnswers) {
          answer.scoreDraft = answer.manualScore ?? 0;
          answer.feedbackDraft = answer.feedback ?? '';
        }
      },
      error: () => this.toast.error('Không tải được kết quả bài test.'),
    });
  }

  grade(answer: QuizResult['essayAnswers'][number]): void {
    const score = Number(answer.scoreDraft);
    if (Number.isNaN(score) || score < 0 || score > answer.points) {
      this.toast.error(`Điểm phải từ 0 đến ${answer.points}.`); return;
    }
    this.quizService.gradeAnswer(answer.id, score, answer.feedbackDraft).subscribe({
      next: () => {
        this.toast.success('Đã lưu điểm tự luận.');
        if (this.resultQuiz) this.viewResults(this.resultQuiz);
      },
      error: err => this.toast.error(err?.error?.message ?? 'Không thể lưu điểm.'),
    });
  }

  private markDirty(): void {
    this.editRevision++;
    if (!this.saveConflict) this.saveError = false;
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => this.saveAnswers(), 1500);
  }

  private startTimers(): void {
    this.stopTimers();
    if (!this.attempt || this.attempt.status !== 'InProgress') return;
    const tick = () => {
      this.secondsRemaining = Math.max(0, Math.ceil((new Date(this.attempt!.deadline).getTime() - Date.now()) / 1000));
      if (this.secondsRemaining === 0) { this.stopTimers(); this.submitAttempt(true); }
    };
    tick();
    if (this.secondsRemaining === 0) return;
    this.clock = setInterval(tick, 1000);
    this.autosave = setInterval(() => this.saveAnswers(), 15_000);
  }

  private stopTimers(): void {
    if (this.clock) clearInterval(this.clock);
    if (this.autosave) clearInterval(this.autosave);
    this.clock = undefined; this.autosave = undefined;
  }

  private resetDraft(): void {
    this.previewing = false;
    this.importNotes = [];
    this.closeImport();
    this.editingQuizId = null;
    this.quizDraft = { title: '', description: '', classId: null, openAt: '', closeAt: '', durationMinutes: 45, showAnswersAfterGrading: true, questions: [] };
    this.draftBaseline = JSON.stringify(this.quizDraft);
  }
}
