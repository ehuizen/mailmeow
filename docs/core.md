# Core functions (`src/core/`)

Pure TypeScript with no React and no browser APIs. Every function here was written **test-first**; tests sit next to the code (`*.test.ts`).
Why keep it pure: it's the part that must be correct, it's the easiest part to test, and a future public API (V2) can reuse it unchanged.

The flow through these functions:

```
text ─► normalizeText ─► extractEmails ─► found[] ─► cleanList(found, options) ─► kept[] ─► toCsv / toPlainText
                                                       ├─ dedupe
                                                       ├─ mergeGmailGroups      (opt-in)
                                                       ├─ isListed              (check-against list)
                                                       ├─ createBlocker         (domains / people)
                                                       └─ isRoleAddress         (info@, noreply@…)
```

---

## `normalizeText(text)` · `normalize-text.ts`
**What:** NFC-composes Unicode, deletes invisible characters (zero-width space/joiners, word joiner, BOM, soft hyphen) and turns non-breaking/figure spaces into normal spaces.
**Why:** text copied from Excel, Outlook or web pages often carries invisible characters. An address with one hidden inside looks identical but is a different string, so dedupe would miss it and, worse, an unsubscribed person could slip past the unsubscribe list.
**Edge cases:** leaves ordinary text, tabs and newlines untouched.
**Tests:** `normalize-text.test.ts`.

## `extractEmails(text)` · `extract-emails.ts`
**What:** returns `{ emails, skipped, skippedCount }`.
- `emails`: every valid address, lowercased, in order, **duplicates included**.
- `skipped`: up to 500 examples of things that looked like addresses but aren't, each with a reason code:
  - `missing-name`, `missing-domain`, `too-many-at`
  - `invalid-name`, `no-dot-in-domain`, `file-name`, `invalid-domain`

**Why match in the text instead of splitting on spaces:** the legacy app split on spaces, which glued addresses to neighbours (`merwe|johan@…|021`) and stripped apostrophes. Matching directly finds addresses inside pipes, brackets, quotes, `mailto:` links, JSON and `to=` pairs.

**Why the regex is bounded:**
- **Every quantifier has a cap:** the local part is ≤ 64 characters, each label ≤ 63, at most 8 labels, and the TLD is 2–24 letters.
- **A lookbehind stops a match from starting mid-token.** That makes matching linear-time. The legacy regex took 4.5 s on 40 KB without an `@`; this one takes milliseconds.
- **It also stops truncation.** A 70-character local part is rejected instead of being cut down to a valid-looking tail.

**Why the skipped list uses a manual scan:** the obvious regex `[^\s]*@[^\s]*` is quadratic as well. It took 1.7 s on a 48 KB token, which the performance test caught during the build. The scan only starts from real `@` characters.

**Edge cases:**
- **Accepted:** apostrophes (`ben.o'connor@`), `+tags`, multi-part TLDs (`.co.uk`) and long TLDs (`.africa`).
- **Rejected:**
  - a double dot in the domain, or a dot just before the `@`
  - no dot in the domain (`asdf@asdf`)
  - numeric domains
  - file names like `logo@2x.png`
- **Punctuation:** trailing sentence punctuation is dropped, and a lone `@` in prose ("10 units @ R450") is ignored.
- **Not supported (agreed on the board):** Unicode/IDN domains.

**Tests:** `extract-emails.test.ts`. The golden fixture `test/fixtures/crm_export_dump.txt` must give 33 unique addresses. Two performance tests cover long runs with no `@`.

## `dedupe(emails)` · `dedupe.ts`
**What:** returns `{ unique, duplicateCount, repeated }`. `unique` keeps the first copy in first-seen order; `repeated` lists addresses with 2+ copies, most first (examples for the "Hang on, N duplicates!" screen).
**Why a Map:** one pass with constant-time lookups. 50,000 addresses take a few milliseconds; the legacy `filter`+`indexOf` approach was O(n²), about 19 s at 100,000.
**Edge cases:** case-insensitive because extraction already lowercases; an empty list returns empty results.
**Tests:** `dedupe.test.ts` (includes a 50k benchmark).

## `gmailKey`, `findGmailGroups`, `mergeGmailGroups` · `gmail.ts`
**What:**
- `gmailKey` returns the canonical Gmail inbox: dots removed, `+tag` removed, `googlemail.com` → `gmail.com`. Other domains are returned unchanged.
- `findGmailGroups` lists spellings that share one inbox.
- `mergeGmailGroups` keeps the first spelling of each inbox.

**Why only Gmail:** at most other providers and company domains dots *do* matter (`john.smith` and `johnsmith` can be different people).
**Why flag first:** the user may rely on `+tags`. The Found screen shows the groups and merges them only if the user ticks the box.

**Tests:** `gmail.test.ts`.

## `buildMatchSet`, `isListed` · `match-list.ts`
**What:** builds a Set from the user's list (unsubscribes, bounces, contacts) holding both each address and its Gmail key, then tests addresses against it.
**Why Gmail-style matching here, always:** for unsubscribes, over-removing is the safe side. Emailing someone who opted out is a legal risk (POPIA / GDPR).
**Why a Set:** the legacy `includes()` loop was O(n·m), about 46 s at 100,000; a Set lookup is constant-time.
**Edge cases:** entries are trimmed and lowercased; blank lines are ignored.
**Tests:** `match-list.test.ts`.

## `parseBlockEntry`, `isPublicSuffix`, `createBlocker`, `isBlocked`, `countDomainMatches`, `domainOf` · `block.ts`

**`parseBlockEntry`** reads what the user types:
- **Domains:** `acme.example`, `@acme.example`, or a pasted URL.
- **People:** a full address.
- **Refused:** empty input, invalid input, and public suffixes (`com`, `co.za`).

**`createBlocker`** turns entries into Sets once, so each address check is a few lookups. With subdomains on, it walks up the address's own domain (at most 8 steps).

**`countDomainMatches`** gives the live "3 exact · +12 with subdomains" preview.

**Why ask about subdomains per domain:** `mail.acme.example` usually belongs to Acme, but not always. The user decides with the numbers in front of them.

**Why a curated suffix list:** the full Public Suffix List is a dependency of about 230 KB. This guard only needs to stop obvious mistakes, like blocking every South African company.

**Edge cases:** look-alike domains (`notacme.example`, `acme.example.com`) are never blocked.

**Tests:** `block.test.ts`.

## `isRoleAddress` · `role-addresses.ts`
**What:** true for shared inboxes such as `info@`, `noreply@`, `support@`, `accounts@`… (exact local-part match; `+tag` ignored).
**Why:** nobody personally reads most role inboxes; they bounce or auto-reply and hurt engagement. Removed by default (agreed on the board); one toggle turns it off.
**Edge cases:** real people like `sales.jo@` or `information.desk.manager@` are *not* matched.
**Tests:** `role-addresses.test.ts`.

## `cleanList(found, options)` · `clean-list.ts`
**What:** the whole pipeline in one pure function. It runs these steps in order:
1. duplicates
2. Gmail look-alikes
3. the check-against list
4. blocked domains and people
5. role addresses
6. manual removals

It returns `{ kept, removed, removedTotal }`, where `removed` has one count per reason. Each address is counted once, under the first step that removed it.

**Why recompute from the original list every time:** screens never mutate data; they only change `options`. So Back, Skip and changing your mind always give correct results, and the Review funnel always adds up.
Every step is a Set lookup, so 50,000 addresses take milliseconds.

**Tests:** `clean-list.test.ts`, which covers each step, ordering, keeping duplicates, and a 50k benchmark under 1 s. Timing budgets are deliberately loose (a quadratic regression takes seconds, so they still catch it) so they don't flake on busy machines or CI.

## `MAX_EMAILS`, `checkFile`, `isExcelFile`, `extensionOf`, `ACCEPT_ATTRIBUTE` · `limits.ts`
**What:**
- `MAX_EMAILS = 50,000` per run (above it, the app refuses).
- `checkFile` rates a file `ok`, `warn`, `too-big` or `unsupported` from its name and size alone:

  | | Warn above | Refuse above |
  |---|---|---|
  | Text files | 25 MB | 100 MB |
  | Excel files | 10 MB | 30 MB |

**Why check before reading:** reading a 300 MB file just to refuse it would freeze the tab.
**Why Excel's limits are lower:** `.xlsx` is zipped XML that expands 5–10× when parsed.
**Why 50,000:** the core copes with far more, but this keeps review, export and slower laptops comfortable. It's a product decision, not a technical limit.

**Tests:** `limits.test.ts`.

## `toCsv`, `toPlainText` · `to-csv.ts`
**What:** one-column CSV with an `email` header and CRLF line endings, or one address per line.
**Why the formula guard:** cells starting with `=`, `+`, `-` or `@` can run as formulas in Excel ("CSV injection"). Addresses can legally start with `+` or `-`, so those cells get a leading apostrophe.
**Tests:** `to-csv.test.ts`.
