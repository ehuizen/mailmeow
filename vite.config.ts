// Vite build + Vitest config for MailMeow: React, Tailwind v4, the "@" alias, Pages base path and a production-only CSP.
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Content-Security-Policy for production builds.
 *
 * Why: MailMeow promises "nothing leaves your browser". This policy makes the browser itself enforce it:
 * `connect-src 'self'` blocks any network request to another origin, even if a dependency tried to send data.
 * It's only injected at build time because Vite's dev server relies on inline scripts for hot reload.
 */
const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "worker-src 'self' blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
].join("; ");

/** Adds the CSP `<meta>` tag to index.html during `vite build` only. */
function contentSecurityPolicy(): Plugin {
    return {
        name: "mailmeow-csp",
        apply: "build",
        transformIndexHtml: (html) => html.replace("<head>", `<head>\n        <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`),
    };
}

export default defineConfig({
    // GitHub Pages serves the site from /<repo>/; the deploy workflow sets BASE_PATH. Locally it's "/".
    base: process.env.BASE_PATH ?? "/",
    plugins: [react(), tailwindcss(), contentSecurityPolicy()],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
        },
    },
    worker: {
        format: "es",
    },
    test: {
        // Pure logic runs in plain Node (fast). UI test files opt in to a fake browser with `// @vitest-environment jsdom`.
        environment: "node",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
    },
});
