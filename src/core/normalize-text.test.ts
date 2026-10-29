// Tests for normalizeText: invisible characters and odd spaces pasted from Excel/Outlook must not split or disguise addresses.
import { describe, expect, it } from "vitest";
import { normalizeText } from "./normalize-text";

describe("normalizeText", () => {
    it("removes zero-width characters, word joiners, soft hyphens and the BOM", () => {
        expect(normalizeText("\uFEFFjo\u200B@acme\u200C.\u200Dexample\u2060\u00AD")).toBe("jo@acme.example");
    });

    it("turns non-breaking and figure spaces into normal spaces", () => {
        expect(normalizeText("a@b.example\u00A0c@d.example\u202Fe@f.example\u2007")).toBe("a@b.example c@d.example e@f.example ");
    });

    it("composes Unicode to NFC so visually identical text compares equal", () => {
        expect(normalizeText("cafe\u0301")).toBe("café");
    });

    it("leaves ordinary text untouched", () => {
        const text = "Hello jo@acme.example, see you!\nLine two\ttab";
        expect(normalizeText(text)).toBe(text);
    });
});
