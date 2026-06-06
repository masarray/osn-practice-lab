import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/data/questionBanks.json');
const banks = JSON.parse(fs.readFileSync(file, 'utf8'));
const ids = new Set();
const errors = [];
let count = 0;
for (const bank of banks) {
  if (bank.questionCount !== bank.questions.length) errors.push(`${bank.bankId}: questionCount mismatch`);
  for (const q of bank.questions) {
    count++;
    if (ids.has(q.id)) errors.push(`Duplicate question id ${q.id}`);
    ids.add(q.id);
    const keys = q.options.map((o) => o.key).join('');
    if (keys !== 'ABCD') errors.push(`${q.id}: option keys must be ABCD`);
    if (!['A', 'B', 'C', 'D'].includes(q.answer)) errors.push(`${q.id}: invalid answer`);
    if (!q.questionText?.trim()) errors.push(`${q.id}: empty question text`);
    if (!q.explanationText?.trim()) errors.push(`${q.id}: empty explanation`);
  }
}
if (errors.length) {
  console.error('DATA VALIDATION FAILED');
  for (const error of errors) console.error('-', error);
  process.exit(1);
}
console.log(`DATA VALIDATION PASSED: ${count} questions checked.`);
