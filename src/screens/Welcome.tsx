// Screen 1, Welcome: what MailMeow does, the privacy promise, and the two ways in ("Clean a list" or "Just remove duplicates").
import { ArrowRight, Copy01, Download01, Lock01, SearchLg, ShieldTick, UploadCloud02 } from "@untitledui/icons";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Mascot } from "@/components/Mascot";
import { ScreenLayout } from "@/components/ScreenLayout";
import type { ScreenProps } from "./types";

const HOW_IT_WORKS = [
    { icon: UploadCloud02, title: "1. Add", text: "Paste text or drop TXT, CSV, Excel, HTML or JSON files." },
    { icon: SearchLg, title: "2. MailMeow cleans", text: "Finds every address, then removes duplicates, unsubscribes and anyone you block." },
    { icon: Download01, title: "3. Export", text: "Copy the clean list or download it as CSV or Excel." },
];

/**
 * The landing screen.
 * Why two entry points: most visits are either a full clean-up or a quick dedupe. "Just remove duplicates" skips the
 * screens that don't apply (agreed on the planning board).
 */
export function Welcome({ dispatch }: Pick<ScreenProps, "dispatch">) {
    return (
        <ScreenLayout title="Clean an email list" width="xl" centered>
            <div className="flex flex-col items-center gap-6 text-center">
                <Mascot mood="idle" size={168} />
                <BadgeWithIcon type="pill-color" color="brand" size="md" iconLeading={ShieldTick}>
                    Free · No sign-up · Open source
                </BadgeWithIcon>
                <h1 className="text-display-sm font-semibold text-primary md:text-display-md">Paste anything. Get a clean email list.</h1>
                <p className="max-w-160 text-lg text-tertiary">
                    Drop in a CRM export, a spreadsheet or a messy blob of text. MailMeow sniffs out every email address, removes duplicates and anyone who shouldn&apos;t be there.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button size="lg" iconTrailing={ArrowRight} onPress={() => dispatch({ type: "start", mode: "clean" })}>
                        Clean a list
                    </Button>
                    <Button size="lg" color="secondary" iconLeading={Copy01} onPress={() => dispatch({ type: "start", mode: "dedupe-only" })}>
                        Just remove duplicates
                    </Button>
                </div>
            </div>

            <section aria-labelledby="how-it-works">
                <h2 id="how-it-works" className="sr-only">
                    How it works
                </h2>
                <ol className="grid gap-6 md:grid-cols-3">
                    {HOW_IT_WORKS.map(({ icon, title, text }) => (
                        <li key={title} className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                            <FeaturedIcon icon={icon} color="brand" theme="light" size="lg" />
                            <h3 className="text-lg font-semibold text-primary">{title}</h3>
                            <p className="text-md text-tertiary">{text}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <p className="flex items-center justify-center gap-2 text-center text-sm text-tertiary">
                <Lock01 className="size-4 shrink-0 text-fg-success-primary" aria-hidden="true" />
                Your lists never leave your browser. Nothing is uploaded or saved. Close the tab and it&apos;s gone.
            </p>
        </ScreenLayout>
    );
}
