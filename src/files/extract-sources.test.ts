// Tests for extractFromSources and readFileAsText: text and Excel files, failures per file, progress and the 50,000 cap.
import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { extractFromSources } from "./extract-sources";
import { FileReadError, type ReadableFile, readFileAsText } from "./read-file";

/** A minimal stand-in for a browser File, so tests don't depend on jsdom's Blob support. */
function fakeFile(name: string, content: string | ArrayBuffer, size?: number): ReadableFile {
    const bytes = typeof content === "string" ? new TextEncoder().encode(content).buffer : content;
    return {
        name,
        size: size ?? bytes.byteLength,
        text: async () => (typeof content === "string" ? content : new TextDecoder().decode(content)),
        arrayBuffer: async () => bytes as ArrayBuffer,
    };
}

function workbookFile(name: string, sheets: Record<string, string[][]>): ReadableFile {
    const workbook = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
    return fakeFile(name, XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}

describe("readFileAsText", () => {
    it("reads every sheet and every column of an Excel file", async () => {
        const file = workbookFile("list.xlsx", {
            Bounces: [["Name", "Email", "Reason"], ["Johan", "JOHAN.VDM@exmaple.org", "550"]],
            Unsubscribes: [["Contact"], ["sipho@oldcompany.example"]],
        });
        const text = await readFileAsText(file);
        expect(text).toContain("JOHAN.VDM@exmaple.org");
        expect(text).toContain("sipho@oldcompany.example");
    });

    it("refuses unsupported and too-big files without reading them", async () => {
        const read = vi.fn();
        await expect(readFileAsText({ ...fakeFile("scan.pdf", "x"), text: read })).rejects.toMatchObject({ reason: "unsupported" });
        await expect(readFileAsText(fakeFile("huge.csv", "x", 200 * 1024 * 1024))).rejects.toMatchObject({ reason: "too-big" });
        expect(read).not.toHaveBeenCalled();
    });

    it("still reads a text file that was mislabelled as .xlsx (SheetJS falls back to text)", async () => {
        expect(await readFileAsText(fakeFile("renamed.xlsx", "jo@acme.example"))).toContain("jo@acme.example");
    });

    it("reports a corrupt Excel file as unreadable", async () => {
        // Starts like a zip (PK\x03\x04) but the rest is garbage, like a truncated download.
        const corrupt = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0xff, 0xff, 0x01, 0x02, 0x03, 0x04]).buffer;
        const error = await readFileAsText(fakeFile("broken.xlsx", corrupt)).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(FileReadError);
        expect((error as FileReadError).reason).toBe("unreadable");
    });
});

describe("extractFromSources", () => {
    it("combines pasted text and files, with a report per source", async () => {
        const summary = await extractFromSources([fakeFile("a.csv", "email\na@x.example\nb@x.example"), fakeFile("scan.pdf", "c@x.example")], "Pasted: c@x.example, a@x.example");
        expect(summary.emails).toEqual(["c@x.example", "a@x.example", "a@x.example", "b@x.example"]);
        expect(summary.sources).toEqual([
            { name: "Pasted text", kind: "pasted", status: "ok", emailCount: 2 },
            { name: "a.csv", kind: "file", status: "ok", emailCount: 2 },
            { name: "scan.pdf", kind: "file", status: "unsupported", emailCount: 0 },
        ]);
        expect(summary.overLimit).toBe(false);
    });

    it("reports progress for every source", async () => {
        const onProgress = vi.fn();
        await extractFromSources([fakeFile("a.txt", "a@x.example"), fakeFile("b.txt", "b@x.example")], "", onProgress);
        expect(onProgress).toHaveBeenLastCalledWith({ done: 2, total: 2, current: "b.txt" });
    });

    it("refuses more than 50,000 addresses but still reports how many were found", async () => {
        const big = Array.from({ length: 50_001 }, (_, i) => `u${i}@x.example`).join("\n");
        const summary = await extractFromSources([fakeFile("big.txt", big)], "");
        expect(summary.overLimit).toBe(true);
        expect(summary.totalFound).toBe(50_001);
        expect(summary.emails).toEqual([]);
    });
});
