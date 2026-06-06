export type Subject = string;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export interface QuestionOption {
  key: AnswerKey;
  text: string;
  image: string | null;
}

export interface Question {
  id: string;
  subject: Subject;
  level: string;
  stage: string;
  year: number | null;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  questionType: 'single-choice';
  questionText: string;
  questionImage: string | null;
  table: unknown | null;
  formula: string | null;
  options: QuestionOption[];
  answer: AnswerKey;
  explanationText: string;
  explanationImage: string | null;
  source?: Record<string, unknown>;
  qa?: Record<string, unknown>;
  tags?: string[];
}

export interface QuestionBank {
  bankId: string;
  title: string;
  subject: Subject;
  level: string;
  version: string;
  language: string;
  questionCount: number;
  questions: Question[];
}

export type SessionMode = 'daily' | 'simulation' | 'try-again' | 'adventure';

export interface ExamConfig {
  mode: SessionMode;
  title: string;
  subject: Subject | 'Campuran';
  questionCount: number;
  durationMinutes: number | null;
  softTimer: boolean;
  includeWrongFirst?: boolean;
  topic?: string;
}

export interface ExamQuestion {
  question: Question;
  options: QuestionOption[];
}

export interface ExamSession {
  id: string;
  config: ExamConfig;
  questions: ExamQuestion[];
  answers: Record<string, AnswerKey | undefined>;
  flagged: Record<string, boolean>;
  startedAt: number;
  submittedAt?: number;
}

export interface ReviewItem {
  question: Question;
  options: QuestionOption[];
  selected?: AnswerKey;
  isCorrect: boolean;
}

export interface ResultRecord {
  id: string;
  title: string;
  mode: SessionMode;
  subject: Subject | 'Campuran';
  score: number;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  durationSeconds: number;
  submittedAt: number;
  weakTopics: string[];
  reviewItems: ReviewItem[];
}
