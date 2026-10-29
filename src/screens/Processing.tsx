// Screen 3, Processing: runs extraction in the worker, shows progress and the searching cat, and lets the user cancel.
import { XClose } from "@untitledui/icons";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { Mascot } from "@/components/Mascot";
import { ScreenLayout } from "@/components/ScreenLayout";
import { ExtractionCancelledError, runExtraction, withMinimumDuration } from "@/files/run-extraction";
import type { ScreenProps } from "./types";

/**
 * The Processing screen. It starts extraction when it mounts and reports the result to the flow.
 *
 * Why the work starts here (in an effect) rather than in the reducer: reducers must be pure. Starting async work
 * is a side effect, and tying it to this screen means leaving the screen (Cancel) always stops the work too.
 * Why the minimum duration: agreed on the board, the cat gets at least 3 s on screen, so fast results don't flash.
 * In React's StrictMode (dev only) the effect runs twice; the first run is aborted, so only one result arrives.
 */
export function Processing({ state, dispatch, minimumMs }: Pick<ScreenProps, "state" | "dispatch"> & { minimumMs: number }) {
    const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
    const controllerRef = useRef<AbortController | null>(null);
    const { files, pastedText } = state;

    useEffect(() => {
        const controller = new AbortController();
        controllerRef.current = controller;
        withMinimumDuration(runExtraction(files, pastedText, { onProgress: setProgress, signal: controller.signal }), minimumMs)
            .then((summary) => {
                if (!controller.signal.aborted) dispatch({ type: "extraction-finished", summary });
            })
            .catch((error: unknown) => {
                if (error instanceof ExtractionCancelledError || controller.signal.aborted) return;
                dispatch({ type: "extraction-failed", message: error instanceof Error ? error.message : String(error) });
            });
        return () => controller.abort();
    }, [files, pastedText, minimumMs, dispatch]);

    const cancel = () => {
        controllerRef.current?.abort();
        dispatch({ type: "extraction-stopped" });
    };

    const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    const sourceCount = files.length + (pastedText.trim() ? 1 : 0);

    return (
        <ScreenLayout title="Finding emails" step="Find" width="md" centered>
            <div className="flex flex-col items-center gap-6 text-center">
                <Mascot mood="searching" size={176} />
                <h1 className="text-display-sm font-semibold text-primary">Sniffing out emails…</h1>
                <p className="text-lg text-tertiary">
                    Checking {sourceCount === 1 ? "your text" : `${sourceCount} sources`}. This all happens on your computer.
                </p>
                <div className="w-full" role="group" aria-label="Progress">
                    <ProgressBar value={percent} labelPosition="bottom" valueFormatter={(_, p) => `${p}%`} />
                    <p className="mt-2 truncate text-left text-sm text-tertiary">{progress.current ? `Reading ${progress.current}` : "Starting…"}</p>
                </div>
                <Button color="tertiary" iconLeading={XClose} onPress={cancel}>
                    Cancel
                </Button>
            </div>
        </ScreenLayout>
    );
}
