# OSN Practice Lab SD

OSN Practice Lab SD adalah web app latihan OSN-style untuk anak SD dengan pengalaman CBT yang ramah anak.

## Status v1.1

- 1.390 soal original practice:
  - 200 Matematika OSN-style
  - 200 IPA OSN-style
  - 200 IPS OSN-style
  - 160 IPAS SD
  - 150 Bahasa Indonesia SD
  - 120 Bahasa Inggris SD
  - 120 Pendidikan Pancasila SD
  - 120 ANBK Literasi AKM-style
  - 120 ANBK Numerasi AKM-style
- CBT simulation 60 soal
- Daily Mission 10 soal
- Try Again soal salah
- Adventure Map
- Reward Room dengan Jewel Splash, Memory Match, dan Bridge Quest
- Local progress via LocalStorage
- GitHub Pages workflow

> Project ini bukan aplikasi resmi OSN/Puspresnas/ANBK. Bank soal adalah soal latihan original yang meniru pola kompetensi, bukan salinan soal resmi.

# OSN Practice Lab SD

OSN Practice Lab SD adalah web app latihan OSN-style untuk anak SD dengan pengalaman CBT yang ramah anak.

Fokus project:

- latihan harian 10 soal agar anak terbiasa mencoba sedikit demi sedikit;
- simulasi CBT 60 soal pilihan ganda;
- panel nomor soal, status terjawab, dan tanda ragu-ragu;
- scoring otomatis setelah submit;
- review jawaban dengan pembahasan;
- progress lokal di browser;
- reward mini game pendek setelah anak menyelesaikan latihan;
- siap deploy ke GitHub Pages.

> Project ini bukan aplikasi resmi OSN/Puspresnas. Bank soal awal adalah soal original OSN-style untuk latihan, bukan salinan soal resmi.

## Status v0.3

- 360 soal original OSN-style:
  - 60 Matematika
  - 60 IPA
  - 60 IPS
- CBT simulation 60 soal
- Daily Mission 10 soal
- Try Again soal salah
- Adventure Map per topik
- Reward Room: Jewel Splash match-3 mini game
- LocalStorage progress
- PWA manifest + service worker sederhana
- GitHub Actions deploy workflow

## Quick start

```bash
npm install
npm run dev
```

Build production:

```bash
npm run validate:data
npm run build
npm run preview
```

## Deploy ke GitHub Pages

1. Push project ini ke GitHub branch `main`.
2. Buka repository **Settings → Pages**.
3. Pada **Build and deployment**, pilih **Source: GitHub Actions**.
4. Push ulang ke `main` atau jalankan workflow **Deploy GitHub Pages** manual.

Workflow berada di:

```text
.github/workflows/deploy-pages.yml
```

## Struktur penting

```text
src/
├── App.tsx
├── data.ts
├── data/questionBanks.json
├── main.tsx
├── styles.css
└── types.ts

public/
├── manifest.webmanifest
├── service-worker.js
└── icons/osn-practice-icon.svg
```

## Catatan desain produk

App ini memakai dua suasana UX:

1. **Latihan harian**: pendek, lembut, membangun kebiasaan.
2. **Simulasi OSN**: serius, tenang, mirip CBT, tanpa mini game di tengah ujian.

Mini game hanya diposisikan sebagai reward pendek setelah belajar, bukan pusat aplikasi.

## Roadmap berikutnya

- Import soal dari Excel/JSON.
- Dukungan soal bergambar dan pilihan jawaban bergambar.
- Parent settings untuk membatasi reward mini game.
- Dashboard perkembangan lebih detail.
- Spaced repetition queue yang lebih cerdas.
- Bank soal 200+ per mata pelajaran.


## v0.7 Update

Child-friendly UX upgrade:

- More colorful premium playful interface
- Original sticker/emoji-based visual language
- Admin Lab for end-to-end testing
- Reward Room game picker
- Three original mini games: Jewel Splash, Memory Match, Bridge Quest
- Healthier reward loop: games are unlocked after learning, not used as the main app entry point

Admin Lab is accessible from the Home screen.

See `docs/CHILD_UX_AND_GAME_STRATEGY.md` for the child UX and game design policy.


## v0.7 update

- Expanded question bank to 360 original OSN-style questions: 120 Matematika, 120 IPA, 120 IPS.
- Rebuilt Reward Room primary game into animated Jewel Splash match-3 with swap, pop, combo, and falling jewel transitions.
- Added Web Audio based interaction sounds for tap, start, match, fall, miss, reward, and star reveal.
- Added reward celebration overlay after finishing a mission: star reveal, chime sequence, and ticket feedback.
- Improved clickable-card interaction depth: stronger hover lift, press compression, shimmer, and higher readable font weight.

The app still avoids shipping copied official OSN questions in the public repository. The question bank is original OSN-style training content.


## v0.8 Update

- Switched child-facing typography to Google Font Sour Gummy.
- Expanded question bank to 600 original OSN-style questions: 200 Matematika, 200 IPA, 200 IPS.
- Rebuilt Jewel Splash as a DOM-based match-3 game inspired by the supplied HTML/CSS/JS mechanics: 8x8 board, adjacent swaps, match detection, pop animation, gravity drop, spawn animation, score, moves, and timer.
- Added stronger native-feel sounds for tap, start, answer select, swap, match, fall, miss, reward, and star reveal.
- Made clickable cards feel more game-like with deeper hover lift, press compression, shimmer, and stronger shadows.


## v1.1 Bank Expansion

Question bank expanded to 1,390 original practice questions:

- Matematika: 200 OSN-style questions
- IPA: 200 OSN-style questions
- IPS: 200 OSN-style questions
- IPAS: 160 SD curriculum practice questions
- Bahasa Indonesia: 150 SD curriculum practice questions
- Bahasa Inggris: 120 SD curriculum practice questions
- Pendidikan Pancasila: 120 SD curriculum practice questions
- ANBK Literasi: 120 AKM-style literacy questions
- ANBK Numerasi: 120 AKM-style numeracy questions

All new questions are original practice items. They are not copied from official OSN/ANBK papers. Official past-paper imports should be kept local/private unless licensing is clear.


## v1.2 OSN Challenge Calibration

Child testing showed the earlier OSN bank was too easy for a Grade 5 student moving to Grade 6. This release recalibrates OSN practice.

- Total bank: **1690 questions**.
- Added **300 harder OSN Challenge items**: 100 Matematika, 100 IPA, 100 IPS.
- OSN Simulation now prioritizes `osn-challenge` and `hard` questions first.
- Daily Mission remains lighter to preserve the habit-building loop.
- See `docs/OSN_CHALLENGE_CALIBRATION_V1_2.md`.
