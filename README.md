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
