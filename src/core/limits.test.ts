// Tests for the size and count limits that keep MailMeow fast on any laptop.
import { describe, expect, it } from "vitest";
import { checkFile, isExcelFile, MAX_EMAILS } from "./limits";

const MB = 1024 * 1024;

describe("limits", () => {
    it("caps a run at 50,000 emails", () => {
        expect(MAX_EMAILS).toBe(50_000);
    });

    it("recognises Excel files by extension", () => {
        expect(isExcelFile("Contacts.XLSX")).toBe(true);
        expect(isExcelFile("old.xls")).toBe(true);
        expect(isExcelFile("data.csv")).toBe(false);
    });

    it.each([
        [{ name: "list.csv", size: 2 * MB }, "ok"],
        [{ name: "list.csv", size: 30 * MB }, "warn"],
        [{ name: "list.csv", size: 120 * MB }, "too-big"],
        [{ name: "list.xlsx", size: 12 * MB }, "warn"],
        [{ name: "list.xlsx", size: 31 * MB }, "too-big"],
        [{ name: "photo.png", size: 1 * MB }, "unsupported"],
        [{ name: "scan.pdf", size: 1 * MB }, "unsupported"],
        [{ name: "export.TXT", size: 10 }, "ok"],
    ])("rates %j as %s", (file, verdict) => {
        expect(checkFile(file)).toBe(verdict);
    });
});
