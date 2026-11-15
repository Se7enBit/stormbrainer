# Status

_Last updated: 2026-11-15 — milestones 1 (skeleton), 2 (offline loop) and 3 (AI) done._

## What works

- **Scaffold:** Expo SDK 58, React Native 0.88, Expo Router (`app/`: `/`, `/saved`, `/settings`), TypeScript strict (plus `noUncheckedIndexedAccess`), Zustand, ESLint (expo flat config) + Prettier, Jest (`jest-expo`) + React Native Testing Library v14.
- **Home screen:** one huge **Spark** button with the chips strip under it.
  - Type chips (multi-select, default all). When all are selected, one tap narrows to that type; deselecting the last one goes back to all.
  - Vibe chips (Light / Deep / Spicy, default Light).
  - Work-safe toggle.
  - With a key saved: a collapsed **group context** line (≤ 100 chars, AI only).
  - A "check your key in Settings" notice if the key or model was rejected.
- **Cards (F1):** Spark → a full-screen card. Layout depends on type:
  - Debate: A vs B sides.
  - Hot take: "Agree or disagree?" hint.
  - Memory lane: "Who has a story?" hint.
  - What if: two options when it is a would-you-rather.
  - Card actions: **Next**, **Reroll**, **Close**.
  - An "offline deck" badge on every card that came from the deck.
  - Android back closes the card.
- **No repeats:** sparks are deduped by id and by normalized text (FNV-1a hash). The deck is drawn without replacement and reshuffles only once every matching spark has been shown, never repeating the card that was just on screen.
- **Filtering:** chips filter both the deck and AI requests. Work-safe ON never yields a `workSafe: false` deck spark. If a vibe has nothing for the chosen types, only the vibe is relaxed (never the types or work-safe); in practice that cannot happen, because every type × vibe has a work-safe spark.
- **Offline deck (F3):** `src/sparks/deck.json`, 152 hand-written sparks: 38 per type, 64 Light (all work-safe), 48 Deep, 40 Spicy. Default settings give a 64-spark pool, so "50 taps produce no repeats" holds (tested, with work-safe on and off). Each entry is validated in tests: shape, ≤ 160 chars, no emojis, no numbering, options where required, unique ids and texts.
- **AI sparks with your own key (F4):**
  - **Settings:**
    - Paste a key; saving it runs **Test key** straight away.
    - **Test key** and **Remove key** buttons, and a link to the AI Studio key page.
    - Status messages: works / not accepted / model not found / network.
    - **Advanced → model id** (blank = default) and the privacy note.
  - **Key storage:**
    - `expo-secure-store` on native, `localStorage` on web, with the "this device only" note.
    - The key is never held in app state, logged, put in a URL or in an error; tests check this.
  - **Gemini** (`src/ai/gemini.ts`):
    - Plain `fetch` to the REST API; the key only in the `x-goog-api-key` header.
    - `responseSchema` JSON output, a 15 s timeout.
    - Test key is a GET of the model's metadata, which costs no quota.
    - The one model constant is `DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'` (free tier, checked 2026-11-15).
  - **Batching and queue** (`src/sparks/source.ts`):
    - One request returns 5 sparks; later taps come from the queue instantly.
    - The queue refills in the background when ≤ 1 is left.
    - It is dropped when chips or context change.
    - A tap waits for AI for at most 5 s (spinner on the button), then shows a deck card while the batch keeps coming.
  - **Variety:** each request gets one of 44 random angles plus the last 30 shown texts as "do not repeat". The model's output is validated with the deck's rules (`src/sparks/validate.ts`).
  - **Failures** never crash or spin forever:
    - Quota (429): silent fallback to the deck with the badge, AI paused 60 s.
    - Network or bad output: silent fallback to the deck, AI paused 20 s.
    - Blocked or empty: retried once with a new angle, then fallback.
    - Invalid key or unknown model: AI off until you fix it in Settings, with the notice on Home.
- **Card text size:** grows smaller as the text gets longer, never below 28. The text wraps and scrolls; it is never truncated.
- **Settings** also shows `Version 0.1.0 · <commit>`, so you can see which build the preview is running. **Saved** is a placeholder.
- **Tests:** 257 passing (each deck entry is its own validation test). Tests mock `fetch`; they never hit the real API. They cover:
  - deck validation, filtering, draw/dedupe and history;
  - prompt building, response parsing, error mapping;
  - queue refill and invalidation, retries, cooldowns, slow AI, fallback orchestration;
  - SparkCard layouts per type;
  - end-to-end router tests: the deck loop, plus the full AI flow (save/test/remove key, model override, AI cards from the queue, context sent, quota fallback with badge, rejected key notice).
- **CI** (`.github/workflows/ci.yml`): every push runs `npm ci` → typecheck → lint → test → web export. On `main` it also deploys `dist/` to GitHub Pages, the same way as weDate (`upload-pages-artifact` + `deploy-pages`).
- **Web build:** `npm run build:web` exports with `experiments.baseUrl: /stormbrainer` and copies `index.html` to `404.html`, so deep links and refreshes work on Pages. I checked the AI flow in the exported web build with Playwright at phone size, with the Gemini API faked: key saved and tested, context sent, AI cards from the queue, 429 fallback.

## How to check it on your phone

1. Open https://se7enbit.github.io/stormbrainer/ after the CI run on `main` goes green. Settings shows the commit it was built from.
2. Without a key: Spark gives deck cards with the "offline deck" badge.
3. Get a free key at https://aistudio.google.com/apikey and paste it in **Settings**. Saving it tests it; you should see "The key works".
4. Back on Home, optionally add a group context, then tap Spark. The first card can take a few seconds; the next ones are instant. AI cards have no badge.

## What's next

Following SPEC.md §8:

1. **Milestone 4 (saved + polish):**
   - ☆ Save on the card and the Saved list (persisted, delete by swipe or long-press).
   - Haptics on Spark (`expo-haptics`) and keep-awake while a card shows (`expo-keep-awake`).
   - Settings: work-safe default, Clear history.
   - `eas.json` with a `preview` profile for the APK (secure-store, haptics and keep-awake need a native check).
   - Real app icon and PWA manifest.
2. **Milestone 5 (field test):** use it on a real group night; tune prompts, angles and the deck from what landed.

## Known issues / limitations

- **Not tested against the real Gemini API from here.** Everything is tested with a faked API: this environment cannot reach Google, and tests must not use a real key. The first real check is pasting your key on the preview. If Test key fails with "model not found", set the model id under Advanced.
- **Gemini thinking is left at the model default.** If the first AI card is often slower than the 3 s target (the 5 s wait then shows a deck card first), try a lower thinking level in the request once real calls can be measured.
- **Nothing but the key and model is persisted yet.** Chips and context reset on reload. History is per session by design (SPEC F3); the work-safe default arrives with Settings in milestone 4.
- **Reroll behaves exactly like Next** (both take the next spark for the same settings).
- **No Save, haptics or keep-awake yet** (all milestone 4).
- **Browser back on the web** while a card is showing leaves the page instead of closing the card. The card is screen state, not a route. Android hardware back is handled.
- **Native is untested on a device.** There is no APK yet; checks so far are Jest (native preset) and the web export.
- **Placeholder assets.** The app icon and splash are the Expo template defaults, and there is no PWA manifest, so "Add to Home screen" makes a plain shortcut.
- **Font sizing is by text length,** not measured layout. It works for ≤ 160 chars; very narrow screens may need the scroll.
- **`npm audit`** reports moderate/low advisories in transitive Expo/Jest tooling (deepmerge, glob, minimatch). They are dev/build-time and not shipped in the app; `npm audit fix --force` would break the SDK pins.
- **Deep links on Pages** (e.g. `/stormbrainer/settings`) are served through `404.html`, so they return HTTP 404 but render the right screen. That is normal for SPAs on GitHub Pages.
