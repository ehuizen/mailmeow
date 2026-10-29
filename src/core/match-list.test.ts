// Tests for check-against list matching: case-insensitive, and Gmail look-alikes count as the same person (safer for unsubscribes).
import { describe, expect, it } from "vitest";
import { buildMatchSet, isListed } from "./match-list";

describe("buildMatchSet + isListed", () => {
    const set = buildMatchSet(["JOHAN.VDM@Example.org", "jdoe@gmail.com", "unsub@list.example"]);

    it("matches regardless of case", () => {
        expect(isListed("johan.vdm@example.org", set)).toBe(true);
    });

    it("matches Gmail look-alikes in both directions", () => {
        expect(isListed("j.doe+news@gmail.com", set)).toBe(true);
        const reverse = buildMatchSet(["j.d.o.e+promo@googlemail.com"]);
        expect(isListed("jdoe@gmail.com", reverse)).toBe(true);
    });

    it("does not match different people", () => {
        expect(isListed("johan.v@example.org", set)).toBe(false);
        expect(isListed("unsub@list.example.com", set)).toBe(false);
    });

    it("trims whitespace from list entries", () => {
        expect(isListed("a@b.example", buildMatchSet(["  a@b.example \r"]))).toBe(true);
    });
});
