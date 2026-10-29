// The message contract between the UI and the extraction worker, shared so both sides agree at compile time.
import type { ExtractionSummary } from "./extract-sources";

/**
 * UI → worker. `File` objects are posted directly: the browser shares the underlying data, so nothing is read
 * on the UI thread first.
 */
export interface WorkerRequest {
    files: File[];
    pastedText: string;
}

/** Worker → UI. */
export type WorkerResponse =
    | { type: "progress"; done: number; total: number; current: string }
    | { type: "result"; summary: ExtractionSummary }
    | { type: "error"; message: string };
