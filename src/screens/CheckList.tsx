// Screen 5, Check against a list: upload or paste unsubscribes/bounces/contacts and see how many of your emails they remove.
import { ArrowRight, RefreshCw01, Type01 } from "@untitledui/icons";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { Callout, Card } from "@/components/Card";
import { Dropzone } from "@/components/Dropzone";
import { FileChip } from "@/components/FileChip";
import { PageHeading } from "@/components/PageHeading";
import { ScreenLayout } from "@/components/ScreenLayout";
import { formatCount, pluralize } from "@/app/format";
import { type ListType, previousScreen } from "@/app/flow-reducer";
import { ExtractionCancelledError, runExtraction } from "@/files/run-extraction";
import { cx } from "@/utils/cx";
import type { ScreenProps } from "./types";

const LIST_TYPES: { id: ListType; label: string }[] = [
    { id: "unsubscribes", label: "Unsubscribes" },
    { id: "bounces", label: "Bounces" },
    { id: "contacts", label: "Existing contacts" },
    { id: "other", label: "Other" },
];

/**
 * The check-against-list screen.
 *
 * Why the list is read with the same worker as the main emails: a 15,000-row unsubscribe export in Excel deserves
 * the same non-blocking treatment, and the same extraction rules mean "in your list" uses the same idea of an address.
 * Why "Skip to export": people who only wanted dedupe + an unsubscribe check shouldn't have to click through more screens.
 */
export function CheckList({ state, dispatch, result }: ScreenProps) {
    const [reading, setReading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPaste, setShowPaste] = useState(false);
    const [pasted, setPasted] = useState("");
    const controllerRef = useRef<AbortController | null>(null);

    // Stop reading if the user leaves the screen mid-way.
    useEffect(() => () => controllerRef.current?.abort(), []);

    const readList = async (files: File[], text: string) => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setReading(true);
        setError(null);
        try {
            const summary = await runExtraction(files, text, { signal: controller.signal });
            if (summary.overLimit) setError(`That list has about ${formatCount(summary.totalFound)} addresses, more than the 50,000 limit. Split it and try again.`);
            else if (summary.emails.length === 0) setError("No email addresses were found in that list.");
            else {
                dispatch({ type: "set-check-list", checkList: { emails: summary.emails, sources: summary.sources } });
                setShowPaste(false);
                setPasted("");
            }
        } catch (e) {
            if (!(e instanceof ExtractionCancelledError)) setError("That list couldn't be read. Try saving it as CSV, or paste the emails instead.");
        } finally {
            if (!controller.signal.aborted) setReading(false);
        }
    };

    const listed = result?.removed.listed ?? 0;
    const list = state.checkList;

    return (
        <ScreenLayout
            title="Check against a list"
            step="Clean"
            onBack={() => dispatch({ type: "go-to", screen: previousScreen(state) })}
            actions={
                <>
                    <Button color="tertiary" onPress={() => dispatch({ type: "skip-check-list", toExport: true })}>
                        Skip to export
                    </Button>
                    <Button color="secondary" onPress={() => dispatch({ type: "skip-check-list", toExport: false })}>
                        Skip
                    </Button>
                    <Button iconTrailing={ArrowRight} isDisabled={!list} onPress={() => dispatch({ type: "go-to", screen: "keep-off" })}>
                        {list && listed > 0 ? `Remove ${formatCount(listed)} & continue` : "Continue"}
                    </Button>
                </>
            }
        >
            <PageHeading title="Check against a list?" subtitle="Remove people who unsubscribed, bounced or are already contacts. Upload the list or paste it in." mood="clipboard" />

            <Card aria-label="Your list">
                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-3 text-sm font-medium text-secondary">What kind of list is it?</legend>
                    <div className="flex flex-wrap gap-2">
                        {LIST_TYPES.map(({ id, label }) => {
                            const selected = state.listTypes.includes(id);
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => dispatch({ type: "toggle-list-type", listType: id })}
                                    className={cx(
                                        "rounded-md border px-3 py-1 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-brand",
                                        selected ? "border-brand bg-brand-primary text-brand-secondary" : "border-primary bg-primary text-secondary hover:bg-primary_hover",
                                    )}
                                >
                                    {selected && <span aria-hidden="true">✓ </span>}
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>

                {list ? (
                    <>
                        <ul className="flex flex-col gap-3" aria-label="Your list">
                            {list.sources.map((source) => (
                                <FileChip
                                    key={source.name}
                                    name={source.name}
                                    meta={source.status === "ok" ? `${pluralize(source.emailCount, "email")} in your list` : "Couldn't be read"}
                                    tone={source.status === "ok" ? "default" : "error"}
                                />
                            ))}
                        </ul>
                        <div>
                            <Button color="secondary" iconLeading={RefreshCw01} onPress={() => dispatch({ type: "set-check-list", checkList: null })}>
                                Use a different list
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <Dropzone onFiles={(files) => readList(files, "")} label="Upload your list (Excel, CSV or TXT)" hint="Any column, every sheet · emails are matched ignoring capitals and Gmail dots" />
                        {showPaste ? (
                            <div className="flex flex-col gap-3">
                                <TextArea label="Paste the emails to remove" rows={5} value={pasted} onChange={setPasted} placeholder="One per line, or any text that contains them" />
                                <div>
                                    <Button color="secondary" isDisabled={!pasted.trim() || reading} onPress={() => readList([], pasted)}>
                                        Use these emails
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <Button color="tertiary" iconLeading={Type01} onPress={() => setShowPaste(true)}>
                                    Paste emails instead
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {reading && (
                    <p role="status" className="text-sm font-medium text-brand-secondary">
                        Reading your list…
                    </p>
                )}
                {error && (
                    <Callout tone="error" title="Couldn't use that list" role="alert">
                        {error}
                    </Callout>
                )}
            </Card>

            {list && (
                <div aria-live="polite">
                    {listed > 0 ? (
                        <Callout tone="success" title={`${pluralize(listed, "of your emails is", "of your emails are")} on this list and will be removed`}>
                            Matched ignoring capitals and Gmail dots/+tags, so nobody who unsubscribed slips through.
                        </Callout>
                    ) : (
                        <Callout tone="info" title="None of your emails are on this list">
                            Nothing will be removed by this step.
                        </Callout>
                    )}
                </div>
            )}
        </ScreenLayout>
    );
}
