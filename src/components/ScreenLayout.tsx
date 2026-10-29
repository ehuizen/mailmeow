// The frame every screen shares: header, a centred content column, and a bottom action bar with Back + the screen's actions.
import { ArrowLeft } from "@untitledui/icons";
import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { AppHeader } from "./AppHeader";
import type { StepId } from "./ProgressSteps";

export interface ScreenLayoutProps {
    /** Used for the browser tab title ("Check against a list · MailMeow"). */
    title: string;
    /** Which progress step to highlight; omit on Welcome. */
    step?: StepId;
    /** Shows a Back button in the action bar. */
    onBack?: () => void;
    /** Buttons on the right of the action bar (Skip, Continue…). */
    actions?: ReactNode;
    /** Content column width. */
    width?: "md" | "lg" | "xl";
    /** Vertically centre the content (Welcome, Processing, Export). */
    centered?: boolean;
    children: ReactNode;
}

const WIDTHS = { md: "max-w-140", lg: "max-w-220", xl: "max-w-240" };

/**
 * Shared screen frame.
 *
 * Why move focus to the heading on every screen change: a single-page app doesn't trigger a page load, so a
 * screen reader user wouldn't know the screen changed. Focusing the `<h1>` (made focusable with tabIndex -1)
 * announces the new screen and puts keyboard users at the top of it. The tab title is updated for the same reason.
 */
export function ScreenLayout({ title, step, onBack, actions, width = "lg", centered = false, children }: ScreenLayoutProps) {
    const mainRef = useRef<HTMLElement>(null);

    useEffect(() => {
        document.title = `${title} · MailMeow`;
        const heading = mainRef.current?.querySelector("h1");
        if (heading) {
            heading.setAttribute("tabindex", "-1");
            heading.focus({ preventScroll: true });
        }
    }, [title]);

    return (
        <div className="flex min-h-dvh flex-col bg-secondary">
            <AppHeader step={step} />
            <main ref={mainRef} className={cx("flex flex-1 flex-col items-center px-4 py-10 md:px-8 md:py-12", centered && "justify-center")}>
                <div className={cx("flex w-full flex-col gap-8 [&_h1]:outline-hidden", WIDTHS[width])}>{children}</div>
            </main>
            {(onBack || actions) && (
                <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-secondary bg-primary px-4 py-4 md:px-8">
                    <div>
                        {onBack && (
                            <Button color="tertiary" size="md" iconLeading={ArrowLeft} onPress={onBack}>
                                Back
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">{actions}</div>
                </footer>
            )}
        </div>
    );
}
