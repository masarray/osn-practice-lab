# Child UX and Mini Game Strategy

## Product direction

OSN Practice Lab uses a child-friendly learning loop:

1. Daily Mission
2. Friendly answer feedback
3. Review wrong answers
4. Earn a limited reward ticket
5. Play a short mini game
6. Return to learning

The app intentionally avoids manipulative child engagement patterns. Mini games are rewards, not the main product.

## Visual language

- Bright but controlled gradients
- Large tap targets
- Friendly icons and emoji stickers
- Soft shadows and rounded cards
- No loud failure screen
- No ranking/leaderboard pressure
- No ads, loot boxes, or gacha

## Clipart and icon policy

The app currently uses original CSS shapes, Unicode emoji, and inline UI treatment. It does not copy external clipart or third-party SVG sets into the repository.

This keeps the public repo legally clean. If external icon packs are added later, verify license and add attribution.

Suggested future sources:

- Font Awesome Free for icons where license fits the repo
- OpenMoji with proper CC BY-SA 4.0 attribution, if share-alike obligations are acceptable
- Self-made SVG sticker packs for best control

## Mini games in v0.4

Implemented original mini games inspired by common web mini-game mechanics:

- Jewel Splash: match-3 reward loop yang lebih satisfying untuk anak
- Memory Match: cognitive memory matching with subject-themed emoji
- Bridge Quest: hold-and-release estimation challenge

The user-provided CodePen links were used as UX/mechanic references only. Their code was not copied into this project.

## Admin Lab

Admin Lab lets the owner QA the full app:

- Start Daily Mission
- Start Try Again mode
- Start Adventure mode
- Start full 60-question CBT simulation
- Build custom scenario by subject/topic/question count
- Add reward tickets
- Reset local progress
- Free-play mini game QA
- Inspect filtered question IDs


## v0.7 motion and sound layer

The mini game and learning completion moments now use short game-like feedback loops:

- tap sound for visible interactive controls
- start chime for starting a session
- Jewel Splash swap, miss, match, and falling sounds
- reward celebration overlay after completing a session
- sequential star reveal with chime timing

The goal is satisfying feedback, not dark-pattern addiction. Reward moments stay short and are tied to completed learning effort.
