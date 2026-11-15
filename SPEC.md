# Stormbrainer — SPEC

> One big button that gets a group talking about something other than "so, what's everyone up to?"

## 1. Core problem

Groups of friends, families and teams fall into the same small-talk loop. Someone *wants* a better conversation (a debate, a hot take, old stories), but on the spot nobody can come up with a good opener, and typing a prompt into a chatbot kills the moment.

**Stormbrainer's job:** one tap gives one spark that is good enough to read aloud, sized for a phone lying on a table. It has to be faster than opening Gemini/ChatGPT and typing — if it isn't, the app has no reason to exist.

**Primary user:** the "host" of a group (friends' night, road trip, family dinner, team lunch/offsite) holding one phone. Only the host needs the app and (optionally) an API key.

## 2. MVP — 5 features

### F1. The Spark button + card
- Home screen is dominated by one huge **Spark** button.
- Tap → haptic → one **card** fills the screen in very large, high-contrast text (readable across a table).
- Card layout depends on spark type:
  - **Debate** — the question + two labelled sides (A vs B).
  - **Hot take** — the statement + "Agree / Disagree?" hint.
  - **Memory lane** — the question (invites a story).
  - **What if / Would you rather** — the hypothetical, or two options.
- Card actions: **Next** (new spark), **Reroll** (same settings, replace this one), **☆ Save**.
- Screen stays awake while a card is showing (`expo-keep-awake`).
- No repeats: a spark already shown (by id or normalized text) is not shown again until the pool runs out.

### F2. Minimal context controls (all optional)
- **Type chips** (multi-select, default = all): Debate · Hot take · Memory lane · What if.
- **Vibe chip** (single): Light (default) · Deep · Spicy.
- **Work-safe toggle**: when ON, no politics, religion, sex, drugs, money/health of individuals, or anything that could single out a person. Spicy becomes "playfully provocative", never offensive.
- **Context box**: one line, max 100 chars, collapsed by default (e.g. "old uni friends at a cabin", "new team, first offsite"). Used only by AI mode.
- Controls sit in a compact strip under the button; nothing is required before tapping.

### F3. Offline deck (works with no key)
- ~150 hand-written sparks bundled as JSON, tagged by `type`, `vibe`, `workSafe`.
- Used on first launch, when no key is set, when offline, and as **automatic fallback** when the AI call fails or hits quota (429). Fallback is silent except for a small "offline deck" badge on the card.
- Drawn without replacement (shuffled per session), reshuffled when exhausted.

### F4. AI sparks via Gemini — bring your own key
- User pastes their own Google AI Studio API key in Settings; **Test key** button verifies it with a tiny request.
- Key storage: `expo-secure-store` on native; on web, `localStorage` with a visible "stored on this device only" note.
- Calls go **directly from the device to the Gemini REST API** (`generateContent`, header `x-goog-api-key`). No backend.
- **Batching:** one request returns **5 sparks** as structured JSON (`responseMimeType: application/json` + `responseSchema`). They are queued, so most taps are instant and quota lasts ~5× longer. The queue is refilled in the background when ≤ 1 remains. The queue is invalidated when chips/context change.
- **Variety engine (client-side):** each request includes (a) a randomly picked *angle* from a list of ~40 (food, travel, childhood, tech, work, money-free hypotheticals, pop culture, ethics-lite, animals, the future, …), (b) the last ~30 shown spark texts as "do not repeat", (c) the chip settings + context line.
- Model id lives in **one constant** (default: a current free-tier Flash model; check AI Studio before shipping, free-tier models change) and is overridable in Settings → Advanced.
- Errors are mapped to friendly messages: invalid key, quota exceeded (→ fallback to deck), network (→ fallback), blocked/empty response (→ retry once with a new angle, then fallback).

### F5. Saved sparks + Settings
- **Saved**: list of starred sparks (local), tap to show as a card again, swipe/long-press to delete.
- **Settings**: API key (paste / test / remove + link to AI Studio key page), work-safe default, Advanced (model id), "Clear history", About (privacy note: on the Gemini free tier, Google may use prompts to improve its products — so the context box should not hold anything sensitive).

## 3. Out of scope (for MVP)
- Accounts, login, cloud sync, any backend or proxy.
- Payments / Pro unlock (designed for in §6, not built).
- Player names, turns, timers, scoring, voting.
- Multi-device / shared sessions.
- Hosted AI (no-key) mode, other AI providers (but keep the provider behind an interface).
- Custom user decks, extra themed packs, themes.
- Ads, analytics, crash reporting SDKs.
- Voice / TTS, share-as-image.
- Localization (English only; strings kept in one file so Greek etc. can come later).
- iOS App Store / Play Store release builds (preview APK only).

## 4. Tech stack (testable from a phone)

| Concern | Choice |
|---|---|
| Framework | Expo (latest SDK) + React Native, **TypeScript strict** |
| Navigation | Expo Router (file-based): `/` home, `/saved`, `/settings` |
| State | Zustand (small store for settings, queue, history) |
| Persistence | `@react-native-async-storage/async-storage` (settings, history, saved); `expo-secure-store` for the key (native) |
| AI | Plain `fetch` to Gemini REST API — no SDK dependency |
| Device | `expo-haptics`, `expo-keep-awake` |
| Tests | Jest via `jest-expo` + React Native Testing Library |
| Lint/format | ESLint (expo config) + Prettier |
| CI | GitHub Actions: typecheck → lint → test → web export → deploy |

**Phone testing paths** (no laptop needed):
1. **Web preview (primary):** every push to `main` builds `npx expo export -p web` and deploys to GitHub Pages. Open the URL on the phone; add to home screen. Requires `experiments.baseUrl` set to the repo name in `app.json`.
2. **Android preview APK (native checks):** `eas build -p android --profile preview` (EAS cloud build, free tier) → install the APK on the phone. Needed for SecureStore, haptics, keep-awake.
3. **Unit tests in CI** for all pure logic (see below), so most correctness is verified without touching a device.

## 5. Architecture

```
app/
  _layout.tsx          # Router + theme
  index.tsx            # Home: Spark button, chips strip, card
  saved.tsx
  settings.tsx
src/
  sparks/
    types.ts           # Spark, SparkType, Vibe, SparkRequest
    deck.json          # offline deck (~150)
    deck.ts            # filter + shuffle-without-replacement
    history.ts         # recent texts, dedupe (normalize + hash)
    source.ts          # SparkSource interface + orchestrator (AI → fallback deck)
  ai/
    provider.ts        # AiProvider interface: generateSparks(req) → Spark[]
    gemini.ts          # Gemini REST implementation
    prompt.ts          # system instruction + request builder
    parse.ts           # validate/normalize model JSON → Spark[]
    angles.ts          # variety angles list
  store/               # zustand stores (settings, queue, saved)
  storage/             # secureKey.ts (native/web split), kv.ts
  ui/                  # SparkButton, SparkCard (per-type layouts), Chip, Toggle
  strings.ts
```

### Data model
```ts
type SparkType = 'debate' | 'hotTake' | 'memoryLane' | 'whatIf';
type Vibe = 'light' | 'deep' | 'spicy';

interface Spark {
  id: string;            // deck id or generated uuid
  type: SparkType;
  text: string;          // main line, ≤ 160 chars
  options?: [string, string]; // debate sides / would-you-rather choices
  source: 'deck' | 'ai';
  vibe: Vibe;
  workSafe: boolean;
}

interface SparkRequest {
  types: SparkType[];
  vibe: Vibe;
  workSafe: boolean;
  context?: string;      // ≤ 100 chars
  angle: string;
  avoid: string[];       // recent texts
  count: number;         // 5
}
```

### Prompt rules (system instruction, summarized)
- You write conversation sparks to be **read aloud to a group** sitting together.
- One sentence where possible, max ~160 chars, no preamble, no emojis, no numbering.
- Debate: genuinely two-sided, fun to argue; both sides defensible.
- Hot take: a confident, slightly contrarian opinion people will want to react to.
- Memory lane: a question that invites **this group's** stories ("the most chaotic trip…", "the worst haircut anyone here…"). **Never invent shared history or facts about the group.**
- What if: hypothetical or would-you-rather with two balanced options.
- Never target, mock or single out an individual; no harassment, hate, sexual content.
- Work-safe ON: avoid politics, religion, sex, drugs, salaries, health, relationships.
- Use the angle as inspiration; do not repeat anything in `avoid`.
- Output must match the JSON schema exactly.

## 6. Monetization (later — not in MVP)

**Free:** offline deck + all four spark types + BYOK AI.

**Pro — one-time unlock (~€3.99) via Google Play Billing (RevenueCat):**
- Themed packs: Road trip, Old friends, Team offsite, Family table, Late night.
- **Group lore:** saved group profiles ("uni crew: Athens, 2020–24, the Crete trip") so memory-lane sparks get personal without retyping.
- Custom decks (write/curate your own sparks).
- Card themes / big-screen "presentation" mode.

**Possible v3:** a team/event subscription with hosted AI (no key needed), aimed at offsites, teachers and facilitators. Needs a backend + abuse limits; the `AiProvider` interface is the seam for it.

Honest expectation: conversation-card apps are a crowded, low-price category. The likely wins are portfolio value and a small organic Pro conversion. The "group lore" angle is the main thing generic card decks can't copy.

## 7. Acceptance criteria (MVP done when…)
- [ ] Fresh install, no key: tapping Spark shows a deck card within 100 ms; 50 taps produce no repeats.
- [ ] Chips filter both deck and AI sparks; work-safe ON never yields a deck spark tagged `workSafe: false`.
- [ ] With a valid key: first AI card ≤ 3 s, subsequent taps instant while the queue has items.
- [ ] Invalid key → clear message in Settings; 429/network → silent fallback to deck with badge.
- [ ] Saved sparks survive app restart; key survives restart (native) and is never logged.
- [ ] Card text is readable at arm's length (min 28pt, auto-shrinks for long text, never truncated).
- [ ] CI green: typecheck, lint, tests; web preview deployed on push to `main`.

## 8. Milestones
1. **Skeleton** — Expo + Router + TS strict, CI, GitHub Pages web deploy working with a placeholder screen.
2. **Offline loop** — deck.json (start with 40, grow to 150), Spark button, card layouts, chips, history/dedupe. Fully usable with no key.
3. **AI** — key settings + test, Gemini provider, prompt/parse with tests, batching queue, fallback.
4. **Saved + polish** — saved list, haptics, keep-awake, empty/error states, preview APK via EAS.
5. **Field test** — use it on a real group night; tune prompts, angles and deck from what actually landed.
