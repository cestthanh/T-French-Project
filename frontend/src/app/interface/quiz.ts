export type QuizQuestionType = 'SingleChoice' | 'MultipleChoice' | 'Essay';
export type QuizAttemptStatus = 'InProgress' | 'Submitted' | 'PendingGrading' | 'Graded' | 'Expired';

export interface QuizOption {
  id: number;
  text: string;
  order: number;
  isCorrect?: boolean | null;
}

export interface QuizAnswer {
  id?: number;
  textAnswer?: string;
  selectedOptionIds: number[];
  score?: number;
  feedback?: string;
}

export interface AttemptQuestion {
  id: number;
  type: QuizQuestionType;
  content: string;
  points: number;
  order: number;
  explanation?: string;
  options: QuizOption[];
  answer?: QuizAnswer;
}

export interface QuizAttempt {
  id: number;
  status: QuizAttemptStatus;
  startedAt: string;
  deadline: string;
  submittedAt?: string;
  score?: number;
  version: number;
  quiz: { id: number; title: string; description?: string; totalPoints: number };
  questions: AttemptQuestion[];
}

export interface AvailableQuiz {
  id: number;
  title: string;
  description?: string;
  openAt: string;
  closeAt: string;
  durationMinutes: number;
  className: string;
  course: string;
  questionCount: number;
  totalPoints: number;
  attempt?: { id: number; status: QuizAttemptStatus; score?: number; deadline: string };
}

export interface ManagedQuiz {
  id: number;
  title: string;
  isPublished: boolean;
  openAt: string;
  closeAt: string;
  durationMinutes: number;
  classId: number;
  className: string;
  courseId: number;
  course: string;
  questionCount: number;
  totalPoints: number;
  attemptCount: number;
  pendingGrading: number;
}

export interface SaveQuizOption { text: string; isCorrect: boolean; }
export interface SaveQuizQuestion {
  type: QuizQuestionType;
  content: string;
  points: number;
  explanation?: string;
  rubric?: string;
  options: SaveQuizOption[];
}
export interface SaveQuizRequest {
  title: string;
  description?: string;
  classId: number;
  openAt: string;
  closeAt: string;
  durationMinutes: number;
  showAnswersAfterGrading: boolean;
  questions: SaveQuizQuestion[];
}

export interface QuizResult {
  id: number;
  studentId: number;
  student: string;
  email: string;
  status: QuizAttemptStatus;
  score?: number;
  startedAt: string;
  submittedAt?: string;
  essayAnswers: Array<{
    id: number;
    questionId: number;
    question: string;
    points: number;
    textAnswer?: string;
    manualScore?: number;
    feedback?: string;
    scoreDraft?: number;
    feedbackDraft?: string;
  }>;
}
