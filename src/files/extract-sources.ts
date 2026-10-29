// The work the extraction worker does, as a plain async function: read every source, extract addresses, report per source.
import { extractEmails, type SkippedCandidate } from "@/core/extract-emails";
import { MAX_EMAILS } from "@/core/limits";
import { FileReadError, type ReadableFile, readFileAsText } from "./read-file";

/** What happened to one input (a file or the pasted text). */
export interface SourceReport {
    name: string;
    kind: "file" | "pasted";
    status: "ok" | "unsupported" | "too-big" | "unreadable";
    /** Addresses found in this source (duplicates included). */
    emailCount: number;
}

/** Everything the UI needs after extraction. */
export interface ExtractionSummary {
    /** All addresses from all sources, lowercased, in order, duplicates included. Empty when `overLimit` is true. */
    emails: string[];
    /** Total addresses found (kept even when `emails` is emptied for being over the limit). */
    totalFound: number;
    /** More than `MAX_EMAILS` addresses: the UI refuses and shows the limit dialog. */
    overLimit: boolean;
    /** Up to 500 skipped look-alikes across all sources. */
    skipped: SkippedCandidate[];
    skippedCount: number;
    sources: SourceReport[];
}

/** Progress callback: `done` of `total` sources finished; `current` is the name being read. */
export type ProgressHandler = (progress: { done: number; total: number; current: string }) => void;

const MAX_SKIPPED_EXAMPLES = 500;

/**
 * Reads each file and the pasted text, extracts addresses from each, and combines the results.
 *
 * Why it lives outside the worker file: this is the testable logic. `extract.worker.ts` is only a thin message
 * wrapper, and `run-extraction.ts` can call this directly where Web Workers aren't available (tests).
 * Why one failing file doesn't stop the rest: the user gets results from everything readable, plus a clear note
 * for the file that failed (the "Can't read a file" state).
 * Why drop the list when over the limit: there's no point holding 200,000 strings in memory just to refuse them.
 *
 * @param files Uploaded files (browser `File`s).
 * @param pastedText Text from the paste box ("" if none).
 * @param onProgress Called after each source.
 */
export async function extractFromSources(files: readonly ReadableFile[], pastedText: string, onProgress?: ProgressHandler): Promise<ExtractionSummary> {
    const sources: SourceReport[] = [];
    const emails: string[] = [];
    const skipped: SkippedCandidate[] = [];
    let skippedCount = 0;
    const total = files.length + (pastedText.trim() ? 1 : 0);
    let done = 0;

    const collect = (text: string) => {
        const result = extractEmails(text);
        for (const email of result.emails) emails.push(email);
        for (const item of result.skipped) if (skipped.length < MAX_SKIPPED_EXAMPLES) skipped.push(item);
        skippedCount += result.skippedCount;
        return result.emails.length;
    };

    if (pastedText.trim()) {
        onProgress?.({ done, total, current: "Pasted text" });
        sources.push({ name: "Pasted text", kind: "pasted", status: "ok", emailCount: collect(pastedText) });
        onProgress?.({ done: ++done, total, current: "Pasted text" });
    }

    for (const file of files) {
        onProgress?.({ done, total, current: file.name });
        try {
            const text = await readFileAsText(file);
            sources.push({ name: file.name, kind: "file", status: "ok", emailCount: collect(text) });
        } catch (error) {
            const status = error instanceof FileReadError ? error.reason : "unreadable";
            sources.push({ name: file.name, kind: "file", status, emailCount: 0 });
        }
        onProgress?.({ done: ++done, total, current: file.name });
    }

    const overLimit = emails.length > MAX_EMAILS;
    return { emails: overLimit ? [] : emails, totalFound: emails.length, overLimit, skipped, skippedCount, sources };
}
