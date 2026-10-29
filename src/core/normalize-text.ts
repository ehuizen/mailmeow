// Cleans pasted text before extraction: removes invisible characters and odd spaces that Excel, Outlook and web pages smuggle in.

/** Zero-width space/non-joiner/joiner, word joiner, byte-order mark and soft hyphen. Invisible, but they split addresses. */
const INVISIBLE_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;

/** Non-breaking, figure and narrow non-breaking spaces. They look like spaces but aren't matched as separators everywhere. */
const UNUSUAL_SPACES = /[\u00A0\u2007\u202F]/g;

/**
 * Normalises text so that two addresses that *look* identical also *compare* identical.
 *
 * What: composes Unicode to NFC, deletes invisible characters and turns unusual spaces into normal spaces.
 *
 * Why: `jo@acme.example` and `jo@acme.example` with a zero-width space inside look the same but are different strings.
 * Without this step dedupe would keep both, and, worse, an unsubscribed person could fail to match the unsubscribe list.
 * It's one linear pass, so it's cheap even for large files.
 *
 * @param text Raw pasted or file text.
 * @returns The same text, safe to extract from.
 * @example normalizeText("jo\u200B@acme.example") // "jo@acme.example"
 */
export function normalizeText(text: string): string {
    return text.normalize("NFC").replace(INVISIBLE_CHARACTERS, "").replace(UNUSUAL_SPACES, " ");
}
