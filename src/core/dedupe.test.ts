// Tests for dedupe: one copy of each address, first-seen order, and the most-repeated examples for the "Hang on" screen.
import { describe, expect, it } from "vitest";
import { dedupe } from "./dedupe";

describe("dedupe", () => {
    it("keeps the first copy of each address in its original order", () => {
        const result = dedupe(["b@x.example", "a@x.example", "b@x.example", "c@x.example", "a@x.example", "b@x.example"]);
        expect(result.unique).toEqual(["b@x.example", "a@x.example", "c@x.example"]);
        expect(result.duplicateCount).toBe(3);
    });

    it("lists repeated addresses, most copies first", () => {
        const result = dedupe(["a@x.example", "b@x.example", "b@x.example", "c@x.example", "b@x.example", "a@x.example"]);
        expect(result.repeated).toEqual([
            { email: "b@x.example", copies: 3 },
            { email: "a@x.example", copies: 2 },
        ]);
    });

    it("handles an empty list", () => {
        expect(dedupe([])).toEqual({ unique: [], duplicateCount: 0, repeated: [] });
    });

    it("dedupes 50,000 addresses quickly", () => {
        const emails = Array.from({ length: 50_000 }, (_, i) => `user${i % 35_000}@domain${i % 500}.example`);
        const started = performance.now();
        const result = dedupe(emails);
        expect(performance.now() - started).toBeLessThan(500);
        expect(result.unique).toHaveLength(35_000);
    });
});
