// Tests for the Gmail rules: dots and +tags don't change the inbox at gmail.com / googlemail.com, but do everywhere else.
import { describe, expect, it } from "vitest";
import { findGmailGroups, gmailKey, mergeGmailGroups } from "./gmail";

describe("gmailKey", () => {
    it("ignores dots and +tags at gmail.com", () => {
        expect(gmailKey("j.doe+news@gmail.com")).toBe("jdoe@gmail.com");
        expect(gmailKey("j.d.o.e@gmail.com")).toBe("jdoe@gmail.com");
    });

    it("treats googlemail.com as gmail.com", () => {
        expect(gmailKey("j.doe@googlemail.com")).toBe("jdoe@gmail.com");
    });

    it("leaves other providers alone (dots matter there)", () => {
        expect(gmailKey("john.smith+x@company.example")).toBe("john.smith+x@company.example");
    });
});

describe("findGmailGroups", () => {
    it("groups different spellings of the same Gmail inbox", () => {
        const groups = findGmailGroups(["jdoe@gmail.com", "a@x.example", "j.doe+news@gmail.com", "j.d.o.e@googlemail.com", "solo@gmail.com"]);
        expect(groups).toEqual([{ key: "jdoe@gmail.com", addresses: ["jdoe@gmail.com", "j.doe+news@gmail.com", "j.d.o.e@googlemail.com"] }]);
    });

    it("returns nothing when there are no look-alikes", () => {
        expect(findGmailGroups(["a@gmail.com", "b@gmail.com"])).toEqual([]);
    });
});

describe("mergeGmailGroups", () => {
    it("keeps the first spelling of each inbox and reports how many were merged", () => {
        const result = mergeGmailGroups(["j.doe+news@gmail.com", "a@x.example", "jdoe@gmail.com", "j.d.o.e@gmail.com"]);
        expect(result.kept).toEqual(["j.doe+news@gmail.com", "a@x.example"]);
        expect(result.mergedCount).toBe(2);
    });
});
