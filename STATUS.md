# Status

_Last updated: 2026-11-15 — milestones 1 (skeleton), 2 (offline loop), 3 (AI) and 4 (saved + polish) done; milestone 5 is the field test._

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
  - Card actions: **Next**, **Reroll**, **Close**, and **☆ Save** in the corner (★ when saved; tap again to unsave).
  - A source badge on every card: yellow **Gemini** for AI sparks, grey **offline deck** for deck sparks.
  - A status line on Home says where sparks come from right now: "Sparks come from Gemini", "…offline deck. Add a Gemini key…", or "Offline deck for now: <reason>" (links to Settings).
  - Android back closes the card.
  - Haptic tap on Spark and Next (`expo-haptics`; vibration on Android web).
  - The screen stays awake while a card is showing (`expo-keep-awake`; Wake Lock on web).
- **No repeats:** sparks are deduped by id and by normalized text (FNV-1a hash). The deck is drawn without replacement and reshuffles only once every matching spark has been shown, never repeating the card that was just on screen.
- **Filtering:** chips filter both the deck and AI requests. Work-safe ON never yields a `workSafe: false` deck spark. If a vibe has nothing for the chosen types, only the vibe is relaxed (never the types or work-safe); in practice that cannot happen, because every type × vibe has a work-safe spark.
- **Offline deck (F3):** `src/sparks/deck.json`, 152 hand-written sparks: 38 per type, 64 Light (all work-safe), 48 Deep, 40 Spicy. Default settings give a 64-spark pool, so "50 taps produce no repeats" holds (tested, with work-safe on and off). Each entry is validated in tests: shape, ≤ 160 chars, no emojis, no numbering, options where required, unique ids and texts.
- **AI sparks with your own key (F4):**
  - **Settings:**
    - Paste a key; saving it runs **Test key** straight away. Test key asks Gemini for one real spark, so it proves that generation works, not just that the key exists.
    - **Test key** and **Remove key** buttons, and a link to the AI Studio key page.
    - Status messages: works / not accepted / model not found / network, plus Google's own error text ("Details: …", key removed) and the last problem seen while drawing sparks.
    - **Advanced → model id** (blank = default) and the privacy note.
  - **Key storage:**
    - `expo-secure-store` on native, `localStorage` on web, with the "this device only" note.
    - The key is never held in app state, logged, put in a URL or in an error; tests check this.
  - **Gemini** (`src/ai/gemini.ts`):
    - Plain `fetch` to the REST API; the key only in the `x-goog-api-key` header.
    - `responseSchema` JSON output, a 30 s timeout.
    - `thinkingLevel: "low"` for Gemini 3+ models: 3.8 Flash thinks at "medium" by default, which made the first answers slow. Older models don't get the field.
    - The one model constant is `DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'` (free tier, checked 2026-11-15).
  - **Batching and queue** (`src/sparks/source.ts`):
    - One request returns 5 sparks; later taps come from the queue instantly.
    - The queue refills in the background when ≤ 1 is left.
    - It is dropped when chips or context change.
    - Home **prefetches** a batch as soon as it shows (and when chips or context change), so the first tap is already an AI card.
    - If a tap still finds the queue empty, it waits for AI for at most 8 s (spinner on the button), then shows a deck card while the batch keeps coming.
  - **Variety:** each request gets one of 44 random angles plus the last 30 shown texts as "do not repeat". The model's output is validated with the deck's rules (`src/sparks/validate.ts`).
  - **Failures** never crash or spin forever:
    - Quota (429): silent fallback to the deck with the badge, AI paused 60 s.
    - Network or bad output: silent fallback to the deck, AI paused 20 s.
    - Blocked or empty: retried once with a new angle, then fallback.
    - Invalid key or unknown model: AI off until you fix it in Settings, with the notice on Home.
- **Card text size:** grows smaller as the text gets longer, never below 28. The text wraps and scrolls; it is never truncated.
- **Saved (F5):** starred sparks, newest first, persisted with AsyncStorage (localStorage on web), so they survive a restart. Tap one to show it as a card again; long-press it, then Delete, to remove it. Empty state when there are none. Stored data is validated on load; anything unreadable is dropped, never a crash.
- **Settings, rest of F5:**
  - **Work-safe by default** (persisted, applied at startup and right away).
  - **Clear history**, so every spark can come up again.
  - About with the privacy note.
  - `Version 0.1.0 · <commit>`, so you can see which build is running.
- **App icon and web manifest:** an original icon (the yellow Spark circle with a lightning bolt) for the app, the Android adaptive icon (with monochrome variant), the favicon and the web manifest. "Add to Home screen" on the preview now installs a standalone app with that icon. `expo-system-ui` keeps Android's root view dark.
- **Preview APK** (`.github/workflows/android.yml`):
  - Builds an installable APK on GitHub Actions: `expo prebuild`, then a Gradle release build signed with the debug key, for arm64 phones.
  - Uploads it as the run's `stormbrainer-apk` artifact.
  - Runs from the Actions tab (Run workflow) and on pushes that change native dependencies or config.
  - No Expo account or secrets needed. `eas.json` also has the SPEC's `preview` profile (APK, internal distribution) for EAS cloud builds.
- **Tests:** 276 passing (each deck entry is its own validation test). Tests mock `fetch`; they never hit the real API. They cover:
  - deck validation, filtering, draw/dedupe and history;
  - prompt building, response parsing, error mapping;
  - queue refill and invalidation, retries, cooldowns, slow AI, fallback orchestration;
  - SparkCard layouts per type;
  - saved-list logic (dedupe, cap, merge, parsing bad data);
  - end-to-end router tests:
    - the deck loop;
    - the full AI flow (save/test/remove key, model override, AI cards from the queue, context sent, quota fallback with badge, rejected key notice);
    - milestone 4 (star → Saved → show again → delete, saved sparks and the work-safe default surviving a restart, Clear history, haptics on Spark, keep-awake only while a card shows).
- **CI** (`.github/workflows/ci.yml`): every push runs `npm ci` → typecheck → lint → test → web export. On `main` it also deploys `dist/` to GitHub Pages, the same way as weDate (`upload-pages-artifact` + `deploy-pages`).
- **Web build:** `npm run build:web` exports with `experiments.baseUrl: /stormbrainer` and copies `index.html` to `404.html`, so deep links and refreshes work on Pages. I checked the AI flow in the exported web build with Playwright at phone size, with the Gemini API faked: key saved and tested, context sent, AI cards from the queue, 429 fallback.

## How to check it on your phone

1. Open https://se7enbit.github.io/stormbrainer/ after the CI run on `main` goes green. Settings shows the commit it was built from.
2. Without a key: Spark gives deck cards with the "offline deck" badge.
3. Get a free key at https://aistudio.google.com/apikey and paste it in **Settings**. Saving it tests it; you should see "The key works".
4. Back on Home, optionally add a group context, then tap Spark. The first card can take a few seconds; the next ones are instant. AI cards have no badge.
5. Tap ☆ on a card, then open **Saved**.
6. **Native app:** open the repo's **Actions** tab, pick **Android APK**, and open the latest green run (or press **Run workflow**). Download `stormbrainer-apk` and unzip it to get `stormbrainer-<commit>.apk`. Install it; Android asks to allow installs from your browser or files app the first time. This is the way to check secure key storage, haptics and keep-awake on the device.

## What's next

Following SPEC.md §8:

1. **Check on a device:** install the APK and try the key, haptics and keep-awake; paste a real key on the preview.
2. **Milestone 5 (field test):** use it on a real group night; tune prompts, angles and the deck from what landed.
3. **Optional:** EAS builds instead of the GitHub-built APK need an Expo account. Run `eas init` once (it adds the project id to `app.json`), then `eas build -p android --profile preview`.

## Known issues / limitations

- **Not tested against the real Gemini API from here.** Everything is tested with a faked API: this environment cannot reach Google, and tests must not use a real key. The first real check is pasting your key: Test key now generates a real spark and shows Google's error text if anything is wrong.
- **The key is per device and per app.** The web preview (each browser) and the APK store their own keys; paste it in each.
- **Prefetching spends quota** even if you don't tap: one batch (one request) per Home visit with new settings.
- **Chips and context reset on reload** (only the key, model, work-safe default and saved sparks persist). History is per session by design (SPEC F3).
- **Reroll behaves exactly like Next** (both take the next spark for the same settings).
- **Browser back on the web** while a card is showing leaves the page instead of closing the card. The card is screen state, not a route. Android hardware back is handled.
- **Native is untested on a device.** Checks so far are Jest (native preset), `expo prebuild` and the web export. The APK workflow is the first native build.
- **The APK is signed with the debug key.** That is fine for sideloading previews, not for the Play Store (out of scope). Installing a later APK over an earlier one works because the key stays the same.
- **No service worker on web.** The installed web app needs a connection to load; offline use is the native app's job.
- **Saved delete is long-press, not swipe.** Swiping would need a gesture library; long-press keeps the dependencies down.
- **Font sizing is by text length,** not measured layout. It works for ≤ 160 chars; very narrow screens may need the scroll.
- **`npm audit`** reports moderate/low advisories in transitive Expo/Jest tooling (deepmerge, glob, minimatch). They are dev/build-time and not shipped in the app; `npm audit fix --force` would break the SDK pins.
- **Deep links on Pages** (e.g. `/stormbrainer/settings`) are served through `404.html`, so they return HTTP 404 but render the right screen. That is normal for SPAs on GitHub Pages.
