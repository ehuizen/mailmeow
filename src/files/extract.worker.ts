// Web Worker entry: runs extraction off the UI thread and reports progress, so big files never freeze the page or the mascot.
import { extractFromSources } from "./extract-sources";
import type { WorkerRequest, WorkerResponse } from "./worker-messages";

const post = (message: WorkerResponse) => self.postMessage(message);

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const { files, pastedText } = event.data;
    try {
        const summary = await extractFromSources(files, pastedText, (progress) => post({ type: "progress", ...progress }));
        post({ type: "result", summary });
    } catch (error) {
        post({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
};
