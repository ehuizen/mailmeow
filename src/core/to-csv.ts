// Turns the final list into CSV or plain text for download and copying.

/** Characters that make spreadsheet apps treat a cell as a formula. */
const FORMULA_START = /^[=+\-@]/;

/**
 * Formats one value as a safe CSV cell.
 * Why the formula guard: a cell starting with `=`, `+`, `-` or `@` can run as a formula when opened in Excel
 * ("CSV injection"). Addresses can legally start with `+` or `-`, so we prefix an apostrophe, which Excel hides.
 */
function csvCell(value: string): string {
    const safe = FORMULA_START.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * Builds a one-column CSV (header `email`) with Windows line endings, which Excel and most CRMs import cleanly.
 * @example toCsv(["a@b.example"]) // "email\r\na@b.example\r\n"
 */
export function toCsv(emails: readonly string[]): string {
    return ["email", ...emails.map(csvCell)].join("\r\n") + "\r\n";
}

/**
 * One address per line, the format most mail tools accept when pasting into To/BCC.
 * @example toPlainText(["a@b.example", "c@d.example"]) // "a@b.example\nc@d.example"
 */
export function toPlainText(emails: readonly string[]): string {
    return emails.join("\n");
}
