// Tests for extractEmails: what counts as an address, what's skipped (and why), and that hostile input can't freeze the page.
import { describe, expect, it } from "vitest";
import fixture from "../../test/fixtures/crm_export_dump.txt?raw";
import { extractEmails } from "./extract-emails";

const emailsIn = (text: string) => extractEmails(text).emails;

describe("extractEmails", () => {
    it("finds the 33 unique addresses in the golden CRM fixture", () => {
        const unique = new Set(emailsIn(fixture));
        expect(unique.size).toBe(33);
        expect(unique).toContain("ben.o'connor@example.co.za");
        expect(unique).toContain("lindiwe.k@events.example.africa");
        expect(unique).toContain("first.last-tag_01@a-b.example.co.uk");
        expect(unique).toContain("nomvula.dlamini@ops.example.com");
        expect(unique).not.toContain("logo@2x.png");
    });

    it.each([
        ["thandi.mokoena@example.com", "plain"],
        ["priya+newsletter@example.net", "+tag"],
        ["ben.o'connor@example.co.za", "apostrophe"],
        ["o'reilly-team@example.com", "apostrophe + hyphen"],
        ["first.last-tag_01@a-b.example.co.uk", "underscore, hyphenated domain, multi-part TLD"],
        ["lindiwe.k@events.example.africa", "long TLD"],
        ["x@y.example", "shortest sensible"],
    ])("accepts %s (%s)", (email) => {
        expect(emailsIn(`before ${email} after`)).toEqual([email]);
    });

    it.each([
        ["user@example..com", "double dot in domain"],
        ["user.@example.com", "dot right before @"],
        [".user@example.com", "dot at the start"],
        ["name@localhost", "no dot in domain"],
        ["asdf@asdf", "no dot in domain"],
        ["someone@", "nothing after @"],
        ["@example.com", "nothing before @"],
        ["logo@2x.png", "image file name"],
        ["icon@3x.svg", "image file name"],
        ["user@1.2.3.4-not-an-email", "numeric domain"],
    ])("rejects %s (%s)", (candidate) => {
        expect(emailsIn(`see ${candidate} here`)).toEqual([]);
    });

    it("finds addresses wrapped in punctuation, markup and key=value pairs", () => {
        const text = '(grace.h@example.org) "hello@grace-studio.example" <thandi@example.com> to=priya@example.net,b@c.example;d@e.example mailto:n@ops.example.com?subject=Hi |p@q.example|';
        expect(emailsIn(text)).toEqual(["grace.h@example.org", "hello@grace-studio.example", "thandi@example.com", "priya@example.net", "b@c.example", "d@e.example", "n@ops.example.com", "p@q.example"]);
    });

    it("drops trailing sentence punctuation", () => {
        expect(emailsIn("email me at chris@example.com. Or chris.backup@example.com, whichever!")).toEqual(["chris@example.com", "chris.backup@example.com"]);
    });

    it("lowercases every address and keeps duplicates in their original order", () => {
        expect(emailsIn("CHRIS@EXAMPLE.COM a@b.example Chris@Example.com")).toEqual(["chris@example.com", "a@b.example", "chris@example.com"]);
    });

    it("ignores invisible characters pasted inside an address", () => {
        expect(emailsIn("jo\u200B@acme.example")).toEqual(["jo@acme.example"]);
    });

    it("does not cut a too-long local part down to a valid-looking tail", () => {
        const local = "a".repeat(70);
        expect(emailsIn(`${local}@example.com`)).toEqual([]);
    });

    it("stays fast on a long run with no @ (no catastrophic backtracking)", () => {
        const hex = "a1b2c3d4e5f6".repeat(4000); // 48 KB, the kind of token that froze the legacy app for 4.5 s
        const started = performance.now();
        expect(emailsIn(hex)).toEqual([]);
        expect(performance.now() - started).toBeLessThan(50);
    });

    it("stays fast on a long dotted run with no @", () => {
        const dotted = "ab.".repeat(15000);
        const started = performance.now();
        extractEmails(dotted);
        expect(performance.now() - started).toBeLessThan(50);
    });

    describe("skipped candidates", () => {
        it("explains why things that look like emails were skipped", () => {
            const { skipped } = extractEmails("asdf@asdf user@example..com logo@2x.png someone@ @handle");
            expect(skipped.map((s) => [s.text, s.reason])).toEqual([
                ["asdf@asdf", "no-dot-in-domain"],
                ["user@example..com", "invalid-domain"],
                ["logo@2x.png", "file-name"],
                ["someone@", "missing-domain"],
                ["@handle", "missing-name"],
            ]);
        });

        it("does not count text around a valid address as skipped", () => {
            expect(extractEmails("mailto:n@ops.example.com?subject=Hi to=priya@example.net").skipped).toEqual([]);
        });

        it("ignores a lone @ used as 'at' in prose", () => {
            expect(extractEmails("10 units @ R450 each, ETA 2 weeks @ warehouse.").skipped).toEqual([]);
        });
    });
});
