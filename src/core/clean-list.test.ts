// Tests for cleanList: the whole cleaning pipeline in one pure function, with a removal count per reason for the Review funnel.
import { describe, expect, it } from "vitest";
import { type CleanOptions, cleanList, DEFAULT_CLEAN_OPTIONS } from "./clean-list";
import { buildMatchSet } from "./match-list";

const found = [
    "a@acme.example",
    "info@acme.example",
    "a@acme.example",
    "jdoe@gmail.com",
    "j.doe+news@gmail.com",
    "unsub@list.example",
    "jo@competitor.example",
    "jo@mail.competitor.example",
    "keep@friends.example",
];

const options = (overrides: Partial<CleanOptions>): CleanOptions => ({ ...DEFAULT_CLEAN_OPTIONS, ...overrides });

describe("cleanList", () => {
    it("with defaults, only removes duplicates and role addresses", () => {
        const result = cleanList(found, DEFAULT_CLEAN_OPTIONS);
        expect(result.removed).toEqual({ duplicates: 1, gmailMerged: 0, listed: 0, blocked: 0, role: 1, manual: 0 });
        expect(result.kept).not.toContain("info@acme.example");
        expect(result.kept.filter((e) => e === "a@acme.example")).toHaveLength(1);
    });

    it("applies every step and counts each removal once, under the first reason that applies", () => {
        const result = cleanList(
            found,
            options({
                mergeGmail: true,
                listSet: buildMatchSet(["unsub@list.example", "a@acme.example"]),
                blocks: [{ kind: "domain", domain: "competitor.example", includeSubdomains: true }],
                manuallyRemoved: new Set(["keep@friends.example"]),
            }),
        );
        expect(result.kept).toEqual(["jdoe@gmail.com"]);
        expect(result.removed).toEqual({ duplicates: 1, gmailMerged: 1, listed: 2, blocked: 2, role: 1, manual: 1 });
        expect(result.removedTotal).toBe(found.length - 1);
    });

    it("keeps duplicates when the user chooses to", () => {
        const result = cleanList(found, options({ removeDuplicates: false, removeRoleAddresses: false }));
        expect(result.kept).toEqual(found);
        expect(result.removedTotal).toBe(0);
    });

    it("handles an empty list", () => {
        expect(cleanList([], DEFAULT_CLEAN_OPTIONS).kept).toEqual([]);
    });

    it("cleans 50,000 addresses quickly", () => {
        const emails = Array.from({ length: 50_000 }, (_, i) => `user${i % 40_000}@domain${i % 500}.example`);
        const listSet = buildMatchSet(Array.from({ length: 10_000 }, (_, i) => `user${i * 3}@domain${(i * 3) % 500}.example`));
        const started = performance.now();
        const result = cleanList(emails, options({ mergeGmail: true, listSet, blocks: [{ kind: "domain", domain: "domain7.example", includeSubdomains: true }] }));
        expect(performance.now() - started).toBeLessThan(1000);
        expect(result.kept.length).toBeGreaterThan(0);
    });
});
