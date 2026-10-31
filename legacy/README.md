# Legacy: the original "Extract Emails" page

This folder keeps the original single-page tool (2025) that MailMeow replaces, so the before/after is visible in the repo.

- `Extract Emails.html` holds the page and its inline script. Open it directly in a browser; there's no build step.
- `styles.css` and `file-earmark-text.svg` are its styling and icon.
- `bouncedEmails.js` was always empty.

What it did: you pasted text and it pulled out email addresses. "Remove duplicates" and "Remove bounces" then worked on that list.

**Known limitation, kept on purpose:** its extraction regex has unbounded quantifiers. On long text with no `@` it backtracks badly: a 40 KB token takes about 4.5 s and freezes the page.
MailMeow's `src/core/extract-emails.ts` fixes this with bounded quantifiers and a regression test.
