// Screen 7, Review: the funnel of what was removed and why, plus a searchable list where single emails can be removed.
import { ArrowRight, SearchLg, Trash01 } from "@untitledui/icons";
import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Callout, Card } from "@/components/Card";
import { PageHeading } from "@/components/PageHeading";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useAnnounce } from "@/components/Announcer";
import { domainOf } from "@/core/block";
import { formatCount, pluralize } from "@/app/format";
import { previousScreen } from "@/app/flow-reducer";
import type { ScreenProps } from "./types";

/** Rows rendered at a time. Why paging instead of a virtualisation library: no extra dependency, and 100 rows render instantly. */
const PAGE_SIZE = 100;

/**
 * The Review screen.
 *
 * Why search the in-memory array (not the rendered rows): it finds matches anywhere in a 50,000-address list,
 * and `useDeferredValue` keeps typing smooth while filtering.
 * Why removals here can be undone: they're stored as a set of addresses that `cleanList` skips, not deleted.
 */
export function Review({ state, dispatch, result }: ScreenProps) {
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(PAGE_SIZE);
    const announce = useAnnounce();
    const deferredQuery = useDeferredValue(query.trim().toLowerCase());
    const kept = useMemo(() => result?.kept ?? [], [result]);
    const filtered = useMemo(() => (deferredQuery ? kept.filter((e) => e.includes(deferredQuery)) : kept), [kept, deferredQuery]);
    if (!result || !state.extraction) return null;

    const r = result.removed;
    const funnel: { label: string; color: "gray" | "brand" | "success" }[] = [
        { label: `${formatCount(state.extraction.emails.length)} found`, color: "gray" },
        ...(r.duplicates ? [{ label: `− ${formatCount(r.duplicates)} duplicates`, color: "brand" as const }] : []),
        ...(r.gmailMerged ? [{ label: `− ${formatCount(r.gmailMerged)} Gmail look-alikes`, color: "brand" as const }] : []),
        ...(r.listed ? [{ label: `− ${formatCount(r.listed)} on your list`, color: "brand" as const }] : []),
        ...(r.blocked + r.role ? [{ label: `− ${formatCount(r.blocked + r.role)} kept off`, color: "brand" as const }] : []),
        ...(r.manual ? [{ label: `− ${formatCount(r.manual)} removed by you`, color: "brand" as const }] : []),
        { label: `= ${formatCount(kept.length)} clean`, color: "success" },
    ];

    const remove = (email: string) => {
        dispatch({ type: "remove-email", email });
        announce(`Removed ${email}`);
    };
    const restore = (email: string) => {
        dispatch({ type: "restore-email", email });
        announce(`Put back ${email}`);
    };

    return (
        <ScreenLayout
            title="Review your list"
            step="Review"
            width="xl"
            onBack={() => dispatch({ type: "go-to", screen: previousScreen(state) })}
            actions={
                <Button iconTrailing={ArrowRight} isDisabled={kept.length === 0} onPress={() => dispatch({ type: "go-to", screen: "export" })}>
                    Looks good, export
                </Button>
            }
        >
            <PageHeading title={`Your clean list: ${pluralize(kept.length, "email")}`} subtitle="Here's what MailMeow did. Search, spot-check, or remove anyone before you export." mood="approving" />

            <ol className="flex flex-wrap items-center gap-2" aria-label="What was removed">
                {funnel.map((step, i) => (
                    <Fragment key={step.label}>
                        {i > 0 && (
                            <li aria-hidden="true" className="text-fg-quaternary">
                                →
                            </li>
                        )}
                        <li>
                            <Badge color={step.color} size="md">
                                {step.label}
                            </Badge>
                        </li>
                    </Fragment>
                ))}
            </ol>

            {kept.length === 0 ? (
                <Callout tone="warning" title="Everything was removed">
                    Go back and loosen a step (for example, turn off role addresses or remove a blocked domain).
                </Callout>
            ) : (
                <Card aria-label="Clean list">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <Input
                            className="w-full max-w-90"
                            label="Search"
                            placeholder={`Search ${formatCount(kept.length)} emails`}
                            icon={SearchLg}
                            value={query}
                            onChange={(next) => {
                                setQuery(next);
                                setLimit(PAGE_SIZE);
                            }}
                        />
                        <p className="text-sm text-tertiary" aria-live="polite">
                            {deferredQuery ? `${pluralize(filtered.length, "match", "matches")}` : `${pluralize(kept.length, "email")}`}
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-secondary">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-secondary text-xs font-medium text-tertiary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">
                                        Email
                                    </th>
                                    <th scope="col" className="hidden px-6 py-3 md:table-cell">
                                        Domain
                                    </th>
                                    <th scope="col" className="w-16 px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.slice(0, limit).map((email) => (
                                    <tr key={email} className="border-t border-secondary">
                                        <td className="px-6 py-3 font-medium break-all text-primary">{email}</td>
                                        <td className="hidden px-6 py-3 text-tertiary md:table-cell">{domainOf(email)}</td>
                                        <td className="px-6 py-2">
                                            <button
                                                type="button"
                                                aria-label={`Remove ${email}`}
                                                onClick={() => remove(email)}
                                                className="rounded-md p-1.5 text-fg-quaternary hover:bg-primary_hover hover:text-fg-error-primary focus-visible:outline-2 focus-visible:outline-brand"
                                            >
                                                <Trash01 className="size-4" aria-hidden="true" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-tertiary">
                            Showing {formatCount(Math.min(limit, filtered.length))} of {formatCount(filtered.length)}
                        </p>
                        {filtered.length > limit && (
                            <Button color="secondary" size="sm" onPress={() => setLimit((l) => l + PAGE_SIZE)}>
                                Show {formatCount(Math.min(PAGE_SIZE, filtered.length - limit))} more
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {state.manuallyRemoved.size > 0 && (
                <Card aria-label="Removed by you">
                    <h2 className="text-md font-semibold text-primary">Removed by you ({formatCount(state.manuallyRemoved.size)})</h2>
                    <ul className="flex flex-wrap gap-2">
                        {[...state.manuallyRemoved].map((email) => (
                            <li key={email}>
                                <button
                                    type="button"
                                    onClick={() => restore(email)}
                                    className="rounded-md border border-primary px-3 py-1 text-sm text-secondary hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-brand"
                                >
                                    {email} · <span className="font-semibold text-brand-secondary">Undo</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </ScreenLayout>
    );
}
