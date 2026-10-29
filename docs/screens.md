# Screens (`src/screens/`)

One entry per screen: what it does, why it exists, its states, and the components it uses.

## How screens work

- `App.tsx` holds one `useReducer(flowReducer)` and renders the screen named by `state.screen`.
- Each screen gets `state`, `dispatch` and `result` (the `cleanList` output, see `screens/types.ts`). Screens **only show state and dispatch actions**; they contain no email logic.
- Every screen is wrapped in `ScreenLayout`:
  - header with progress steps and the privacy badge
  - a centred content column
  - a sticky action bar with Back and the screen's actions

  On every screen change, focus moves to the screen's single `<h1>` and the tab title updates, so screen reader and keyboard users know the screen changed.
- Navigation rules live in one place: `previousScreen()` in `app/flow-reducer.ts`.

```
Welcome ─┬─ Clean a list ───────► Add ─► Processing ─┬─► Found ─► Check list ─┬─► Keep off ─► Review ─► Export ─► (Start over)
         │                                           │                          └── Skip to export ──────────────► Export
         └─ Just remove duplicates ► Add ─► Processing ─► Found ─────────────────────────────────────────────────► Export
                                                       ├─► Nothing found ─► Add
                                                       └─► (over 50,000) Add + dialog
```

---

## Welcome · `Welcome.tsx`
**What:**
- A hero ("Paste anything. Get a clean email list.") with the idle cat.
- Two entry points: **Clean a list** (full flow) and **Just remove duplicates**.
- A three-step "how it works" and the privacy promise.

**Why:** most visits are either a full clean-up or a quick dedupe, so the shortcut skips the screens that don't apply. The privacy line is here because trust comes before pasting customer data.

**States:** none (static).

**Components:** `Mascot`, Untitled `BadgeWithIcon`, `Button`, `FeaturedIcon`.

## Add emails · `AddEmails.tsx`
**What:**
- A paste box, a drag-and-drop zone, and a list of added files, each with an instant verdict:

  | Verdict | Message |
  |---|---|
  | Ready | — |
  | Large file | "this may take a moment" |
  | Too big | — |
  | Unsupported | "Save it as CSV or TXT" |

- A live "N emails spotted in your pasted text" badge.
- **Find emails** is disabled until there's something usable.

**Why:**
- **Files are judged by name and size immediately,** so people learn "PDFs can't be read" before waiting. Files themselves are read later, in the worker.
- **The live count uses `useDeferredValue`,** so typing stays smooth.

**States:**
- empty
- files with warnings or errors
- **over the 50,000 limit:** a modal dialog explains the limit and suggests splitting the file
- **extraction error:** an alert callout

**Components:** `PageHeading` (mood *sniffing*), Untitled `TextArea`, `Dropzone`, `FileChip`, Untitled `Modal`/`Dialog`, `Callout`.

## Processing · `Processing.tsx`
**What:**
- Runs `runExtraction` (Web Worker) as soon as it mounts.
- Shows the searching cat, a progress bar and the file being read.
- **Cancel** terminates the worker and returns to Add.

**Why:**
- **Work starts in an effect,** not the reducer, because reducers must stay pure. Tying it to this screen means leaving the screen always stops the work.
- **It shows for at least 3 s** (agreed on the board), so fast results don't flash past.

**States:** reading, cancelled (→ Add), failed (→ Add with an error).

**Components:** `Mascot` (mood *searching*), Untitled `ProgressBar`, `Button`.

## Found & duplicates · `Found.tsx`
**What:**
- "We found N emails" with stats: found, duplicates, skipped.
- "Hang on, N duplicates!" with the most-copied examples.
- Gmail look-alikes flagged, with an opt-in "Also merge these" checkbox.
- Files that couldn't be read, and a "See why N items were skipped" disclosure with plain-language reasons.

**Why:**
- **Removing duplicates is a decision:** "Remove duplicates" is primary, "Keep duplicates" is offered.
- **Gmail merging is opt-in,** because those addresses are probably, not certainly, the same person.

**States:**
- **No duplicates:** "Nice and tidy" and a Continue button.
- **Duplicates-only mode:** a badge, and the button becomes "Remove duplicates & export".
- **Some files unreadable:** an error callout.

**Components:** `PageHeading` (mood *detective*), `StatCard`, `Card`, `Callout`, Untitled `Badge`, `Checkbox`.

## Nothing found · `NothingFound.tsx`
**What:** a confused cat, "Hmm, no emails in there", the files that failed, tips to try, and **Back to add emails**.

**Why:** zero results usually means the wrong or an unreadable file, so the useful content is what to try next.

**Components:** `Mascot` (mood *confused*), `Button`.

## Check against a list · `CheckList.tsx`
**What:**
- Pick the kind of list (toggle buttons with `aria-pressed`).
- Upload Excel/CSV/TXT (any column, every sheet) or paste emails.
- The list is read by the same worker.
- A live result: "N of your emails are on this list and will be removed".

**Why:** removing unsubscribes and bounces protects sender reputation and is a legal duty (POPIA / GDPR). Matching ignores case and Gmail dots/+tags, because over-removing is the safe side here.

**States:**
- no list
- reading
- list loaded, with or without matches
- **errors:** unreadable list, empty list, over the limit

**Actions:** **Skip to export**, **Skip**, **Remove N & continue**.

**Components:** `PageHeading` (mood *clipboard*), `Dropzone`, Untitled `TextArea`, `FileChip`, `Callout`.

## Keep anyone off · `KeepOff.tsx`
**What:**
- Add a domain (`competitor.example`, `@x`, or a pasted URL) or an email. Each entry shows how many emails it removes.
- Domains that have subdomains get an "Also remove subdomains (+N more)" checkbox.
- A "Remove role addresses" toggle (on by default, with its count).
- A summary callout.

**Why:**
- **Show the impact before deciding.** Blocking ends up in the export, so people should see the numbers first.
- **Public endings like `.co.za` are refused,** so nobody wipes out a whole country by accident.

**States:**
- empty
- entries
- **invalid entry:** an inline error explaining why
- **nothing to remove:** the button becomes "Continue to review"

**Actions:** **Skip** clears blocks and the role default; **Remove N & review**.

**Components:** `PageHeading` (mood *bouncer*), Untitled `Input`, `Button`, `Checkbox`, `Toggle`, `Badge`, `Callout`.

## Review · `Review.tsx`
**What:**
- A funnel: found → − duplicates → − Gmail look-alikes → − on your list → − kept off → − removed by you → = clean.
- A searchable table showing 100 rows at a time ("Show more"), with a remove button per row.
- An "Removed by you" list with Undo.

**Why:**
- **Search runs over the in-memory array,** so it covers all 50,000 addresses.
- **Paging instead of a virtualisation library** means no extra dependency.
- **Manual removals are stored as options, not deletions,** so they can be undone.

**States:**
- normal
- search with or without matches
- **everything removed:** a warning callout, and export is disabled

**Components:** `PageHeading` (mood *approving*), Untitled `Badge`, `Input`, `Button`, `Card`, `Callout`, `useAnnounce`.

## Export · `Export.tsx`
**What:**
- A celebrating cat with "All clean! N emails ready." and a sentence on what was removed.
- Three options: **Copy** (primary), **Download .csv**, **Download .xlsx**.
- A copy confirmation (also announced to screen readers).
- **Start over** clears everything from memory.

**Why:** people either paste into a mail tool or import into a CRM, so copy is primary because it's fastest. Everything happens locally through the clipboard or object URLs.

**States:** copied, copy blocked (suggests downloading), Excel being generated (loading button).

**Components:** `Mascot` (mood *celebrate*), `FeaturedIcon`, `Button`, `Callout`, `useAnnounce`.

---

## Shared components (`src/components/`)

| Component | What | Why |
|---|---|---|
| `ScreenLayout` | Header, content column, sticky action bar; focuses the `<h1>` and sets the tab title on screen change | Consistent layout, plus screen-change announcements for assistive tech |
| `AppHeader` | Logo, `ProgressSteps`, "Nothing leaves your browser" badge | The privacy promise stays visible on every screen |
| `ProgressSteps` | Add · Find · Clean · Review · Export as an ordered list with `aria-current="step"` | Progress isn't conveyed by colour alone |
| `PageHeading` | Mascot + `<h1>` + subtitle (+ optional badge) | Exactly one h1 per screen |
| `Mascot` | SVG cat with 9 moods; CSS bob that stops for `prefers-reduced-motion`; `aria-hidden` | Placeholder until dotLottie animations exist; the single place to swap in Lottie |
| `Announcer` (`AnnouncerProvider`, `useAnnounce`) | One polite live region for short messages | Visual confirmations ("Copied!") reach screen readers too |
| `Dropzone` | React Aria `DropZone` + `FileTrigger` | Works with mouse, keyboard and screen readers |
| `FileChip` | One file row with status and a named remove button | Clear per-file feedback; accessible icon button |
| `Card`, `StatCard`, `Callout` | Panels, big-number stats, tinted messages with icons | Meaning carried by icon and words, not just colour |

Untitled UI base components (`src/components/base`, `application`, `foundations`) are used as generated (MIT) and wrapped rather than edited.

## Tests

- `src/app/flow-reducer.test.ts` covers navigation, skips, the duplicates-only rules, the limit, removals and start over.
- `src/app/App.test.tsx` drives the real UI in jsdom:
  - the whole clean-up flow, including the public-suffix error
  - duplicates-only mode
  - nothing found
  - the 50,000 dialog
  - the disabled Find button
- **Manual browser check:** headless Chrome driving the production build (`vite preview`) through every screen, with a real `.xlsx` list. All counts were correct, with 0 external network requests and 0 console errors or CSP violations.
