import rawBanks from './data/questionBanks.json';
import type { Question, QuestionBank, Subject } from './types';

export const questionBanks = rawBanks as QuestionBank[];
export const allQuestions: Question[] = questionBanks.flatMap((bank) => bank.questions);

export const subjects: Subject[] = Array.from(new Set(allQuestions.map((question) => question.subject))).sort((a, b) => {
  const order = ['Matematika', 'IPA', 'IPS', 'IPAS', 'Bahasa Indonesia', 'Bahasa Inggris', 'Pendidikan Pancasila', 'ANBK Literasi', 'ANBK Numerasi'];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  return a.localeCompare(b);
});

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
