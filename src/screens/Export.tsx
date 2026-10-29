// Screen 8, Export: celebrate, then copy the clean list or download it as CSV or Excel. "Start over" clears everything.
import { Copy01, Download01, File06, FileCheck02, RefreshCw01 } from "@untitledui/icons";
import { type FC, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Callout } from "@/components/Card";
import { Mascot } from "@/components/Mascot";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useAnnounce } from "@/components/Announcer";
import { formatCount, pluralize } from "@/app/format";
import { previousScreen } from "@/app/flow-reducer";
import { copyList, downloadCsv, downloadXlsx } from "@/files/export-list";
import type { ScreenProps } from "./types";

type IconType = FC<{ className?: string }>;

/**
 * The Export screen.
 *
 * Why three equal options: people paste into a mail tool (copy) or import into a CRM (CSV/Excel), and neither is
 * "the" right answer. Copy is primary because it's the fastest path.
 * Why the copy confirmation is also announced: the success callout is visual, and `useAnnounce` tells screen readers.
 */
export function Export({ state, dispatch, result }: ScreenProps) {
    const [copied, setCopied] = useState<boolean | null>(null);
    const [savingExcel, setSavingExcel] = useState(false);
    const announce = useAnnounce();
    if (!result) return null;

    const emails = result.kept;
    const r = result.removed;
    const parts = [
        r.duplicates && `${formatCount(r.duplicates)} duplicates`,
        r.gmailMerged && `${formatCount(r.gmailMerged)} Gmail look-alikes`,
        r.listed && `${formatCount(r.listed)} from your list`,
        r.blocked + r.role && `${formatCount(r.blocked + r.role)} kept off`,
        r.manual && `${formatCount(r.manual)} removed by you`,
    ].filter(Boolean);

    const copy = async () => {
        const ok = await copyList(emails);
        setCopied(ok);
        announce(ok ? `Copied ${pluralize(emails.length, "email")} to your clipboard` : "Copying failed. Try downloading instead.");
    };
    const saveExcel = async () => {
        setSavingExcel(true);
        try {
            await downloadXlsx(emails);
        } finally {
            setSavingExcel(false);
        }
    };

    const options: { icon: IconType; title: string; text: string; button: string; buttonIcon: IconType; primary?: boolean; onPress: () => void; loading?: boolean }[] = [
        { icon: Copy01, title: "Copy to clipboard", text: "One email per line, ready to paste into your mail tool.", button: `Copy ${formatCount(emails.length)} emails`, buttonIcon: Copy01, primary: true, onPress: copy },
        { icon: File06, title: "Download CSV", text: "Works with Mailchimp, HubSpot and most CRMs.", button: "Download .csv", buttonIcon: Download01, onPress: () => downloadCsv(emails) },
        { icon: FileCheck02, title: "Download Excel", text: "A single sheet with an Email column.", button: "Download .xlsx", buttonIcon: Download01, onPress: saveExcel, loading: savingExcel },
    ];

    return (
        <ScreenLayout title="Export your list" step="Export" width="xl" centered onBack={() => dispatch({ type: "go-to", screen: previousScreen(state) })}>
            <div className="flex flex-col items-center gap-4 text-center">
                <Mascot mood="celebrate" size={168} />
                <h1 className="text-display-sm font-semibold text-primary md:text-display-md">All clean! {pluralize(emails.length, "email")} ready.</h1>
                <p className="text-lg text-tertiary">{parts.length ? `${formatCount(result.removedTotal)} removed: ${parts.join(", ")}.` : "Nothing needed removing."}</p>
            </div>

            <ul className="grid gap-6 md:grid-cols-3">
                {options.map((option) => (
                    <li key={option.title} className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                        <FeaturedIcon icon={option.icon} color="brand" theme="light" size="lg" />
                        <h2 className="text-lg font-semibold text-primary">{option.title}</h2>
                        <p className="flex-1 text-sm text-tertiary">{option.text}</p>
                        <Button color={option.primary ? "primary" : "secondary"} iconLeading={option.buttonIcon} onPress={option.onPress} isLoading={option.loading} isDisabled={emails.length === 0}>
                            {option.button}
                        </Button>
                    </li>
                ))}
            </ul>

            {copied !== null &&
                (copied ? (
                    <Callout tone="success" title={`Copied ${pluralize(emails.length, "email")} to your clipboard`}>
                        Paste them into the To or BCC field of your mail tool.
                    </Callout>
                ) : (
                    <Callout tone="error" title="Your browser blocked copying">
                        Download the CSV instead, or allow clipboard access for this page.
                    </Callout>
                ))}

            <div className="flex flex-wrap items-center justify-center gap-3">
                <Button color="tertiary" iconLeading={RefreshCw01} onPress={() => dispatch({ type: "start-over" })}>
                    Start over
                </Button>
                <span className="text-sm text-tertiary">Clears everything from memory</span>
            </div>
        </ScreenLayout>
    );
}
