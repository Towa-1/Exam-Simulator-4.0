export type QuestionType = 'MCQ' | 'NUM';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  unit?: string;
  answer: string;
  explanation: string;
}

export interface ExamState {
  questions: Question[];
  duration: number; // in minutes
  startTime: number | null;
  endTime: number | null;
  userAnswers: Record<string, string>;
  markedForReview: Set<string>;
  checkedAnswers: Set<string>;
  isPaused: boolean;
  timeRemaining: number;
  phase: 'INPUT' | 'SETUP' | 'QUIZ' | 'RESULTS';
}
