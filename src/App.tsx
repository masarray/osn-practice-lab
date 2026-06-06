import { useEffect, useMemo, useRef, useState } from 'react';
import { allQuestions, bankStats, getQuestionsBySubject, getTopics, subjects } from './data';
import type { AnswerKey, ExamConfig, ExamQuestion, ExamSession, Question, ResultRecord, ReviewItem, SessionMode, Subject } from './types';

const STORAGE_KEY = 'osn-practice-lab-results-v0.6';

type Screen = 'home' | 'exam' | 'result' | 'reward' | 'admin';
type GameKey = 'jewel' | 'memory' | 'bridge';

type StoredProgress = {
  results: ResultRecord[];
  wrongQuestionIds: string[];
  rewardTickets: number;
  streakDays: string[];
};

type CelebrationState = {
  title: string;
  score: number;
  earnedTickets: number;
  stars: number;
};

const defaultProgress: StoredProgress = {
  results: [],
  wrongQuestionIds: [],
  rewardTickets: 0,
  streakDays: []
};

const stickerSet = {
  math: ['🧩', '🔢', '⭐', '🚀'],
  ipa: ['🔬', '🌿', '⚡', '🪐'],
  ips: ['🗺️', '🏛️', '🏝️', '🤝'],
  reward: ['🏀', '🎯', '🎮', '🏆']
};


type SoundKind = 'tap' | 'start' | 'select' | 'swap' | 'match' | 'fall' | 'miss' | 'reward' | 'star' | 'success';
let audioContext: AudioContext | null = null;

function getAudioContext() {
  const AudioClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioClass) return null;
  if (!audioContext) audioContext = new AudioClass();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, gainValue: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playSound(kind: SoundKind) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (kind === 'tap') tone(ctx, 520, now, 0.055, 0.018, 'triangle');
  if (kind === 'start') { tone(ctx, 523, now, 0.08, 0.025); tone(ctx, 784, now + 0.06, 0.10, 0.022); }
  if (kind === 'select') tone(ctx, 650, now, 0.065, 0.022, 'triangle');
  if (kind === 'swap') { tone(ctx, 430, now, 0.05, 0.018); tone(ctx, 610, now + 0.04, 0.065, 0.018); }
  if (kind === 'match') { tone(ctx, 660, now, 0.08, 0.028); tone(ctx, 880, now + 0.05, 0.10, 0.026); tone(ctx, 1180, now + 0.10, 0.12, 0.024); }
  if (kind === 'fall') tone(ctx, 310, now, 0.09, 0.018, 'sine');
  if (kind === 'miss') tone(ctx, 240, now, 0.12, 0.02, 'sawtooth');
  if (kind === 'star') { tone(ctx, 880, now, 0.09, 0.026); tone(ctx, 1320, now + 0.07, 0.10, 0.022); }
  if (kind === 'success' || kind === 'reward') {
    [523, 659, 784, 1046].forEach((freq, index) => tone(ctx, freq, now + index * 0.075, 0.13, 0.026));
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

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
  const ordered = config.includeWrongFirst ? [...shuffle(wrongPool), ...shuffle(newPool)] : shuffle(pool);

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

function subjectIcon(subject: Subject | 'Campuran') {
  if (subject === 'Matematika') return '🔢';
  if (subject === 'IPA') return '🔬';
  if (subject === 'IPS') return '🗺️';
  return '🌈';
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
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);

  useEffect(() => saveProgress(progress), [progress]);

  useEffect(() => {
    const handler = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const interactive = target?.closest('button, select, input, [role=button]') as HTMLButtonElement | null;
      if (!interactive || interactive.disabled) return;
      playSound('tap');
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, []);

  const startExam = (config: ExamConfig) => {
    playSound('start');
    setCelebration(null);
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
    const earnedTicket = scored.mode === 'daily' || scored.mode === 'try-again' || scored.mode === 'adventure' ? 1 : 2;
    setProgress((prev) => {
      const mergedWrong = Array.from(new Set([...wrongIds, ...prev.wrongQuestionIds])).slice(0, 300);
      const streakDays = prev.streakDays.includes(day) ? prev.streakDays : [...prev.streakDays, day].slice(-30);
      return {
        results: [scored, ...prev.results].slice(0, 40),
        wrongQuestionIds: mergedWrong,
        rewardTickets: prev.rewardTickets + earnedTicket,
        streakDays
      };
    });
    setCelebration({ title: scored.title, score: scored.score, earnedTickets: earnedTicket, stars: Math.max(1, Math.min(5, Math.ceil(scored.score / 20))) });
    playSound('reward');
    setResult(scored);
    setSession(null);
    setScreen('result');
  };

  const resetProgress = () => {
    if (!window.confirm('Reset semua progress lokal?')) return;
    setProgress(defaultProgress);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (screen === 'exam' && session) {
    return <ExamScreen session={session} onChange={setSession} onSubmit={submitSession} onExit={() => setScreen('home')} />;
  }

  if (screen === 'result' && result) {
    return (
      <>
        <ResultScreen result={result} reviewOpen={reviewOpen} setReviewOpen={setReviewOpen} onHome={() => setScreen('home')} onReward={() => setScreen('reward')} />
        {celebration && <RewardCelebration celebration={celebration} onClose={() => setCelebration(null)} />}
      </>
    );
  }

  if (screen === 'reward') {
    return <RewardRoom tickets={progress.rewardTickets} freePlay={false} onUseTicket={() => setProgress((p) => ({ ...p, rewardTickets: Math.max(0, p.rewardTickets - 1) }))} onHome={() => setScreen('home')} />;
  }

  if (screen === 'admin') {
    return <AdminLab progress={progress} onStart={startExam} onHome={() => setScreen('home')} onReward={() => setScreen('reward')} onAddTickets={() => setProgress((p) => ({ ...p, rewardTickets: p.rewardTickets + 5 }))} onReset={resetProgress} />;
  }

  return <HomeScreen progress={progress} onStart={startExam} onReward={() => setScreen('reward')} onAdmin={() => setScreen('admin')} />;
}


function RewardCelebration({ celebration, onClose }: { celebration: CelebrationState; onClose: () => void }) {
  useEffect(() => {
    const timers = [0, 220, 440, 660, 880].slice(0, celebration.stars).map((delay) => window.setTimeout(() => playSound('star'), delay));
    timers.push(window.setTimeout(() => playSound('success'), 1180));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [celebration.stars]);

  return (
    <div className="reward-celebration-overlay" role="dialog" aria-modal="true" aria-label="Reward selesai latihan">
      <div className="reward-celebration-card">
        <div className="reward-burst"><span>✨</span><span>⭐</span><span>💎</span><span>🌈</span></div>
        <p className="eyebrow">Misi selesai</p>
        <h2>Hebat, kamu sudah mencoba sampai selesai!</h2>
        <p className="muted">Skor {celebration.score} • dapat {celebration.earnedTickets} ticket game</p>
        <div className="star-reveal-row">
          {Array.from({ length: 5 }).map((_, index) => <span key={index} className={index < celebration.stars ? 'earned' : ''} style={{ animationDelay: `${index * 160}ms` }}>★</span>)}
        </div>
        <button className="primary-btn" onClick={onClose}>Lanjut lihat hasil</button>
      </div>
    </div>
  );
}

function HomeScreen({ progress, onStart, onReward, onAdmin }: { progress: StoredProgress; onStart: (config: ExamConfig) => void; onReward: () => void; onAdmin: () => void }) {
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
      <DecorativeStickers />
      <section className="hero-panel quest-hero">
        <div className="hero-copy-grid">
          <div className="hero-copy-block">
            <div className="hero-intro-pill">✨ Halo, teman pintar!</div>
            <h1>Yuk main soal, kumpulkan bintang, lalu buka game seru.</h1>
            <p className="hero-copy">Mulai dari 10 soal ringan dulu ya. Kalau sudah pede, lanjut ke simulasi 60 soal seperti ujian di laptop.</p>
            <div className="hero-mini-benefits">
              <span>🎯 10 menit cukup</span>
              <span>⭐ ada bintang usaha</span>
              <span>🎮 ada reward game</span>
            </div>
            <div className="hero-actions">
              <button className="primary-btn sparkle" onClick={() => onStart({ mode: 'daily', title: 'Misi Hari Ini 10 Soal', subject: 'Campuran', questionCount: 10, durationMinutes: null, softTimer: true, includeWrongFirst: true })}>Mulai Misi Hari Ini</button>
              <button className="secondary-btn" onClick={() => onStart({ mode: 'simulation', title: 'Simulasi OSN 60 Soal', subject: 'Campuran', questionCount: 60, durationMinutes: 60, softTimer: false })}>Coba Simulasi 60 Soal</button>
              <button className="ghost-btn" onClick={onAdmin}>Admin Lab</button>
            </div>
          </div>

          <div className="quest-preview-card" aria-hidden="true">
            <div className="quest-preview-top">
              <div>
                <span className="quest-kicker">Peta Main Hari Ini</span>
                <strong>Smart Quest</strong>
              </div>
              <span className="quest-avatar">🚀</span>
            </div>
            <div className="quest-progress-line">
              <div className="quest-progress-fill" />
              <span className="quest-node done">✓</span>
              <span className="quest-node active">2</span>
              <span className="quest-node">3</span>
            </div>
            <div className="quest-step-grid">
              <div className="quest-step done">
                <span>🌞</span>
                <strong>Misi ringan</strong>
                <small>10 soal seru</small>
              </div>
              <div className="quest-step active">
                <span>⭐</span>
                <strong>Kumpulkan bintang</strong>
                <small>naik level pelan-pelan</small>
              </div>
              <div className="quest-step">
                <span>🎮</span>
                <strong>Reward game</strong>
                <small>buka Jewel Splash</small>
              </div>
            </div>
            <div className="quest-footer-note">Ajak anak mulai dari langkah kecil, bukan langsung ujian panjang.</div>
          </div>
        </div>

        <div className="hero-chip-row">
          <StatCard icon="📚" label="Bank soal" value={`${bankStats.total}`} helper="soal siap dimainkan" />
          <StatCard icon="🔥" label="Hari aktif" value={`${progress.streakDays.length}`} helper="streak latihan" />
          <StatCard icon="🎯" label="Rata-rata" value={progress.results.length ? `${average}` : '—'} helper="5 sesi terakhir" />
          <StatCard icon="🎟️" label="Ticket" value={`${progress.rewardTickets}`} helper="buat game bonus" />
        </div>
      </section>

      <section className="content-grid playful-main-grid">
        <div className="panel main-panel playful-panel">
          <div className="section-heading playful-heading">
            <div>
              <p className="eyebrow">Ayo pilih cara bermain</p>
              <h2>Mau mulai dari mana hari ini?</h2>
            </div>
          </div>
          <div className="mode-grid">
            <ModeCard icon="🌞" title="Misi Harian" badge="10 soal" text="Latihan pendek biar anak nyaman mulai belajar." accent="accent-sun" onClick={() => onStart({ mode: 'daily', title: 'Misi Hari Ini 10 Soal', subject: 'Campuran', questionCount: 10, durationMinutes: null, softTimer: true, includeWrongFirst: true })} />
            <ModeCard icon="🧩" title="Ulang Soal Salah" badge="5–15 soal" text="Ayo coba lagi soal yang kemarin belum pas." accent="accent-mint" onClick={() => onStart({ mode: 'try-again', title: 'Ulang Soal Salah', subject: 'Campuran', questionCount: 15, durationMinutes: null, softTimer: true, includeWrongFirst: true })} />
            <ModeCard icon="💻" title="Simulasi OSN" badge="60 soal" text="Latihan seperti ujian laptop, lengkap dengan timer." accent="accent-sky" onClick={() => onStart({ mode: 'simulation', title: 'Simulasi OSN 60 Soal', subject: 'Campuran', questionCount: 60, durationMinutes: 60, softTimer: false })} />
            <ModeCard icon="💎" title="Reward Room" badge="game" text="Buka Jewel Splash, Memory Match, dan Bridge Quest." accent="accent-lavender" onClick={onReward} />
          </div>
        </div>

        <aside className="panel side-panel parent-card">
          <p className="eyebrow">Untuk Ayah &amp; Bunda</p>
          <h2>Progress si kecil</h2>
          {last ? (
            <div className="parent-summary playful-parent-summary">
              <div className="score-ring"><span>{last.score}</span><small>skor</small></div>
              <div>
                <p className="summary-title">Sesi terakhir: {last.title}</p>
                <p className="muted">Benar {last.correct}/{last.total} • waktu {formatTime(last.durationSeconds)}</p>
              </div>
            </div>
          ) : <p className="muted">Belum ada sesi. Mulai dari 10 soal dulu supaya anak merasa diajak main, bukan diuji.</p>}
          <div className="parent-note-box">
            <strong>Saran langkah berikutnya</strong>
            <p>{progress.results.length ? 'Coba 1 misi harian lagi, lalu buka simulasi kalau anak masih semangat.' : 'Mulai dari Misi Harian. Setelah itu, baru buka reward game pendek sebagai bonus.'}</p>
          </div>
          <div className="weak-box">
            <span className="soft-label">Topik yang perlu diulang</span>
            {weak.length ? weak.map((topic) => <span className="topic-chip" key={topic}>{topic}</span>) : <span className="muted">Nanti topik yang perlu diulang akan muncul di sini.</span>}
          </div>
        </aside>
      </section>

      <section className="panel mapel-panel">
        <div className="section-heading playful-heading">
          <div>
            <p className="eyebrow">Pilih mapel favorit</p>
            <h2>Main soal per mata pelajaran</h2>
          </div>
          <span className="soft-pill">60 soal pilihan ganda</span>
        </div>
        <div className="subject-grid playful-subject-grid">
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

function DecorativeStickers() {
  return (
    <div className="decor-layer" aria-hidden="true">
      <span className="decor-star s1">⭐</span>
      <span className="decor-star s2">🪐</span>
      <span className="decor-star s3">🎈</span>
      <span className="decor-star s4">💡</span>
    </div>
  );
}

function StatCard({ icon, label, value, helper }: { icon: string; label: string; value: string; helper: string }) {
  return <div className="stat-chip-card"><span className="stat-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><span>{helper}</span></div></div>;
}

function ModeCard({ icon, title, badge, text, accent, onClick }: { icon: string; title: string; badge: string; text: string; accent: string; onClick: () => void }) {
  return (
    <button className={`mode-card ${accent}`} onClick={onClick}>
      <div className="mode-card-top"><span className="mode-icon">{icon}</span><span className="mode-badge">{badge}</span></div>
      <strong>{title}</strong>
      <p>{text}</p>
      <span className="mode-cta">Main sekarang →</span>
    </button>
  );
}

function SubjectCard({ subject, total, topics, onStart }: { subject: Subject; total: number; topics: number; onStart: () => void }) {
  const labels: Record<Subject, string> = {
    Matematika: 'Penuh angka, pola, dan puzzle seru.',
    IPA: 'Eksperimen, makhluk hidup, dan energi.',
    IPS: 'Peta, budaya, sejarah, dan cerita Indonesia.'
  };
  return (
    <button className={`subject-card ${subjectAccent(subject)}`} onClick={onStart}>
      <div className="subject-card-head">
        <div className="subject-icon">{subjectIcon(subject)}</div>
        <span className="subject-start-pill">Mulai</span>
      </div>
      <h3>{subject}</h3>
      <p>{labels[subject]}</p>
      <div className="subject-meta"><span>{total} soal</span><span>{topics} topik</span></div>
    </button>
  );
}

function AdventurePanel({ onStart }: { onStart: (config: ExamConfig) => void }) {
  const adventures = [
    { icon: '🏝️', title: 'Pulau Bilangan', subject: 'Matematika' as Subject, topic: 'Bilangan', text: 'Buka level bilangan, pecahan, dan pola.' },
    { icon: '🧪', title: 'Lab Sains', subject: 'IPA' as Subject, topic: 'Makhluk Hidup', text: 'Masuk ke dunia tumbuhan, energi, dan bumi.' },
    { icon: '🗺️', title: 'Jelajah Nusantara', subject: 'IPS' as Subject, topic: 'Geografi Indonesia', text: 'Temukan peta, budaya, sejarah, dan ekonomi.' }
  ];
  return (
    <section className="panel adventure-panel">
      <div className="section-heading playful-heading">
        <div>
          <p className="eyebrow">Adventure map</p>
          <h2>Buka level sambil belajar</h2>
        </div>
      </div>
      <div className="adventure-grid">
        {adventures.map((item) => {
          const available = getTopics(item.subject).includes(item.topic);
          return (
            <button className={`adventure-card ${subjectAccent(item.subject)}`} key={item.title} onClick={() => available && onStart({ mode: 'adventure', title: item.title, subject: item.subject, topic: item.topic, questionCount: 10, durationMinutes: null, softTimer: true })}>
              <span className="adventure-orb">{item.icon}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <small>{available ? '10 soal pilihan untuk level ini' : 'Belum tersedia'}</small>
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
        <div className="exam-brand"><span className="app-mark small">{subjectIcon(session.config.subject)}</span><div><strong>{session.config.title}</strong><small>{session.config.subject}</small></div></div>
        <div className="timer-card">
          <span>{session.config.softTimer ? 'Waktu latihan' : 'Sisa waktu'}</span>
          <strong>{remaining === null ? formatTime(durationSeconds) : formatTime(remaining)}</strong>
        </div>
        <div className="progress-meter"><div style={{ width: `${(answeredCount / Math.max(1, total)) * 100}%` }} /></div>
        <div className="exam-metrics"><span>Terjawab <b>{answeredCount}/{total}</b></span><span>Ragu <b>{flaggedCount}</b></span></div>
        <div className="palette-legend"><span><i className="dot answered" /> Terjawab</span><span><i className="dot flagged" /> Ragu</span></div>
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
      <section className="result-hero panel dopamine-card">
        <div className="score-ring big"><span>{result.score}</span><small>skor</small></div>
        <div>
          <p className="eyebrow">Hasil latihan</p>
          <h1>{result.score >= 80 ? 'Mantap, pola berpikirnya makin kuat.' : result.score >= 60 ? 'Bagus, sudah ada fondasi yang bisa dibangun.' : 'Tidak apa-apa. Ini data untuk latihan berikutnya.'}</h1>
          <p className="hero-copy">Benar {result.correct}, salah {result.wrong}, kosong {result.blank}. Waktu pengerjaan {formatTime(result.durationSeconds)}.</p>
          <div className="celebration-strip"><span>⭐ Usaha tercatat</span><span>🎟️ Reward terbuka</span><span>🧠 Topik dipetakan</span></div>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => setReviewOpen(!reviewOpen)}>{reviewOpen ? 'Tutup Review' : 'Review Jawaban'}</button>
            <button className="secondary-btn" onClick={onReward}>Reward Room</button>
            <button className="ghost-btn" onClick={onHome}>Kembali Home</button>
          </div>
        </div>
      </section>

      <section className="stats-grid compact">
        <StatCard icon="✅" label="Benar" value={`${result.correct}`} helper="jawaban tepat" />
        <StatCard icon="🧩" label="Belum tepat" value={`${result.wrong}`} helper="bahan latihan ulang" />
        <StatCard icon="⏳" label="Kosong" value={`${result.blank}`} helper="perlu cek waktu" />
        <StatCard icon="📌" label="Topik lemah" value={`${result.weakTopics.length}`} helper={result.weakTopics.join(', ') || 'belum ada'} />
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
              <div className="review-head"><span>Soal {idx + 1} • {item.question.topic}</span><strong>{item.isCorrect ? 'Tepat' : item.selected ? 'Belum tepat' : 'Belum dijawab'}</strong></div>
              <p>{item.question.questionText}</p>
              <div className="answer-compare">
                <span>Jawaban anak: <b>{selectedOption ? `${selectedOption.key}. ${selectedOption.text}` : '—'}</b></span>
                <span>Jawaban benar: <b>{correctOption?.key}. {correctOption?.text}</b></span>
              </div>
              <div className="explanation"><span>Pembahasan ramah</span><p>{item.question.explanationText}</p></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RewardRoom({ tickets, freePlay, onUseTicket, onHome }: { tickets: number; freePlay: boolean; onUseTicket: () => void; onHome: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [activeGame, setActiveGame] = useState<GameKey>('jewel');
  const games: { key: GameKey; label: string; icon: string; desc: string }[] = [
    { key: 'jewel', label: 'Jewel Splash', icon: '💎', desc: 'Tukar permata yang bersebelahan dan buat combo.' },
    { key: 'memory', label: 'Memory Match', icon: '🧠', desc: 'Cocokkan kartu emoji sains dan angka.' },
    { key: 'bridge', label: 'Bridge Quest', icon: '🌉', desc: 'Tahan tombol untuk membangun jembatan.' }
  ];
  const canPlay = freePlay || tickets > 0;
  const startGame = () => {
    if (!canPlay || playing) return;
    if (!freePlay) onUseTicket();
    setPlaying(true);
  };
  return (
    <main className="app-shell reward-bg">
      <section className="panel reward-layout">
        <div className="reward-copy">
          <p className="eyebrow">Reward room</p>
          <h1>Pilih game bonusmu!</h1>
          <p className="hero-copy">Game di sini pendek dan ringan. Tujuannya supaya anak merasa senang setelah belajar, bukan lupa belajar.</p>
          <div className="ticket-box"><strong>{freePlay ? '∞' : tickets}</strong><span>{freePlay ? 'admin free play' : 'ticket game tersedia'}</span></div>
          <div className="game-picker">
            {games.map((game) => (
              <button key={game.key} className={activeGame === game.key ? 'active' : ''} onClick={() => { setPlaying(false); setActiveGame(game.key); }}>
                <span>{game.icon}</span><strong>{game.label}</strong><small>{game.desc}</small>
              </button>
            ))}
          </div>
          <div className="hero-actions">
            <button className="primary-btn" disabled={!canPlay || playing} onClick={startGame}>Main 45 detik</button>
            <button className="ghost-btn" onClick={onHome}>Kembali Home</button>
          </div>
        </div>
        {activeGame === 'jewel' && <JewelGame playing={playing} onDone={() => setPlaying(false)} />}
        {activeGame === 'memory' && <MemoryGame playing={playing} onDone={() => setPlaying(false)} />}
        {activeGame === 'bridge' && <BridgeGame playing={playing} onDone={() => setPlaying(false)} />}
      </section>
    </main>
  );
}


function JewelGame({ playing, onDone }: { playing: boolean; onDone: () => void }) {
  const SIZE = 8;
  const TYPES = 5;
  const START_MOVES = 30;
  type Cell = { type: number; id: string };
  type Pos = { r: number; c: number };

  const makeCell = (type?: number): Cell => ({ type: type ?? Math.floor(Math.random() * TYPES), id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });

  const findMatches = (board: Cell[][]) => {
    const keys = new Set<string>();
    for (let r = 0; r < SIZE; r += 1) {
      let run = 1;
      for (let c = 1; c <= SIZE; c += 1) {
        const prev = board[r][c - 1]?.type;
        const curr = c < SIZE ? board[r][c]?.type : -1;
        if (curr === prev) run += 1;
        else {
          if (run >= 3) {
            for (let i = c - run; i < c; i += 1) keys.add(`${r}-${i}`);
          }
          run = 1;
        }
      }
    }
    for (let c = 0; c < SIZE; c += 1) {
      let run = 1;
      for (let r = 1; r <= SIZE; r += 1) {
        const prev = board[r - 1][c]?.type;
        const curr = r < SIZE ? board[r][c]?.type : -1;
        if (curr === prev) run += 1;
        else {
          if (run >= 3) {
            for (let i = r - run; i < r; i += 1) keys.add(`${i}-${c}`);
          }
          run = 1;
        }
      }
    }
    return keys;
  };

  const cloneBoard = (board: Cell[][]) => board.map((row) => row.map((cell) => ({ ...cell })));

  const swapAt = (board: Cell[][], a: Pos, b: Pos) => {
    const next = cloneBoard(board);
    [next[a.r][a.c], next[b.r][b.c]] = [next[b.r][b.c], next[a.r][a.c]];
    return next;
  };

  const collapseBoard = (board: Cell[][], matches: Set<string>) => {
    const next = cloneBoard(board);
    for (const key of matches) {
      const [r, c] = key.split('-').map(Number);
      (next[r] as (Cell | null)[])[c] = null;
    }
    for (let c = 0; c < SIZE; c += 1) {
      const survivors: Cell[] = [];
      for (let r = SIZE - 1; r >= 0; r -= 1) {
        const cell = next[r][c] as Cell | null;
        if (cell) survivors.push(cell);
      }
      for (let r = SIZE - 1; r >= 0; r -= 1) {
        next[r][c] = survivors[SIZE - 1 - r] ?? makeCell();
      }
    }
    return next as Cell[][];
  };

  const createBoard = () => {
    let board: Cell[][] = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => makeCell()));
    while (findMatches(board).size > 0) {
      board = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => makeCell()));
    }
    return board;
  };

  const [board, setBoard] = useState<Cell[][]>(() => createBoard());
  const [selected, setSelected] = useState<Pos | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(START_MOVES);
  const [timeLeft, setTimeLeft] = useState(45);
  const [message, setMessage] = useState('Pilih dua permata yang berdampingan.');
  const [matchFlash, setMatchFlash] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!playing) {
      setBoard(createBoard());
      setSelected(null);
      setScore(0);
      setMoves(START_MOVES);
      setTimeLeft(45);
      setMessage('Pilih dua permata yang berdampingan.');
      setMatchFlash(new Set());
      return;
    }
    const timer = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (playing && (timeLeft <= 0 || moves <= 0)) onDone();
  }, [playing, timeLeft, moves, onDone]);

  const isAdjacent = (a: Pos, b: Pos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

  const resolveBoard = (initialBoard: Cell[][]) => {
    let current = initialBoard;
    let combo = 0;
    let totalScore = 0;
    let latestMatches = new Set<string>();
    while (true) {
      const matches = findMatches(current);
      if (!matches.size) break;
      latestMatches = matches;
      combo += 1;
      totalScore += matches.size * 10 * combo;
      current = collapseBoard(current, matches);
    }
    return { board: current, totalScore, combo, latestMatches };
  };

  const handleCellClick = (r: number, c: number) => {
    if (!playing) return;
    const pos = { r, c };
    if (!selected) {
      setSelected(pos);
      return;
    }
    if (selected.r === pos.r && selected.c === pos.c) {
      setSelected(null);
      return;
    }
    if (!isAdjacent(selected, pos)) {
      setSelected(pos);
      return;
    }
    const swapped = swapAt(board, selected, pos);
    const matches = findMatches(swapped);
    if (!matches.size) {
      setSelected(null);
      setMessage('Belum cocok. Coba pasangan lain ya!');
      return;
    }
    const resolved = resolveBoard(swapped);
    setBoard(resolved.board);
    setSelected(null);
    setMoves((m) => Math.max(0, m - 1));
    setScore((s) => s + resolved.totalScore);
    setMatchFlash(resolved.latestMatches);
    setMessage(resolved.combo > 1 ? `Combo x${resolved.combo}! Keren!` : 'Yes! Permatanya meledak!');
    window.setTimeout(() => setMatchFlash(new Set()), 350);
  };

  return (
    <div className="game-card jewel-card">
      <div className="game-hud"><span>Score <b>{score}</b></span><span>Moves <b>{moves}</b></span><span>Time <b>{timeLeft}s</b></span></div>
      <div className="jewel-board-wrap">
        <div className="jewel-board">
          {board.map((row, r) => row.map((cell, c) => {
            const key = `${r}-${c}`;
            const isSelected = selected?.r === r && selected?.c === c;
            const isMatched = matchFlash.has(key);
            return (
              <button key={cell.id + key} className={`jewel-tile ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''}`} onClick={() => handleCellClick(r, c)} aria-label={`Jewel row ${r + 1} col ${c + 1}`}>
                <span className={`jewel gem-${cell.type}`} />
              </button>
            );
          }))}
        </div>
      </div>
      <p className="game-tip">{message}</p>
    </div>
  );
}


function MemoryGame({ playing, onDone }: { playing: boolean; onDone: () => void }) {
  const emojiBase = ['🔢', '🔬', '🌿', '🪐', '🗺️', '⚡'];
  const [cards, setCards] = useState<string[]>(() => shuffle([...emojiBase, ...emojiBase]));
  const [revealed, setRevealed] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const locked = useRef(false);

  useEffect(() => {
    if (!playing) { setCards(shuffle([...emojiBase, ...emojiBase])); setRevealed([]); setMatched([]); setMoves(0); setTimeLeft(45); return; }
    const timer = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => { if (playing && (timeLeft <= 0 || matched.length === cards.length)) onDone(); }, [playing, timeLeft, matched.length, cards.length, onDone]);

  const flip = (idx: number) => {
    if (!playing || locked.current || revealed.includes(idx) || matched.includes(idx)) return;
    const next = [...revealed, idx];
    setRevealed(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a] === cards[b]) {
        setMatched((m) => [...m, a, b]);
        setRevealed([]);
      } else {
        locked.current = true;
        window.setTimeout(() => { setRevealed([]); locked.current = false; }, 650);
      }
    }
  };

  return (
    <div className="game-card memory-card">
      <div className="game-hud"><span>Match <b>{matched.length / 2}/6</b></span><span>Moves <b>{moves}</b></span><span>Time <b>{timeLeft}s</b></span></div>
      <div className="memory-board">
        {cards.map((emoji, idx) => {
          const open = revealed.includes(idx) || matched.includes(idx);
          return <button key={`${emoji}-${idx}`} className={`memory-tile ${open ? 'open' : ''} ${matched.includes(idx) ? 'matched' : ''}`} onClick={() => flip(idx)}>{open ? emoji : '❔'}</button>;
        })}
      </div>
      <p className="game-tip">Cocokkan pasangan ikon. Game ini melatih memori kerja tanpa tekanan skor besar.</p>
    </div>
  );
}

function BridgeGame({ playing, onDone }: { playing: boolean; onDone: () => void }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [length, setLength] = useState(60);
  const [gap, setGap] = useState(90);
  const [charging, setCharging] = useState(false);
  const [status, setStatus] = useState('Tahan tombol untuk memanjang jembatan.');
  const chargeRef = useRef<number | null>(null);

  const nextGap = () => setGap(70 + Math.round(Math.random() * 90));

  useEffect(() => {
    if (!playing) { setScore(0); setTimeLeft(45); setLength(60); setCharging(false); setStatus('Tahan tombol untuk memanjang jembatan.'); nextGap(); return; }
    const timer = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => { if (playing && timeLeft <= 0) onDone(); }, [playing, timeLeft, onDone]);

  const startCharge = () => {
    if (!playing || charging) return;
    setLength(20);
    setCharging(true);
    setStatus('Lepaskan saat panjangnya kira-kira pas.');
    chargeRef.current = window.setInterval(() => setLength((l) => Math.min(220, l + 7)), 55);
  };
  const release = () => {
    if (!playing || !charging) return;
    if (chargeRef.current) window.clearInterval(chargeRef.current);
    setCharging(false);
    const ok = length >= gap - 12 && length <= gap + 26;
    setStatus(ok ? 'Pas! Jembatan aman.' : 'Belum pas. Coba kalibrasi lagi.');
    if (ok) setScore((s) => s + 1);
    window.setTimeout(() => { setLength(60); nextGap(); setStatus('Tahan tombol untuk memanjang jembatan.'); }, 700);
  };

  return (
    <div className="game-card bridge-card">
      <div className="game-hud"><span>Bridge <b>{score}</b></span><span>Target <b>{gap}px</b></span><span>Time <b>{timeLeft}s</b></span></div>
      <div className="bridge-world">
        <div className="tower left-tower">🧒</div>
        <div className="tower right-tower" style={{ left: `${130 + gap}px` }}>🏁</div>
        <div className="stick" style={{ width: `${length}px` }} />
        <div className="cloud cloud-a">☁️</div><div className="cloud cloud-b">☁️</div>
      </div>
      <button className="hold-btn" onMouseDown={startCharge} onMouseUp={release} onMouseLeave={release} onTouchStart={startCharge} onTouchEnd={release}>Tahan & Lepas</button>
      <p className="game-tip">{status}</p>
    </div>
  );
}

function AdminLab({ progress, onStart, onHome, onReward, onAddTickets, onReset }: { progress: StoredProgress; onStart: (config: ExamConfig) => void; onHome: () => void; onReward: () => void; onAddTickets: () => void; onReset: () => void }) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'Campuran'>('Campuran');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(10);
  const topicOptions = selectedSubject === 'Campuran' ? getTopics() : getTopics(selectedSubject);
  const filtered = (selectedSubject === 'Campuran' ? allQuestions : getQuestionsBySubject(selectedSubject)).filter((q) => !selectedTopic || q.topic === selectedTopic);
  const modes: { mode: SessionMode; title: string; count: number; duration: number | null; soft: boolean; wrong?: boolean }[] = [
    { mode: 'daily', title: 'Admin Test - Daily Mission', count: 10, duration: null, soft: true, wrong: true },
    { mode: 'try-again', title: 'Admin Test - Try Again', count: 15, duration: null, soft: true, wrong: true },
    { mode: 'adventure', title: 'Admin Test - Adventure Topic', count: 10, duration: null, soft: true },
    { mode: 'simulation', title: 'Admin Test - Full CBT 60', count: 60, duration: 60, soft: false }
  ];

  const makeConfig = (mode: SessionMode, title: string, count = questionCount, duration: number | null = null, softTimer = true, wrong = false): ExamConfig => ({
    mode,
    title,
    subject: selectedSubject,
    topic: selectedTopic || undefined,
    questionCount: count,
    durationMinutes: duration,
    softTimer,
    includeWrongFirst: wrong
  });

  return (
    <main className="app-shell admin-bg">
      <section className="panel admin-hero">
        <div>
          <p className="eyebrow">Admin Lab</p>
          <h1>Ruang kontrol untuk mencoba semua mode app.</h1>
          <p className="hero-copy">Gunakan halaman ini untuk QA UX, cek mode CBT, cek reward game, tambah ticket, dan uji berbagai kombinasi mapel/topik.</p>
        </div>
        <div className="hero-actions"><button className="primary-btn" onClick={onHome}>Kembali Home</button><button className="secondary-btn" onClick={onReward}>Reward Room</button></div>
      </section>

      <section className="stats-grid compact">
        <StatCard icon="📦" label="Total bank" value={`${bankStats.total}`} helper="soal tersedia" />
        <StatCard icon="🎟️" label="Ticket" value={`${progress.rewardTickets}`} helper="reward lokal" />
        <StatCard icon="🧪" label="Wrong queue" value={`${progress.wrongQuestionIds.length}`} helper="soal salah tersimpan" />
        <StatCard icon="📈" label="Result history" value={`${progress.results.length}`} helper="sesi lokal" />
      </section>

      <section className="content-grid admin-grid">
        <div className="panel">
          <div className="section-heading"><div><p className="eyebrow">Scenario builder</p><h2>Custom test session</h2></div></div>
          <div className="form-grid">
            <label>Mapel<select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value as Subject | 'Campuran'); setSelectedTopic(''); }}><option>Campuran</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label>Topik<select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}><option value="">Semua topik</option>{topicOptions.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label>Jumlah soal<input type="number" min="1" max="60" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} /></label>
          </div>
          <div className="admin-actions">
            <button className="primary-btn" onClick={() => onStart(makeConfig('daily', 'Admin Custom Daily'))}>Start custom soft</button>
            <button className="secondary-btn" onClick={() => onStart(makeConfig('simulation', 'Admin Custom CBT', questionCount, 60, false))}>Start custom CBT</button>
          </div>
          <p className="muted">Filtered pool: {filtered.length} soal. App otomatis mengambil sebanyak yang tersedia bila jumlah soal lebih besar dari pool.</p>
        </div>

        <div className="panel">
          <div className="section-heading"><div><p className="eyebrow">One-click QA</p><h2>Coba semua mode utama</h2></div></div>
          <div className="admin-mode-list">
            {modes.map((m) => <button key={m.title} className="admin-mode-btn" onClick={() => onStart(makeConfig(m.mode, m.title, m.count, m.duration, m.soft, m.wrong))}><span>{m.mode === 'simulation' ? '🧭' : m.mode === 'try-again' ? '🛠️' : m.mode === 'adventure' ? '🏝️' : '🌞'}</span><strong>{m.title}</strong><small>{m.count} soal • {m.duration ? `${m.duration} menit` : 'soft timer'}</small></button>)}
          </div>
        </div>
      </section>

      <section className="content-grid admin-grid">
        <div className="panel">
          <div className="section-heading"><div><p className="eyebrow">Game QA</p><h2>Free play semua mini game</h2></div></div>
          <RewardRoom tickets={999} freePlay onUseTicket={() => undefined} onHome={onHome} />
        </div>
        <div className="panel">
          <div className="section-heading"><div><p className="eyebrow">Maintenance</p><h2>Local data tools</h2></div></div>
          <div className="admin-actions vertical"><button className="secondary-btn" onClick={onAddTickets}>Tambah 5 reward ticket</button><button className="danger-btn" onClick={onReset}>Reset progress lokal</button></div>
          <div className="data-preview"><strong>Sample question IDs</strong>{filtered.slice(0, 12).map((q) => <span key={q.id}>{q.id} • {q.topic}</span>)}</div>
        </div>
      </section>
    </main>
  );
}

export default App;
