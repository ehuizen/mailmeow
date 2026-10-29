// Screen 6, Keep anyone off: block domains (asking about subdomains with live counts), specific people and role addresses.
import { ArrowRight, Globe02, InfoCircle, Plus, Trash01, UserX01 } from "@untitledui/icons";
import { type FormEvent, useMemo, useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { Toggle } from "@/components/base/toggle/toggle";
import { Callout, Card } from "@/components/Card";
import { PageHeading } from "@/components/PageHeading";
import { ScreenLayout } from "@/components/ScreenLayout";
import { type BlockEntryError, countDomainMatches, parseBlockEntry } from "@/core/block";
import { dedupe } from "@/core/dedupe";
import { isRoleAddress } from "@/core/role-addresses";
import { formatCount, pluralize } from "@/app/format";
import { previousScreen } from "@/app/flow-reducer";
import type { ScreenProps } from "./types";

const ENTRY_ERRORS: Record<BlockEntryError, string> = {
    empty: "Type a domain (like competitor.example) or an email address first.",
    invalid: "That doesn't look like a domain (competitor.example) or an email address.",
    "public-suffix": "That's a public ending like .com or .co.za, so blocking it would remove everyone. Add a specific domain instead.",
};

/**
 * The keep-anyone-off screen.
 *
 * Why counts next to every entry: blocking is irreversible in the export, so people should see the impact first,
 * e.g. "8 emails" and "+14 at subdomains" before ticking "Also remove subdomains" (agreed on the board).
 * Why counts use the deduplicated list: the numbers then match what's actually in the list at this point.
 */
export function KeepOff({ state, dispatch, result }: ScreenProps) {
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const unique = useMemo(() => dedupe(state.extraction?.emails ?? []).unique, [state.extraction]);
    const roleCount = useMemo(() => unique.filter(isRoleAddress).length, [unique]);

    const add = (event: FormEvent) => {
        event.preventDefault();
        const parsed = parseBlockEntry(value);
        if (!parsed.ok) {
            setError(ENTRY_ERRORS[parsed.error]);
            return;
        }
        dispatch({ type: "add-block", entry: parsed.entry });
        setValue("");
        setError(null);
    };

    const removing = (result?.removed.blocked ?? 0) + (result?.removed.role ?? 0);

    return (
        <ScreenLayout
            title="Keep anyone off"
            step="Clean"
            onBack={() => dispatch({ type: "go-to", screen: previousScreen(state) })}
            actions={
                <>
                    <Button color="secondary" onPress={() => dispatch({ type: "skip-keep-off" })}>
                        Skip
                    </Button>
                    <Button iconTrailing={ArrowRight} onPress={() => dispatch({ type: "go-to", screen: "review" })}>
                        {removing > 0 ? `Remove ${formatCount(removing)} & review` : "Continue to review"}
                    </Button>
                </>
            }
        >
            <PageHeading title="Keep anyone off?" subtitle="Block whole domains, like a competitor, or specific people." mood="bouncer" />

            <Card aria-label="Blocked domains and people">
                <form onSubmit={add} className="flex items-end gap-3" noValidate>
                    <Input
                        className="flex-1"
                        label="Add a domain or email"
                        placeholder="competitor.example or name@company.example"
                        icon={Globe02}
                        value={value}
                        onChange={(next) => {
                            setValue(next);
                            setError(null);
                        }}
                        isInvalid={error !== null}
                        hint={error ?? undefined}
                    />
                    <Button type="submit" color="secondary" iconLeading={Plus}>
                        Add
                    </Button>
                </form>

                {state.blocks.length > 0 && (
                    <ul className="flex flex-col gap-3" aria-label="Blocked">
                        {state.blocks.map((entry, index) => {
                            const label = entry.kind === "domain" ? entry.domain : entry.email;
                            const counts = entry.kind === "domain" ? countDomainMatches(unique, entry.domain) : null;
                            const personFound = entry.kind === "email" && unique.includes(entry.email);
                            return (
                                <li key={`${entry.kind}-${label}`} className="flex flex-col gap-3 rounded-lg border border-secondary px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {entry.kind === "domain" ? <Globe02 className="size-5 text-fg-secondary" aria-hidden="true" /> : <UserX01 className="size-5 text-fg-secondary" aria-hidden="true" />}
                                        <span className="flex-1 truncate text-md font-medium text-primary">{label}</span>
                                        <Badge color="gray" size="sm">
                                            {counts ? pluralize(counts.exact, "email") : personFound ? "1 email" : "Not in your list"}
                                        </Badge>
                                        <button
                                            type="button"
                                            aria-label={`Stop blocking ${label}`}
                                            onClick={() => dispatch({ type: "remove-block", index })}
                                            className="rounded-md p-1.5 text-fg-quaternary hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-brand"
                                        >
                                            <Trash01 className="size-5" aria-hidden="true" />
                                        </button>
                                    </div>
                                    {entry.kind === "domain" && counts && counts.subdomains > 0 && (
                                        <div className="pl-8">
                                            <Checkbox
                                                isSelected={entry.includeSubdomains}
                                                onChange={(include) => dispatch({ type: "set-include-subdomains", index, include })}
                                                label="Also remove subdomains"
                                                hint={`+${pluralize(counts.subdomains, "more email")} at addresses like mail.${entry.domain}`}
                                            />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="rounded-lg bg-secondary px-4 py-3">
                    <Toggle
                        isSelected={state.removeRoleAddresses}
                        onChange={(remove) => dispatch({ type: "set-remove-role-addresses", remove })}
                        label={`Remove role addresses (${pluralize(roleCount, "email")})`}
                        hint="info@, noreply@, support@, admin@… usually nobody reads these."
                    />
                </div>

                <p className="flex items-center gap-2 text-sm text-tertiary">
                    <InfoCircle className="size-4 shrink-0" aria-hidden="true" />
                    Public endings like .com or .co.za can&apos;t be blocked, so nobody wipes a whole country by accident.
                </p>
            </Card>

            <div aria-live="polite">
                {removing > 0 && (
                    <Callout tone="info" title={`${pluralize(removing, "email")} will be kept off your list`}>
                        {formatCount(result?.removed.blocked ?? 0)} blocked · {formatCount(result?.removed.role ?? 0)} role addresses
                    </Callout>
                )}
            </div>
        </ScreenLayout>
    );
}
