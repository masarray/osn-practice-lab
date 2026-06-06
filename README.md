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

- 180 soal original OSN-style:
  - 60 Matematika
  - 60 IPA
  - 60 IPS
- CBT simulation 60 soal
- Daily Mission 10 soal
- Try Again soal salah
- Adventure Map per topik
- Reward Room: Basketball mini game
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
