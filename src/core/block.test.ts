// Tests for keeping people off the list: parsing what the user types, blocking domains (optionally with subdomains) and single people.
import { describe, expect, it } from "vitest";
import { countDomainMatches, domainOf, isBlocked, isPublicSuffix, parseBlockEntry } from "./block";

describe("parseBlockEntry", () => {
    it.each([
        ["competitor.example", "competitor.example"],
        ["@Competitor.Example", "competitor.example"],
        ["  https://www.competitor.example/about ", "www.competitor.example"],
    ])("reads %s as the domain %s", (input, domain) => {
        expect(parseBlockEntry(input)).toEqual({ ok: true, entry: { kind: "domain", domain, includeSubdomains: false } });
    });

    it("reads a full address as a single person", () => {
        expect(parseBlockEntry("Old.Manager@acme.example")).toEqual({ ok: true, entry: { kind: "email", email: "old.manager@acme.example" } });
    });

    it.each([
        ["", "empty"],
        ["   ", "empty"],
        ["not a domain", "invalid"],
        ["acme", "public-suffix"],
        ["com", "public-suffix"],
        [".co.za", "public-suffix"],
        ["co.uk", "public-suffix"],
    ])("refuses %j (%s)", (input, error) => {
        expect(parseBlockEntry(input)).toEqual({ ok: false, error });
    });
});

describe("isPublicSuffix", () => {
    it("knows common public endings", () => {
        expect(isPublicSuffix("com")).toBe(true);
        expect(isPublicSuffix("co.za")).toBe(true);
        expect(isPublicSuffix("acme.co.za")).toBe(false);
    });
});

describe("domainOf", () => {
    it("returns the part after the last @", () => {
        expect(domainOf("a@b@mail.acme.example")).toBe("mail.acme.example");
    });
});

describe("isBlocked", () => {
    const exact = { kind: "domain", domain: "acme.example", includeSubdomains: false } as const;
    const withSubs = { kind: "domain", domain: "acme.example", includeSubdomains: true } as const;
    const person = { kind: "email", email: "boss@other.example" } as const;

    it("blocks the exact domain only by default", () => {
        expect(isBlocked("jo@acme.example", [exact])).toBe(true);
        expect(isBlocked("jo@mail.acme.example", [exact])).toBe(false);
    });

    it("blocks subdomains when asked", () => {
        expect(isBlocked("jo@mail.acme.example", [withSubs])).toBe(true);
        expect(isBlocked("jo@za.mail.acme.example", [withSubs])).toBe(true);
    });

    it("never blocks look-alike domains", () => {
        expect(isBlocked("jo@notacme.example", [withSubs])).toBe(false);
        expect(isBlocked("jo@acme.example.com", [withSubs])).toBe(false);
    });

    it("blocks a single person", () => {
        expect(isBlocked("boss@other.example", [person])).toBe(true);
        expect(isBlocked("staff@other.example", [person])).toBe(false);
    });
});

describe("countDomainMatches", () => {
    it("counts exact and subdomain matches separately for the live preview", () => {
        const emails = ["a@acme.example", "b@acme.example", "c@mail.acme.example", "d@za.acme.example", "e@other.example"];
        expect(countDomainMatches(emails, "acme.example")).toEqual({ exact: 2, subdomains: 2 });
    });
});
