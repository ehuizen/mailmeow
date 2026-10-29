// Screen 4, Found & duplicates: how many addresses were found, what was skipped, and the "Hang on, N duplicates!" decision.
import { ArrowRight, Copy01 } from "@untitledui/icons";
import { useMemo } from "react";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Callout, Card, StatCard } from "@/components/Card";
import { PageHeading } from "@/components/PageHeading";
import { ScreenLayout } from "@/components/ScreenLayout";
import { dedupe } from "@/core/dedupe";
import type { SkipReason } from "@/core/extract-emails";
import { findGmailGroups } from "@/core/gmail";
import { formatCount, pluralize } from "@/app/format";
import { previousScreen } from "@/app/flow-reducer";
import type { ScreenProps } from "./types";

/** Plain-language reasons for skipped look-alikes ("See why"). */
export const SKIP_REASON_TEXT: Record<SkipReason, string> = {
    "missing-name": "nothing before the @",
    "missing-domain": "nothing after the @",
    "too-many-at": "more than one @",
    "invalid-name": "dot in the wrong place before the @",
    "no-dot-in-domain": "no dot in the part after the @",
    "file-name": "looks like a file name, not an email",
    "invalid-domain": "the part after the @ isn't a valid domain",
};

const FAILED_SOURCE_TEXT = { unsupported: "this file type can't be read", "too-big": "too big to read in a browser", unreadable: "the file seems damaged or protected" };

/**
 * The Found screen.
 *
 * Why duplicates are a decision, not automatic: some people keep duplicates on purpose (e.g. counting sign-ups),
 * so the screen explains and offers "Remove duplicates" as the primary action, with "Keep duplicates" next to it.
 * Why Gmail look-alikes are opt-in: see `core/gmail.ts`, as they're probably, not certainly, the same person.
 */
export function Found({ state, dispatch }: Pick<ScreenProps, "state" | "dispatch">) {
    const extraction = state.extraction;
    const { duplicateCount, repeated, unique } = useMemo(() => dedupe(extraction?.emails ?? []), [extraction]);
    const gmailGroups = useMemo(() => findGmailGroups(unique), [unique]);
    if (!extraction) return null;

    const found = extraction.emails.length;
    const dedupeOnly = state.mode === "dedupe-only";
    const failed = extraction.sources.filter((s) => s.status !== "ok");
    const gmailExtra = gmailGroups.reduce((sum, g) => sum + g.addresses.length - 1, 0);
    const sourceCount = extraction.sources.filter((s) => s.status === "ok").length;

    const primaryLabel = duplicateCount > 0 ? (dedupeOnly ? "Remove duplicates & export" : "Remove duplicates") : dedupeOnly ? "Continue to export" : "Continue";

    return (
        <ScreenLayout
            title="Emails found"
            step="Find"
            onBack={() => dispatch({ type: "go-to", screen: previousScreen(state) })}
            actions={
                <>
                    {duplicateCount > 0 && !dedupeOnly && (
                        <Button color="secondary" onPress={() => dispatch({ type: "choose-duplicates", remove: false })}>
                            Keep duplicates
                        </Button>
                    )}
                    <Button iconTrailing={ArrowRight} onPress={() => dispatch({ type: "choose-duplicates", remove: true })}>
                        {primaryLabel}
                    </Button>
                </>
            }
        >
            <PageHeading
                title={`We found ${pluralize(found, "email")}`}
                subtitle={duplicateCount > 0 ? `And ${formatCount(duplicateCount)} of them are duplicates. Want MailMeow to tidy those up?` : "No duplicates. Nice and tidy."}
                mood="detective"
                badge={dedupeOnly ? <Badge color="brand" size="sm">Just removing duplicates</Badge> : undefined}
            />

            <div className="flex flex-col gap-4 md:flex-row">
                <StatCard label="Emails found" value={formatCount(found)} hint={`From ${pluralize(sourceCount, "source")}`} />
                <StatCard label="Duplicates" value={formatCount(duplicateCount)} hint="Same address, any capitalisation" tone="brand" />
                <StatCard label="Skipped" value={formatCount(extraction.skippedCount)} hint="Looked like emails but aren't" tone={extraction.skippedCount ? "warning" : "default"} />
            </div>

            {failed.length > 0 && (
                <Callout tone="error" title={`${pluralize(failed.length, "file")} couldn't be read`}>
                    <ul className="list-disc pl-5">
                        {failed.map((s) => (
                            <li key={s.name}>
                                {s.name}: {FAILED_SOURCE_TEXT[s.status as keyof typeof FAILED_SOURCE_TEXT]}
                            </li>
                        ))}
                    </ul>
                    Everything else was read fine.
                </Callout>
            )}

            {duplicateCount > 0 && (
                <Card aria-label="Duplicates">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-primary">Hang on, {pluralize(duplicateCount, "duplicate")}!</h2>
                        <Badge color="gray" size="sm">
                            Removed by default
                        </Badge>
                    </div>
                    <ul className="flex flex-col gap-2">
                        {repeated.slice(0, 3).map(({ email, copies }) => (
                            <li key={email} className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-2">
                                <Copy01 className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                                <span className="truncate text-sm font-medium text-secondary">{email}</span>
                                <Badge color="brand" size="sm">
                                    × {copies}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                    {repeated.length > 3 && <p className="text-sm font-semibold text-brand-secondary">+ {pluralize(repeated.length - 3, "more address", "more addresses")} with copies</p>}
                </Card>
            )}

            {gmailGroups.length > 0 && (
                <Callout tone="warning" title={`${pluralize(gmailExtra, "more address", "more addresses")} look like the same Gmail inbox`}>
                    <p>
                        Gmail ignores dots and anything after +, so <strong>{gmailGroups[0].addresses.join(" and ")}</strong> reach one person.
                    </p>
                    <div className="mt-3">
                        <Checkbox
                            isSelected={state.mergeGmail}
                            onChange={(merge) => dispatch({ type: "set-merge-gmail", merge })}
                            label={`Also merge these ${formatCount(gmailExtra)} (keeps the first spelling of each)`}
                        />
                    </div>
                </Callout>
            )}

            {extraction.skippedCount > 0 && (
                <details className="rounded-xl border border-secondary bg-primary p-5 text-sm text-secondary">
                    <summary className="cursor-pointer font-semibold text-brand-secondary">See why {pluralize(extraction.skippedCount, "item was", "items were")} skipped</summary>
                    <ul className="mt-3 flex flex-col gap-1">
                        {extraction.skipped.slice(0, 20).map((item, i) => (
                            <li key={`${item.text}-${i}`}>
                                <code className="font-mono text-primary">{item.text}</code>: {SKIP_REASON_TEXT[item.reason]}
                            </li>
                        ))}
                    </ul>
                    {extraction.skippedCount > 20 && <p className="mt-2 text-tertiary">Showing the first 20.</p>}
                </details>
            )}
        </ScreenLayout>
    );
}
