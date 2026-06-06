# OSN Practice Lab v0.5 — Sunny Quest Design System

## Design direction

The v0.5 interface uses a structured child-friendly palette rather than random bright colors.

Primary UI goals:

- make the app feel warm, safe, and fun;
- keep CBT mode readable and calm;
- make daily missions and reward games more satisfying;
- avoid dark-pattern addiction mechanics.

## Palette

Core palette:

- Focus Blue `#2F80ED` — main action, CBT trust/focus, active question state
- Sunny Yellow `#FFD34D` — reward, achievement, highlight
- Play Orange `#FF8A3D` — warm CTA energy
- Growth Green `#26C281` — correct/progress/success
- Berry Pink `#FF5CA8` — playful accent only
- Quest Purple `#8B5CF6` — adventure/reward accent
- Cream Background `#FFF8E7` — soft warmth
- Cool Sky `#E8FBFF` — calm support surface

Rule:

- surfaces stay soft and light;
- high-energy colors are used as accents, buttons, progress, badges, and mini-game moments;
- long reading surfaces avoid saturated backgrounds.

## Typography

- Headings and interactive labels: Fredoka
- Body text and questions: Nunito

Why:

- Fredoka gives round, friendly, child-oriented identity;
- Nunito keeps long question text readable and calmer;
- font weights are reduced from bulky bold to 500–650 for better readability.

## Spacing and layout

Token-based spacing:

- 6, 10, 14, 18, 24, 32, 42 px

Main fixes:

- more consistent gaps between cards;
- reduced oversized hero typography;
- more balanced card heights;
- larger clickable answer cards;
- clearer hierarchy between home, CBT, reward, and admin modes.

## Motion

Interaction effects:

- hover lift;
- press compression;
- soft shine on primary CTA;
- floating stickers;
- smoother selected answer states;
- reduced-motion media query for accessibility.

## Child-safety rule

Reward design is intentionally healthy:

learn -> review -> reward ticket -> short game.

No ads, no lootboxes, no infinite grinding, no public leaderboard.
