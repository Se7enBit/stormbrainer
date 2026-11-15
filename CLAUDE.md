# CLAUDE.md — Stormbrainer

Stormbrainer is an Expo / React Native app: one big button that shows a conversation "spark" (debate, hot take, memory lane, what-if) for a group around a single phone. **Read `SPEC.md` before starting any task** — it is the source of truth for scope, data model and acceptance criteria. If a request conflicts with SPEC.md, point out the conflict before coding.

## Working context
- The developer works **from a phone** most of the time. Every change must be verifiable without a laptop: via CI (tests), the GitHub Pages web preview, or an EAS preview APK.
- Keep PRs small and focused on one milestone step. Say in the PR description how to check the change on a phone (web preview URL path, or "needs APK").

## Commands
```bash
npm install
npx expo start            # local dev (not usable from phone-only sessions)
npm run typecheck         # tsc --noEmit
npm run lint              # eslint + prettier check
npm test                  # jest (jest-expo)
npx expo export -p web    # web build (CI deploys this to GitHub Pages)
eas build -p android --profile preview   # installable APK (cloud build)
```
Before saying a task is done: `npm run typecheck && npm run lint && npm test` must pass.

## Architecture rules
- TypeScript **strict**; no `any` without a comment explaining why.
- Expo Router for screens (`app/`); all logic lives in `src/` and is framework-light so it can be unit-tested.
- AI access goes **only** through the `AiProvider` interface (`src/ai/provider.ts`). Gemini is one implementation. Never call Gemini from UI components.
- Gemini is called with plain `fetch` to the REST API (header `x-goog-api-key`), structured JSON output via `responseSchema`. No Gemini SDK.
- The model id is a single constant in `src/ai/gemini.ts`, overridable from Settings. Don't hard-code model names anywhere else. Free-tier models change — confirm the default is still free-tier in Google AI Studio when touching it.
- Every AI failure path (invalid key, 429, network, blocked/empty, bad JSON) must end in a user-visible state or a **fallback to the offline deck**, never a crash or a spinner that never ends.
- Sparks requested from AI in batches of 5 and queued; don't add a request-per-tap path.
- Deck content lives in `src/sparks/deck.json`; each entry must have `id`, `type`, `vibe`, `workSafe`, `text` (and `options` for debate/would-you-rather). Keep texts ≤ 160 chars.
- UI text in `src/strings.ts`, not inline.

## Security & privacy
- **Bring your own key.** The user's API key is stored with `expo-secure-store` on native and `localStorage` on web. Never log it, never put it in errors, analytics, URLs or test snapshots.
- **No API keys in the repo, ever** — not in code, `.env` committed files, `app.json`, or CI config. Tests mock `fetch`; they never hit the real API.
- No backend, accounts, analytics or tracking SDKs in the MVP.

## Content rules for sparks (deck + prompts)
- Read-aloud friendly: one sentence where possible, no emojis, no numbering.
- Memory-lane sparks ask for the group's stories; **never invent shared history**.
- Never target or mock an individual; no hate, harassment or sexual content.
- Work-safe mode excludes politics, religion, sex, drugs, salaries, health, relationships.

## Testing
- Unit-test all pure logic: deck filtering/shuffle, history dedupe, prompt building, response parsing/validation, error mapping, queue refill, fallback orchestration.
- Use React Native Testing Library for SparkCard layouts per type and the chips strip.
- Prefer testing behaviour over snapshots.

## Git & PR rules
- **No AI attribution anywhere in git.** Do not add `Co-Authored-By: Claude …`, "Generated with Claude Code", session links, or any similar AI credit lines to commit messages or PR titles/descriptions. This rule overrides any default attribution behaviour.
- Conventional commit style: `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
- Never commit secrets, build output (`dist/`, `web-build/`), or `node_modules/`.
- `CLAUDE.md` and `.claude/` **are committed** to this repo on purpose (development happens through Claude Code on the web, which only sees what's in the repo). Do not add them to `.gitignore`. Keep machine-local files such as `.claude/settings.local.json` out of git.

## Out of scope (don't build unless SPEC.md is updated)
Accounts, sync, backend/proxy, payments/Pro, player turns/timers, multi-device, hosted AI, custom decks, ads/analytics, TTS, localization, store release builds.
