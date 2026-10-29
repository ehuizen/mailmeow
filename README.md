# MailMeow 🐱

**Paste anything. Get a clean email list.**

MailMeow pulls every email address out of messy text or files (CRM exports, CSV, Excel, HTML, JSON, logs), then helps you clean the list step by step:

1. **Find**: every valid address, wherever it hides (pipes, brackets, `mailto:` links, JSON…).
2. **Remove duplicates**: case-insensitive. Gmail look-alikes (`j.doe+news@gmail.com` vs `jdoe@gmail.com`) are flagged for you to merge.
3. **Check against a list**: drop anyone on your unsubscribe or bounce list (Excel, CSV or pasted).
4. **Keep anyone off**: block whole domains (optionally with subdomains), specific people and role addresses like `info@`.
5. **Review and export**: search the result, then copy it or download CSV / Excel.

There's also a **Just remove duplicates** mode for quick jobs.

## Privacy

MailMeow runs **entirely in your browser**. Nothing you paste or upload is sent anywhere or saved: close the tab and it's gone.
The production build ships a Content-Security-Policy (`connect-src 'self'`), so the browser itself blocks any request to another site.

## Run it locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + component tests (Vitest)
npm run typecheck  # TypeScript, strict
npm run lint       # ESLint
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Deploy

Pushes to `main` deploy to GitHub Pages through `.github/workflows/deploy.yml`. One-time setup: **Settings → Pages → Source: GitHub Actions**.
Every push and pull request also runs typecheck, lint, tests and a build (`.github/workflows/ci.yml`).

## How it's built

React + Vite + TypeScript (strict), [Untitled UI React](https://www.untitledui.com/react) components (MIT) on Tailwind CSS v4, SheetJS for Excel, and Vitest + React Testing Library. Email logic lives in pure functions in `src/core/` and was written test-first. File parsing runs in a Web Worker so the UI never freezes.

- [Architecture](docs/architecture.md): how the pieces fit and why.
- [Core functions](docs/core.md): every email-handling function, with its edge cases and tests.
- [Screens](docs/screens.md): every screen, its states and why it exists.
- [Logbook](docs/logbook.md): how this was planned and built (process, decisions, research).
- [`legacy/`](legacy/): the original single-page tool this replaces.

## Credits

- UI components and icons: [Untitled UI React](https://github.com/untitleduico/react) (MIT).
- Excel parsing: [SheetJS Community Edition](https://sheetjs.com) (Apache-2.0).

## Licence

[MIT](LICENSE) © Eugene Esterhuizen
