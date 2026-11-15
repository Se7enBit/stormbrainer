# Status

_Last updated: 2026-11-15 — milestones 1 (skeleton) and 2 (offline loop) done._

## What works

- **Scaffold:** Expo SDK 58, React Native 0.88, Expo Router (`app/`: `/`, `/saved`, `/settings`), TypeScript strict (plus `noUncheckedIndexedAccess`), Zustand, ESLint (expo flat config) + Prettier, Jest (`jest-expo`) + React Native Testing Library v14.
- **Home screen:** one huge **Spark** button with the chips strip under it.
  - Type chips (multi-select, default all). When all are selected, one tap narrows to that type; deselecting the last one goes back to all.
  - Vibe chips (Light / Deep / Spicy, default Light).
  - Work-safe toggle.
- **Core feature, end to end (F1 + F3, offline):** Spark → a full-screen card from the bundled offline deck. Layout depends on type:
  - Debate: A vs B sides.
  - Hot take: "Agree or disagree?" hint.
  - Memory lane: "Who has a story?" hint.
  - What if: two options when it is a would-you-rather.
  - Card actions: **Next**, **Reroll**, **Close**.
  - Each card has an "offline deck" badge.
  - Android back closes the card.
- **No repeats:** sparks are drawn without replacement and deduped by id and by normalized text (FNV-1a hash). The pool reshuffles only once every matching spark has been shown, and never repeats the card that was just on screen.
- **Filtering:** chips filter the deck. Work-safe ON never yields a `workSafe: false` spark. If a vibe has nothing for the chosen types, only the vibe is relaxed (never the types or work-safe); in practice that cannot happen yet, because every type × vibe has a work-safe spark.
- **Deck:** `src/sparks/deck.json`, 152 hand-written sparks: 38 per type, 64 Light (all work-safe), 48 Deep, 40 Spicy, every type × vibe has work-safe sparks. Default settings give a 64-spark pool, so the SPEC's "50 taps produce no repeats" holds (tested, with work-safe on and off). Each entry is validated in tests: shape, ≤ 160 chars, no emojis, no numbering, options where required, unique ids and texts.
- **Card text size:** grows smaller as the text gets longer, never below 28. The text wraps and scrolls; it is never truncated.
- **Settings** shows `Version 0.1.0 · <commit>`, so you can see which build the preview is running. **Saved** and the rest of **Settings** are placeholders.
- **Tests:** 192 passing (each deck entry is its own validation test). They cover:
  - deck validation, filtering, draw/dedupe and history;
  - chip toggling and font sizing;
  - SparkCard layouts per type and its actions;
  - an end-to-end router test: Spark → Next → Reroll → Close, no repeats across the pool, chips applied, link to Settings.
- **CI** (`.github/workflows/ci.yml`): every push runs `npm ci` → typecheck → lint → test → web export. On `main` it also deploys `dist/` to GitHub Pages, the same way as weDate (`upload-pages-artifact` + `deploy-pages`).
- **Web build:** `npm run build:web` exports with `experiments.baseUrl: /stormbrainer` and copies `index.html` to `404.html`, so deep links and refreshes work on Pages. I checked this locally with a server that mimics Pages, driving it with Playwright at phone size: home, card, debate layout, chips and a deep link to `/stormbrainer/settings`.

## How to check it on your phone

1. Merge this branch into `main` (open a PR from the branch on GitHub and merge it).
2. One-time setup, if not done yet: repo **Settings → Pages → Build and deployment → Source: GitHub Actions** (the same setting weDate uses).
3. Wait for the **CI** run on `main` to go green, then open https://se7enbit.github.io/stormbrainer/.
4. Tap Spark, then Next a few times; try the chips. Open Settings to confirm the commit matches.

## What's next

Following SPEC.md §8:

1. **Milestone 3 (AI):**
   - Settings: API key paste / test / remove (`expo-secure-store` on native, `localStorage` on web with the on-device note).
   - The AI layer under `src/ai/`: `provider.ts` (`AiProvider` interface), `gemini.ts` (plain `fetch`, `responseSchema`, single model constant), `prompt.ts`, `parse.ts`, `angles.ts`.
   - A queue of 5 refilled at ≤ 1, invalidated when chips or the context change.
   - `src/sparks/source.ts` orchestrator with error mapping and silent fallback to the deck.
   - The context box (AI-only).
2. **Milestone 4 (saved + polish):**
   - ☆ Save on the card and the Saved list (persisted, delete by swipe or long-press).
   - Haptics on Spark (`expo-haptics`) and keep-awake while a card shows (`expo-keep-awake`).
   - Settings: work-safe default, Clear history, About/privacy note.
   - `eas.json` with a `preview` profile for the APK.
   - Real app icon and PWA manifest.

## Known issues / limitations

- **Deploys only from `main`.** Pushes to this branch run the checks but do not deploy. I couldn't check from here whether Pages is enabled for this repo; if `configure-pages` fails on `main`, step 2 above is the fix.
- **Nothing is persisted yet.** Chips reset on reload. History is per session by design (SPEC F3: shuffled per session); the work-safe default arrives with Settings in milestone 4.
- **Reroll behaves exactly like Next** with the offline deck. The difference is meant for the AI queue in milestone 3.
- **No Save, haptics or keep-awake yet** (all milestone 4).
- **Browser back on the web** while a card is showing leaves the page instead of closing the card. The card is screen state, not a route. Android hardware back is handled.
- **Native is untested on a device.** There is no APK yet; checks so far are Jest (native preset) and the web export.
- **Placeholder assets.** The app icon and splash are the Expo template defaults, and there is no PWA manifest, so "Add to Home screen" makes a plain shortcut.
- **Font sizing is by text length,** not measured layout. It works for ≤ 160 chars; very narrow screens may need the scroll.
- **`npm audit`** reports 30 moderate/low advisories in transitive Expo/Jest tooling (deepmerge, glob, minimatch). They are dev/build-time and not shipped in the app; `npm audit fix --force` would break the SDK pins.
- **Deep links on Pages** (e.g. `/stormbrainer/settings`) are served through `404.html`, so they return HTTP 404 but render the right screen. That is normal for SPAs on GitHub Pages.
