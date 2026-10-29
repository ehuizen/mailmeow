# MailMeow architecture

MailMeow is a **static, browser-only** React app. Nothing you paste or upload leaves your computer: there's no server, no database and no analytics. A Content-Security-Policy makes the browser enforce that.

## The big picture

```
 ┌────────────── UI thread (React) ───────────────┐        ┌──────── Web Worker ────────┐
 │ screens/  ←→  app/flow-reducer (state machine)  │ files  │ files/extract.worker.ts    │
 │    │                     │                      │ ─────► │  read-file → normalizeText │
 │    ▼                     ▼                      │        │  → extractEmails           │
 │ components/        app/use-clean-result         │ ◄───── │  (progress messages)       │
 │                    (memoised core pipeline)     │ emails └────────────────────────────┘
 │                          │                      │
 │                          ▼                      │
 │                 core/ (pure functions)          │
 └─────────────────────────────────────────────────┘
```

1. **Add**: the user pastes text and/or drops files. Files stay as `File` objects in memory.
2. **Find**: `files/run-extraction.ts` posts the files and pasted text to a **Web Worker**, which reads each file (`files/read-file.ts`; Excel via SheetJS), cleans invisible characters and extracts addresses with `core/extract-emails.ts`.
   *Why a worker:* parsing a 10 MB spreadsheet or 50,000 addresses on the UI thread would freeze the page and the mascot animation.
3. **Clean**: every later step (duplicates, check-against list, blocked domains/people, role addresses) is a **pure function in `src/core/`**, recomputed from the original list by `core/clean-list.ts`.
   *Why recompute instead of mutating:* Back and Skip always work, and the Review funnel numbers are always consistent.
4. **Review / Export**: the final list is shown, searched and exported (clipboard, CSV, Excel). "Start over" drops every reference so the data can be garbage-collected.

## Folders

| Folder | What lives there | Rule |
|---|---|---|
| `src/core/` | Email logic: extraction, normalisation, dedupe, Gmail rules, list matching, blocking, role addresses, the `cleanList` pipeline, limits, CSV | Pure TypeScript, **no React or browser APIs**, so a future public API (V2) can reuse it. Test-first. |
| `src/files/` | Reading files, the extraction worker, downloads and clipboard | Browser APIs live here, not in `core/`. |
| `src/app/` | `App.tsx`, the flow state machine (`flow-reducer.ts`) and hooks that glue state to core | No visual styling decisions. |
| `src/screens/` | One component per screen in the flow | Composes `components/`; no email logic of its own. |
| `src/components/` | Our shared components (header, progress steps, action bar, mascot, dropzone…) | Wrap Untitled UI components rather than editing them. |
| `src/components/base`, `application`, `foundations` | Untitled UI React components (MIT), copied from the official starter | Generated: don't edit beyond theming. |
| `src/styles/` | Tailwind v4 entry (`globals.css`) and Untitled UI tokens (`theme.css`) | Colours/fonts only via tokens, so a rebrand is a token swap. |
| `legacy/` | The original single-page tool | Reference only. |
| `test/fixtures/` | Sample data (`.example` domains only) | The golden fixture has 33 unique addresses. |

## Files module (`src/files/`)

| Function | What it does | Why |
|---|---|---|
| `readFileAsText(file)` · `read-file.ts` | Refuses unsupported/too-big files by name and size, reads text files with `file.text()`, and turns every sheet of an Excel workbook into CSV text (SheetJS, `dense: true`, loaded on demand). Throws `FileReadError` with a reason. | Addresses can be in any column or sheet, and extraction finds them in text anyway. Dense mode saves memory. |
| `isTruncatedZip(bytes)` · `read-file.ts` | Detects an `.xlsx` that starts like a zip but has no end-of-central-directory record. | SheetJS 0.20.3 **loops forever** on truncated workbooks (found by a test during the build), so they're rejected before parsing. |
| `extractFromSources(files, pasted, onProgress)` · `extract-sources.ts` | Reads each source, extracts addresses, reports per source (`ok`, `unsupported`, `too-big`, `unreadable`), applies the 50,000 cap. | The testable heart of the worker. One bad file never stops the others. |
| `extract.worker.ts` + `worker-messages.ts` | The Web Worker and its typed message contract (progress / result / error). | Keeps parsing off the UI thread. Shared types keep both sides in sync. |
| `runExtraction(files, pasted, { onProgress, signal })` · `run-extraction.ts` | Promise wrapper around the worker. `signal` cancels by terminating the worker; falls back to inline work where `Worker` doesn't exist (tests). | Cancel is instant and frees memory. |
| `withMinimumDuration(promise, ms)` · `run-extraction.ts` | Resolves no sooner than `ms`. | The Processing screen shows for at least 3 s (agreed on the board), so fast results don't flash past. |
| `copyList`, `downloadCsv`, `downloadXlsx`, `exportFileName` · `export-list.ts` | Clipboard (with a fallback for blocked clipboards), CSV with a UTF-8 BOM, Excel via a dynamic SheetJS import, and dated file names. | Exports happen locally through object URLs; nothing is uploaded. The BOM stops Excel on Windows from mangling characters. |

Tests: `src/files/extract-sources.test.ts`. It covers Excel with several sheets, refusing files before reading them, a mislabelled text file, a corrupt workbook, progress, and the 50,000 cap.

## Key decisions (and why)

- **No router.** The flow is a `useReducer` state machine. Data only lives in memory, so a URL per screen would just lead to empty screens on refresh.
- **No storage.** Nothing goes into localStorage, cookies or IndexedDB. The Excel/CSV file the user already has is the source of truth for their lists.
- **Sets, not loops.** Dedupe and list matching use `Set` lookups (O(n)). The legacy `includes()` approach took about 46 s at 100,000 addresses; a Set takes milliseconds.
- **Bounded regex.** The extraction regex caps every quantifier, so long text without an `@` can't trigger catastrophic backtracking (the legacy regex froze for 4.5 s on 40 KB).
- **50,000-email cap** with a clear refusal. It keeps the review screen and exports fast on any laptop. Benchmarks show the core handles far more, so the cap is a product choice.
- **Light mode only** for V1; Untitled UI's dark tokens exist but are never activated.
- **Lottie deferred.** The `Mascot` component is a static SVG cat with moods and a CSS bob (respects reduced motion). It can switch to dotLottie later without changing any screen.

See `docs/core.md` for every core function and `docs/screens.md` for every screen.
