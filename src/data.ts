import rawBanks from './data/questionBanks.json';
import type { Question, QuestionBank, Subject } from './types';

export const questionBanks = rawBanks as QuestionBank[];
export const allQuestions: Question[] = questionBanks.flatMap((bank) => bank.questions);

export const subjects: Subject[] = ['Matematika', 'IPA', 'IPS'];

export function getQuestionsBySubject(subject: Subject | 'Campuran'): Question[] {
  if (subject === 'Campuran') return allQuestions;
  return allQuestions.filter((q) => q.subject === subject);
}

export function getTopics(subject?: Subject | 'Campuran'): string[] {
  const source = subject ? getQuestionsBySubject(subject) : allQuestions;
  return Array.from(new Set(source.map((q) => q.topic))).sort();
}

export const bankStats = {
  total: allQuestions.length,
  bySubject: subjects.map((subject) => ({
    subject,
    total: getQuestionsBySubject(subject).length,
    topics: getTopics(subject).length
  }))
};
