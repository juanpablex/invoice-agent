# Invoice Agent: notes for Claude

- Reply to the owner in Spanish. Everything in the repo (code, UI text, README) is in English.
- Hard rules: all data is fictional; no code, data or names from the owner's employer; never commit or log an API key.
- Honest labeling: the default mode is **scripted** (canned extraction for the samples). Real-model mode uses the visitor's own key. Never present the scripted mode as a model.
- The agent must never be able to book or approve an expense: no tool for it in `src/core/ledger.ts`; booking only through `bookProposal` called from the UI after a human swipe. `scripts/agent-check.mts` enforces it.
- Expo changes every SDK; check the installed `expo` version. `npx expo install` may be blocked in the sandbox (api.expo.dev): use `node_modules/expo/bundledNativeModules.json` for versions.
- Before pushing: `npm run typecheck`, `npm test`, `npm run build:web`.
