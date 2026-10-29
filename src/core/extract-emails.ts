// Finds every email address in a block of text and explains anything that looked like an address but wasn't.
import { normalizeText } from "./normalize-text";

/** Characters that can start the part before the @ (no dot, no apostrophe). */
const LOCAL_START = "[A-Za-z0-9_%+-]";
/** Characters allowed later in the part before the @ (apostrophes are valid: ben.o'connor@…). */
const LOCAL_CHAR = "[A-Za-z0-9_%+'-]";
/** Characters that, if they come right before a match, mean we'd be starting in the middle of a longer token. */
const LOCAL_CONTINUATION = "[A-Za-z0-9._%+-]";
/** One domain label: letters/digits, hyphens inside, max 63 characters. */
const LABEL = "[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?";

/**
 * The address pattern. Every quantifier is bounded on purpose.
 *
 * Why bounded: the legacy app used unbounded `+`/`*`, which backtracks quadratically on long text without an `@`
 * (40 KB froze the page for 4.5 s). Here the part before @ is at most 64 characters, labels at most 63, at most 8 labels,
 * and the lookbehind stops a match from starting mid-token. So each position is tried a bounded number of times: linear time.
 * The lookbehind also means a 70-character local part is rejected instead of being silently cut to its last 64 characters.
 */
const EMAIL_PATTERN = `(?<!${LOCAL_CONTINUATION})${LOCAL_START}(?:${LOCAL_CHAR}|\\.(?!\\.)){0,63}(?<!\\.)@(?:${LABEL}\\.){1,8}[A-Za-z]{2,24}(?![A-Za-z0-9-])`;

/** "TLDs" that are really file extensions, e.g. logo@2x.png in HTML. No real email domain ends in these. */
const FILE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico", "tif", "tiff", "avif", "heic", "js", "css", "map"]);

/** Characters that end a candidate token around an @. */
const SEPARATOR = /[\s<>"'()[\]{},;|]/;

/** How many skipped examples to keep. Why: a huge log file could contain thousands; the UI only needs examples plus a count. */
const MAX_SKIPPED_EXAMPLES = 500;

/** Why a candidate was skipped. The UI turns these codes into friendly sentences. */
export type SkipReason = "missing-name" | "missing-domain" | "too-many-at" | "invalid-name" | "no-dot-in-domain" | "file-name" | "invalid-domain";

/** Something that looked like an address but isn't one. */
export interface SkippedCandidate {
    /** The text as found (trailing sentence punctuation removed). */
    text: string;
    reason: SkipReason;
}

/** Result of {@link extractEmails}. */
export interface ExtractionResult {
    /** Every valid address, lowercased, in the order found, duplicates included (dedupe is a separate, optional step). */
    emails: string[];
    /** Up to 500 examples of skipped candidates with a reason. */
    skipped: SkippedCandidate[];
    /** Total number of skipped candidates (can exceed `skipped.length`). */
    skippedCount: number;
}

const extensionOfDomain = (address: string) => address.slice(address.lastIndexOf(".") + 1).toLowerCase();

/** Returns the valid, non-file-name addresses in `text`, lowercased. Shared by extraction and by candidate checks. */
function findValidEmails(text: string): string[] {
    const found: string[] = [];
    // A fresh RegExp per call: global regexes carry `lastIndex` state, which would leak between calls.
    for (const match of text.matchAll(new RegExp(EMAIL_PATTERN, "g"))) {
        if (!FILE_EXTENSIONS.has(extensionOfDomain(match[0]))) found.push(match[0].toLowerCase());
    }
    return found;
}

/**
 * Yields every "token containing an @": the text between separators around each @.
 *
 * Why a manual scan instead of a regex like `[^\s]*@[^\s]*`: that regex is itself quadratic. On a long token without
 * an @ it scans to the end of the token from every start position. Here we only start from actual @ characters and
 * never revisit text, so the scan is linear (the tests check a 48 KB token).
 */
function* candidatesAroundAt(text: string): Generator<string> {
    let at = text.indexOf("@");
    while (at !== -1) {
        let start = at;
        while (start > 0 && !SEPARATOR.test(text[start - 1])) start--;
        let end = at + 1;
        while (end < text.length && !SEPARATOR.test(text[end])) end++;
        yield text.slice(start, end);
        at = text.indexOf("@", end); // continue after this token, so a@b@c is one candidate, not two
    }
}

/** Works out why a candidate containing @ is not a valid address. */
function explainSkip(candidate: string): SkipReason {
    const at = candidate.indexOf("@");
    const local = candidate.slice(0, at);
    const domain = candidate.slice(at + 1);
    if (!local) return "missing-name";
    if (!domain) return "missing-domain";
    if (domain.includes("@")) return "too-many-at";
    if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return "invalid-name";
    if (!domain.includes(".")) return "no-dot-in-domain";
    if (FILE_EXTENSIONS.has(extensionOfDomain(domain))) return "file-name";
    return "invalid-domain";
}

/**
 * Extracts every email address from text: pasted blobs, CSV, HTML, JSON or logs.
 *
 * What: normalises the text ({@link normalizeText}), finds addresses anywhere (inside pipes, brackets, quotes,
 * `mailto:` links, `to=` pairs…), lowercases them, and separately lists things that looked like addresses but aren't.
 *
 * Why this approach: the legacy app split on spaces and then tested each token, which glued addresses to neighbouring
 * characters (`merwe|johan@…|021`) and lost apostrophes. Matching directly in the text avoids both problems.
 * Duplicates are kept so the Found screen can say how many there were; removing them is the user's choice.
 *
 * @param text Any text.
 * @returns Valid addresses (lowercased, in order, with duplicates) plus skipped candidates with reasons.
 * @example extractEmails("Mail (Jo@Acme.example) or asdf@asdf").emails // ["jo@acme.example"]
 */
export function extractEmails(text: string): ExtractionResult {
    const clean = normalizeText(text);
    const emails = findValidEmails(clean);

    const skipped: SkippedCandidate[] = [];
    let skippedCount = 0;
    for (const token of candidatesAroundAt(clean)) {
        const candidate = token.replace(/[.:!?]+$/, "");
        // A lone "@" is prose ("10 units @ R450"), and a candidate that contains a valid address was already counted.
        if (candidate === "@" || findValidEmails(candidate).length > 0) continue;
        skippedCount++;
        if (skipped.length < MAX_SKIPPED_EXAMPLES) skipped.push({ text: candidate, reason: explainSkip(candidate) });
    }

    return { emails, skipped, skippedCount };
}
