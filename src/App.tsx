import { useEffect, useMemo, useRef, useState } from 'react';
import { allQuestions, bankStats, getQuestionsBySubject, getTopics, subjects } from './data';
import type { AnswerKey, ExamConfig, ExamQuestion, ExamSession, Question, QuestionOption, ResultRecord, ReviewItem, SessionMode, Subject } from './types';

const STORAGE_KEY = 'osn-practice-lab-results-v0.3';

type Screen = 'home' | 'exam' | 'result' | 'reward';

type StoredProgress = {
  results: ResultRecord[];
  wrongQuestionIds: string[];
  rewardTickets: number;
  streakDays: string[];
};

const defaultProgress: StoredProgress = {
  results: [],
  wrongQuestionIds: [],
  rewardTickets: 0,
  streakDays: []
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readProgress(): StoredProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw) as StoredProgress;
    return {
      results: parsed.results ?? [],
      wrongQuestionIds: parsed.wrongQuestionIds ?? [],
      rewardTickets: parsed.rewardTickets ?? 0,
      streakDays: parsed.streakDays ?? []
    };
  } catch {
    return defaultProgress;
  }
}

function saveProgress(progress: StoredProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeExamQuestion(question: Question): ExamQuestion {
  return { question, options: shuffle(question.options) };
}

function selectQuestions(config: ExamConfig, progress: StoredProgress): ExamQuestion[] {
  let pool = getQuestionsBySubject(config.subject);
  if (config.topic) pool = pool.filter((q) => q.topic === config.topic);

  const wrongSet = new Set(progress.wrongQuestionIds);
  const wrongPool = pool.filter((q) => wrongSet.has(q.id));
  const newPool = pool.filter((q) => !wrongSet.has(q.id));

  const ordered = config.includeWrongFirst
    ? [...shuffle(wrongPool), ...shuffle(newPool)]
    : shuffle(pool);

  return ordered.slice(0, Math.min(config.questionCount, ordered.length)).map(makeExamQuestion);
}

function createSession(config: ExamConfig, progress: StoredProgress): ExamSession {
  return {
    id: `session-${Date.now()}`,
    config,
    questions: selectQuestions(config, progress),
    answers: {},
    flagged: {},
    startedAt: Date.now()
  };
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const mm = Math.floor(safe / 60).toString().padStart(2, '0');
  const ss = Math.floor(safe % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function subjectAccent(subject: Subject | 'Campuran') {
  if (subject === 'Matematika') return 'accent-math';
  if (subject === 'IPA') return 'accent-ipa';
  if (subject === 'IPS') return 'accent-ips';
  return 'accent-mix';
}

function scoreSession(session: ExamSession): ResultRecord {
  const reviewItems: ReviewItem[] = session.questions.map(({ question, options }) => {
    const selected = session.answers[question.id];
    return { question, options, selected, isCorrect: selected === question.answer };
  });
  const correct = reviewItems.filter((item) => item.isCorrect).length;
  const blank = reviewItems.filter((item) => !item.selected).length;
  const wrong = reviewItems.length - correct - blank;
  const topicWrong = new Map<string, number>();
  for (const item of reviewItems) {
    if (!item.isCorrect) topicWrong.set(item.question.topic, (topicWrong.get(item.question.topic) ?? 0) + 1);
  }
  const weakTopics = [...topicWrong.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([topic]) => topic);
  const submittedAt = Date.now();
  return {
    id: `result-${submittedAt}`,
    title: session.config.title,
    mode: session.config.mode,
    subject: session.config.subject,
    score: Math.round((correct / Math.max(1, reviewItems.length)) * 100),
    total: reviewItems.length,
    correct,
    wrong,
    blank,
    durationSeconds: Math.round((submittedAt - session.startedAt) / 1000),
    submittedAt,
    weakTopics,
    reviewItems
  };
}

function difficultyLabel(value: string) {
  if (value === 'easy') return 'Pemanasan';
  if (value === 'medium') return 'Menengah';
  return 'Tantangan';
}

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [progress, setProgress] = useState<StoredProgress>(() => readProgress());
  const [session, setSession] = useState<ExamSession | null>(null);
  const [result, setResult] = useState<ResultRecord | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => saveProgress(progress), [progress]);

  const startExam = (config: ExamConfig) => {
    const next = createSession(config, progress);
    setSession(next);
    setResult(null);
    setReviewOpen(false);
    setScreen('exam');
  };

  const submitSession = (submitted: ExamSession) => {
    const scored = scoreSession(submitted);
    const wrongIds = scored.reviewItems.filter((item) => !item.isCorrect).map((item) => item.question.id);
    const day = todayKey();
    setProgress((prev) => {
      const mergedWrong = Array.from(new Set([...wrongIds, ...prev.wrongQuestionIds])).slice(0, 300);
      const streakDays = prev.streakDays.includes(day) ? prev.streakDays : [...prev.streakDays, day].slice(-30);
      const earnedTicket = scored.mode === 'daily' || scored.mode === 'try-again' || scored.mode === 'adventure' ? 1 : 2;
      return {
        results: [scored, ...prev.results].slice(0, 40),
        wrongQuestionIds: mergedWrong,
        rewardTickets: prev.rewardTickets + earnedTicket,
        streakDays
      };
    });
    setResult(scored);
    setSession(null);
    setScreen('result');
  };

  if (screen === 'exam' && session) {
    return <ExamScreen session={session} onChange={setSession} onSubmit={submitSession} onExit={() => setScreen('home')} />;
  }

  if (screen === 'result' && result) {
    return <ResultScreen result={result} reviewOpen={reviewOpen} setReviewOpen={setReviewOpen} onHome={() => setScreen('home')} onReward={() => setScreen('reward')} />;
  }

  if (screen === 'reward') {
    return <RewardRoom tickets={progress.rewardTickets} onUseTicket={() => setProgress((p) => ({ ...p, rewardTickets: Math.max(0, p.rewardTickets - 1) }))} onHome={() => setScreen('home')} />;
  }

  return <HomeScreen progress={progress} onStart={startExam} onReward={() => setScreen('reward')} />;
}

function HomeScreen({ progress, onStart, onReward }: { progress: StoredProgress; onStart: (config: ExamConfig) => void; onReward: () => void }) {
  const last = progress.results[0];
  const average = progress.results.length ? Math.round(progress.results.slice(0, 5).reduce((acc, item) => acc + item.score, 0) / Math.min(5, progress.results.length)) : 0;
  const weak = useMemo(() => {
    const map = new Map<string, number>();
    for (const result of progress.results.slice(0, 8)) {
      for (const topic of result.weakTopics) map.set(topic, (map.get(topic) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([topic]) => topic);
  }, [progress.results]);

  return (
    <main className="app-shell home-bg">
      <section className="hero-panel">
        <div className="brand-row">
          <div className="app-mark">✓</div>
          <div>
            <p className="eyebrow">OSN Practice Lab SD</p>
            <h1>Latihan OSN yang serius, tapi tetap ramah untuk anak.</h1>
          </div>
        </div>
        <p className="hero-copy">Mulai dari misi kecil harian, lanjut ke simulasi CBT 60 soal, lalu review jawaban dengan bahasa yang aman untuk anak mencoba lagi.</p>
        <div className="hero-actions">
          <button className="primary-btn" onClick={() => onStart({ mode: 'daily', title: 'Misi Harian 10 Soal', subject: 'Campuran', questionCount: 10, durationMinutes: null, softTimer: true, includeWrongFirst: true })}>Mulai Misi Hari Ini</button>
          <button className="secondary-btn" onClick={() => onStart({ mode: 'simulation', title: 'Simulasi OSN 60 Soal', subject: 'Campuran', questionCount: 60, durationMinutes: 60, softTimer: false })}>Simulasi 60 Soal</button>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Bank soal aktif" value={`${bankStats.total}`} helper="180 soal original OSN-style" />
        <StatCard label="Streak latihan" value={`${progress.streakDays.length}`} helper="hari latihan tercatat" />
        <StatCard label="Rata-rata terakhir" value={progress.results.length ? `${average}` : '—'} helper="5 sesi terbaru" />
        <StatCard label="Reward ticket" value={`${progress.rewardTickets}`} helper="untuk mini game pendek" />
      </section>

      <section className="content-grid">
        <div className="panel main-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Mode belajar</p>
              <h2>Pilih ritme latihan</h2>
            </div>
          </div>
          <div className="mode-grid">
            <ModeCard title="Misi Harian" badge="10 soal" text="Latihan pendek untuk membangun kebiasaan. Ada soal salah yang dipanggil ulang." accent="accent-mix" onClick={() => onStart({ mode: 'daily', title: 'Misi Harian 10 Soal', subject: 'Campuran', questionCount: 10, durationMinutes: null, softTimer: true, includeWrongFirst: true })} />
            <ModeCard title="Ulang Soal Salah" badge="5–15 soal" text="Balas dendam baik-baik ke soal yang kemarin belum tepat." accent="accent-ipa" onClick={() => onStart({ mode: 'try-again', title: 'Ulang Soal Salah', subject: 'Campuran', questionCount: 15, durationMinutes: null, softTimer: true, includeWrongFirst: true })} />
            <ModeCard title="Simulasi OSN" badge="60 soal" text="CBT serius: timer, nomor soal, ragu-ragu, submit final, lalu review." accent="accent-math" onClick={() => onStart({ mode: 'simulation', title: 'Simulasi OSN 60 Soal', subject: 'Campuran', questionCount: 60, durationMinutes: 60, softTimer: false })} />
            <ModeCard title="Reward Room" badge="mini game" text="Basketball reward terbuka setelah misi belajar selesai." accent="accent-ips" onClick={onReward} />
          </div>
        </div>

        <aside className="panel side-panel">
          <p className="eyebrow">Ringkasan orang tua</p>
          <h2>Progress anak</h2>
          {last ? (
            <div className="parent-summary">
              <div className="score-ring"><span>{last.score}</span><small>skor</small></div>
              <div>
                <p className="summary-title">Sesi terakhir: {last.title}</p>
                <p className="muted">Benar {last.correct}/{last.total} • waktu {formatTime(last.durationSeconds)}</p>
              </div>
            </div>
          ) : <p className="muted">Belum ada sesi. Mulai dari misi 10 soal agar anak tidak langsung merasa diuji.</p>}
          <div className="weak-box">
            <span className="soft-label">Topik yang perlu diulang</span>
            {weak.length ? weak.map((topic) => <span className="topic-chip" key={topic}>{topic}</span>) : <span className="muted">Belum ada data.</span>}
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Simulasi per mata pelajaran</p>
            <h2>60 soal pilihan ganda per mapel</h2>
          </div>
          <span className="soft-pill">bank v0.3</span>
        </div>
        <div className="subject-grid">
          {subjects.map((subject) => {
            const stats = bankStats.bySubject.find((item) => item.subject === subject)!;
            return <SubjectCard key={subject} subject={subject} total={stats.total} topics={stats.topics} onStart={() => onStart({ mode: 'simulation', title: `Simulasi ${subject} 60 Soal`, subject, questionCount: 60, durationMinutes: 60, softTimer: false })} />;
          })}
        </div>
      </section>

      <AdventurePanel onStart={onStart} />
    </main>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>;
}

function ModeCard({ title, badge, text, accent, onClick }: { title: string; badge: string; text: string; accent: string; onClick: () => void }) {
  return (
    <button className={`mode-card ${accent}`} onClick={onClick}>
      <span className="mode-badge">{badge}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </button>
  );
}

function SubjectCard({ subject, total, topics, onStart }: { subject: Subject; total: number; topics: number; onStart: () => void }) {
  return (
    <button className={`subject-card ${subjectAccent(subject)}`} onClick={onStart}>
      <div className="subject-icon">{subject === 'Matematika' ? '∑' : subject === 'IPA' ? '⚗' : '⌂'}</div>
      <div>
        <h3>{subject}</h3>
        <p>{total} soal • {topics} topik</p>
      </div>
      <span>Mulai</span>
    </button>
  );
}

function AdventurePanel({ onStart }: { onStart: (config: ExamConfig) => void }) {
  const adventures = [
    { title: 'Pulau Bilangan', subject: 'Matematika' as Subject, topic: 'Bilangan', text: 'Pola, faktor, kelipatan, bilangan prima.' },
    { title: 'Laboratorium Sains', subject: 'IPA' as Subject, topic: 'Makhluk Hidup', text: 'Adaptasi, organ, fotosintesis, klasifikasi.' },
    { title: 'Jelajah Nusantara', subject: 'IPS' as Subject, topic: 'Geografi Indonesia', text: 'Peta, wilayah, budaya, ekonomi, sejarah.' }
  ];
  return (
    <section className="panel adventure-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Adventure map</p>
          <h2>Latihan terasa seperti membuka level</h2>
        </div>
      </div>
      <div className="adventure-grid">
        {adventures.map((item) => {
          const available = getTopics(item.subject).includes(item.topic);
          return (
            <button className={`adventure-card ${subjectAccent(item.subject)}`} key={item.title} onClick={() => available && onStart({ mode: 'adventure', title: item.title, subject: item.subject, topic: item.topic, questionCount: 10, durationMinutes: null, softTimer: true })}>
              <span className="adventure-orb" />
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <small>{available ? '10 soal terpilih' : 'Belum tersedia'}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ExamScreen({ session, onChange, onSubmit, onExit }: { session: ExamSession; onChange: (session: ExamSession) => void; onSubmit: (session: ExamSession) => void; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const current = session.questions[index];
  const total = session.questions.length;
  const answeredCount = Object.values(session.answers).filter(Boolean).length;
  const flaggedCount = Object.values(session.flagged).filter(Boolean).length;
  const durationSeconds = Math.round((now - session.startedAt) / 1000);
  const remaining = session.config.durationMinutes ? session.config.durationMinutes * 60 - durationSeconds : null;
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remaining !== null && remaining <= 0 && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      onSubmit(session);
    }
  }, [remaining, onSubmit, session]);

  const setAnswer = (answer: AnswerKey) => {
    onChange({ ...session, answers: { ...session.answers, [current.question.id]: answer } });
  };

  const toggleFlag = () => {
    onChange({ ...session, flagged: { ...session.flagged, [current.question.id]: !session.flagged[current.question.id] } });
  };

  const finish = () => {
    const blank = total - answeredCount;
    const message = blank > 0 ? `Masih ada ${blank} soal belum dijawab. Selesaikan sekarang?` : 'Selesaikan sesi dan lihat hasil?';
    if (window.confirm(message)) onSubmit(session);
  };

  return (
    <main className="exam-layout">
      <aside className="exam-sidebar">
        <div className="exam-brand"><span className="app-mark small">✓</span><div><strong>{session.config.title}</strong><small>{session.config.subject}</small></div></div>
        <div className="timer-card">
          <span>{session.config.softTimer ? 'Waktu latihan' : 'Sisa waktu'}</span>
          <strong>{remaining === null ? formatTime(durationSeconds) : formatTime(remaining)}</strong>
        </div>
        <div className="progress-meter"><div style={{ width: `${(answeredCount / Math.max(1, total)) * 100}%` }} /></div>
        <div className="exam-metrics"><span>Terjawab <b>{answeredCount}/{total}</b></span><span>Ragu <b>{flaggedCount}</b></span></div>
        <div className="question-palette" aria-label="Nomor soal">
          {session.questions.map((item, i) => {
            const answered = Boolean(session.answers[item.question.id]);
            const flagged = Boolean(session.flagged[item.question.id]);
            return <button key={item.question.id} className={`${i === index ? 'active' : ''} ${answered ? 'answered' : ''} ${flagged ? 'flagged' : ''}`} onClick={() => setIndex(i)}>{i + 1}</button>;
          })}
        </div>
        <button className="ghost-btn full" onClick={onExit}>Keluar</button>
      </aside>

      <section className="question-stage">
        <div className="question-card">
          <div className="question-topbar">
            <div><span className="soft-label">Soal {index + 1} dari {total}</span><h2>{current.question.subject} • {current.question.topic}</h2></div>
            <span className={`difficulty ${current.question.difficulty}`}>{difficultyLabel(current.question.difficulty)}</span>
          </div>
          <p className="question-text">{current.question.questionText}</p>
          {current.question.questionImage && <img className="question-image" src={current.question.questionImage} alt="Gambar soal" />}
          <div className="option-list">
            {current.options.map((option) => {
              const selected = session.answers[current.question.id] === option.key;
              return (
                <button key={option.key} className={`option-card ${selected ? 'selected' : ''}`} onClick={() => setAnswer(option.key)}>
                  <span className="option-key">{option.key}</span>
                  <span>{option.text}</span>
                  {option.image && <img src={option.image} alt={`Pilihan ${option.key}`} />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="exam-controls">
          <button className="secondary-btn" disabled={index === 0} onClick={() => setIndex((v) => Math.max(0, v - 1))}>Sebelumnya</button>
          <button className={`flag-btn ${session.flagged[current.question.id] ? 'on' : ''}`} onClick={toggleFlag}>{session.flagged[current.question.id] ? 'Ragu-ragu ditandai' : 'Tandai ragu-ragu'}</button>
          {index < total - 1 ? <button className="primary-btn" onClick={() => setIndex((v) => Math.min(total - 1, v + 1))}>Berikutnya</button> : <button className="primary-btn" onClick={finish}>Submit Final</button>}
        </div>
      </section>
    </main>
  );
}

function ResultScreen({ result, reviewOpen, setReviewOpen, onHome, onReward }: { result: ResultRecord; reviewOpen: boolean; setReviewOpen: (open: boolean) => void; onHome: () => void; onReward: () => void }) {
  return (
    <main className="app-shell result-bg">
      <section className="result-hero panel">
        <div className="score-ring big"><span>{result.score}</span><small>skor</small></div>
        <div>
          <p className="eyebrow">Hasil latihan</p>
          <h1>{result.score >= 80 ? 'Mantap, pola berpikirnya makin kuat.' : result.score >= 60 ? 'Bagus, sudah ada fondasi yang bisa dibangun.' : 'Tidak apa-apa. Ini data untuk latihan berikutnya.'}</h1>
          <p className="hero-copy">Benar {result.correct}, salah {result.wrong}, kosong {result.blank}. Waktu pengerjaan {formatTime(result.durationSeconds)}.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => setReviewOpen(!reviewOpen)}>{reviewOpen ? 'Tutup Review' : 'Review Jawaban'}</button>
            <button className="secondary-btn" onClick={onReward}>Reward Room</button>
            <button className="ghost-btn" onClick={onHome}>Kembali Home</button>
          </div>
        </div>
      </section>

      <section className="stats-grid compact">
        <StatCard label="Benar" value={`${result.correct}`} helper="jawaban tepat" />
        <StatCard label="Belum tepat" value={`${result.wrong}`} helper="bahan latihan ulang" />
        <StatCard label="Kosong" value={`${result.blank}`} helper="perlu cek waktu" />
        <StatCard label="Topik lemah" value={`${result.weakTopics.length}`} helper={result.weakTopics.join(', ') || 'belum ada'} />
      </section>

      {reviewOpen && <ReviewList result={result} />}
    </main>
  );
}

function ReviewList({ result }: { result: ResultRecord }) {
  return (
    <section className="panel review-panel">
      <div className="section-heading"><div><p className="eyebrow">Review jawaban</p><h2>Salah itu data belajar, bukan vonis.</h2></div></div>
      <div className="review-list">
        {result.reviewItems.map((item, idx) => {
          const correctOption = item.question.options.find((o) => o.key === item.question.answer);
          const selectedOption = item.question.options.find((o) => o.key === item.selected);
          return (
            <article className={`review-card ${item.isCorrect ? 'correct' : 'wrong'}`} key={item.question.id}>
              <div className="review-head"><span>Soal {idx + 1}</span><strong>{item.isCorrect ? 'Tepat' : item.selected ? 'Belum tepat' : 'Belum dijawab'}</strong></div>
              <p>{item.question.questionText}</p>
              <div className="answer-compare">
                <span>Jawaban anak: <b>{selectedOption ? `${selectedOption.key}. ${selectedOption.text}` : '—'}</b></span>
                <span>Jawaban benar: <b>{correctOption?.key}. {correctOption?.text}</b></span>
              </div>
              <div className="explanation"><span>Pembahasan</span><p>{item.question.explanationText}</p></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RewardRoom({ tickets, onUseTicket, onHome }: { tickets: number; onUseTicket: () => void; onHome: () => void }) {
  const [playing, setPlaying] = useState(false);
  return (
    <main className="app-shell reward-bg">
      <section className="panel reward-layout">
        <div className="reward-copy">
          <p className="eyebrow">Reward room</p>
          <h1>Mini game pendek setelah usaha belajar.</h1>
          <p className="hero-copy">Reward ini sengaja dibatasi agar anak merasa diapresiasi, tapi fokus utamanya tetap latihan soal.</p>
          <div className="ticket-box"><strong>{tickets}</strong><span>reward ticket tersedia</span></div>
          <div className="hero-actions">
            <button className="primary-btn" disabled={tickets <= 0 || playing} onClick={() => { onUseTicket(); setPlaying(true); }}>Main Basketball 45 detik</button>
            <button className="ghost-btn" onClick={onHome}>Kembali Home</button>
          </div>
        </div>
        <BasketballGame playing={playing} onDone={() => setPlaying(false)} />
      </section>
    </main>
  );
}

function BasketballGame({ playing, onDone }: { playing: boolean; onDone: () => void }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [ballState, setBallState] = useState<'idle' | 'shot' | 'hit' | 'miss'>('idle');
  const [meter, setMeter] = useState(50);
  const direction = useRef(1);

  useEffect(() => {
    if (!playing) {
      setScore(0);
      setTimeLeft(45);
      setBallState('idle');
      return;
    }
    const meterTimer = window.setInterval(() => {
      setMeter((m) => {
        let next = m + direction.current * 6;
        if (next >= 100) { next = 100; direction.current = -1; }
        if (next <= 0) { next = 0; direction.current = 1; }
        return next;
      });
    }, 70);
    const timeTimer = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => { window.clearInterval(meterTimer); window.clearInterval(timeTimer); };
  }, [playing]);

  useEffect(() => {
    if (playing && timeLeft <= 0) onDone();
  }, [playing, timeLeft, onDone]);

  const shoot = () => {
    if (!playing || ballState === 'shot') return;
    const distance = Math.abs(meter - 50);
    const hit = distance < 14;
    setBallState('shot');
    window.setTimeout(() => {
      setBallState(hit ? 'hit' : 'miss');
      if (hit) setScore((s) => s + 1);
      window.setTimeout(() => setBallState('idle'), 420);
    }, 480);
  };

  return (
    <div className={`basketball-card ${playing ? 'playing' : ''}`}>
      <div className="game-hud"><span>Score <b>{score}</b></span><span>Time <b>{timeLeft}s</b></span></div>
      <div className="court">
        <div className="backboard"><div className="rim" /></div>
        <button className={`ball ${ballState}`} onClick={shoot} aria-label="Shoot basketball" />
        <div className="court-shadow" />
      </div>
      <div className="power-meter"><span style={{ left: `${meter}%` }} /><i /></div>
      <p className="game-tip">Klik bola saat indikator dekat tengah. Tenang, ini cuma bonus setelah belajar.</p>
    </div>
  );
}

export default App;
