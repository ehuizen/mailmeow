// Top bar on every screen: the MailMeow logo, progress steps (once the flow has started) and the privacy promise.
import { Lock01 } from "@untitledui/icons";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { Mascot } from "./Mascot";
import { ProgressSteps, type StepId } from "./ProgressSteps";

/**
 * The header.
 *
 * Why the privacy badge is on every screen: "Nothing leaves your browser" is the main reason to trust a tool you
 * paste customer data into, so it stays visible rather than living in a footer.
 */
export function AppHeader({ step }: { step?: StepId }) {
    return (
        <header className="flex h-18 shrink-0 items-center justify-between gap-4 border-b border-secondary bg-primary px-4 md:px-8">
            <div className="flex items-center gap-2">
                <Mascot size={32} className="animate-none" />
                <span className="text-lg font-semibold text-primary">MailMeow</span>
            </div>
            {step && <ProgressSteps current={step} />}
            <BadgeWithIcon type="pill-color" color="success" size="md" iconLeading={Lock01}>
                <span className="hidden sm:inline">Nothing leaves your browser</span>
                <span className="sm:hidden">Private</span>
            </BadgeWithIcon>
        </header>
    );
}
