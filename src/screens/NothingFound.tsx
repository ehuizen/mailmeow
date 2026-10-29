// Error screen: extraction finished but found no addresses. Explains likely causes and leads back to Add.
import { ArrowLeft, InfoCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Mascot } from "@/components/Mascot";
import { ScreenLayout } from "@/components/ScreenLayout";
import type { ScreenProps } from "./types";

const TIPS = [
    "Check the file actually has an email column, or addresses somewhere in the text.",
    "Excel: make sure the workbook isn't password-protected.",
    "Scanned PDFs and images can't be read. Copy the text out and paste it instead.",
    "Try pasting the text straight into the box.",
];

/**
 * "Nothing found".
 * Why a dedicated screen instead of an empty Found screen: zero results usually means the wrong file or an unreadable
 * one, so the useful thing to show is what to try next, plus which files failed.
 */
export function NothingFound({ state, dispatch }: Pick<ScreenProps, "state" | "dispatch">) {
    const failed = state.extraction?.sources.filter((s) => s.status !== "ok") ?? [];
    return (
        <ScreenLayout title="No emails found" step="Find" width="md" centered>
            <div className="flex flex-col items-center gap-6 text-center">
                <Mascot mood="confused" size={160} />
                <h1 className="text-display-sm font-semibold text-primary">Hmm, no emails in there</h1>
                <p className="text-lg text-tertiary">MailMeow sniffed everything you added but couldn&apos;t spot a single address. A few things to try:</p>
            </div>
            <ul className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                {failed.map((s) => (
                    <li key={s.name} className="flex gap-3 text-md font-medium text-error-primary">
                        <InfoCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                        {s.name} couldn&apos;t be read.
                    </li>
                ))}
                {TIPS.map((tip) => (
                    <li key={tip} className="flex gap-3 text-md text-secondary">
                        <InfoCircle className="mt-0.5 size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
                        {tip}
                    </li>
                ))}
            </ul>
            <div className="flex justify-center">
                <Button iconLeading={ArrowLeft} onPress={() => dispatch({ type: "go-to", screen: "add" })}>
                    Back to add emails
                </Button>
            </div>
        </ScreenLayout>
    );
}
