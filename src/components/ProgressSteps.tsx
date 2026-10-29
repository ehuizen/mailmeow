// The five-step progress indicator in the header: Add · Find · Clean · Review · Export.
import { Check } from "@untitledui/icons";
import { Fragment } from "react";
import { cx } from "@/utils/cx";

/** The steps shown in the header. Several screens can share a step (Check list and Keep off are both "Clean"). */
export const STEPS = ["Add", "Find", "Clean", "Review", "Export"] as const;
export type StepId = (typeof STEPS)[number];

/**
 * Shows where the user is in the flow.
 *
 * Why an ordered list with `aria-current="step"`: screen readers announce "step 3 of 5, current", which a row of
 * coloured dots alone can't convey. Done steps show a tick and upcoming steps are muted, so state is never colour-only.
 */
export function ProgressSteps({ current }: { current: StepId }) {
    const currentIndex = STEPS.indexOf(current);
    return (
        <nav aria-label="Progress">
            <ol className="flex items-center gap-3">
                {STEPS.map((step, i) => {
                    const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
                    return (
                        <Fragment key={step}>
                            {i > 0 && <li aria-hidden="true" className={cx("h-0.5 w-6 rounded-full lg:w-8", i <= currentIndex ? "bg-brand-solid" : "bg-quaternary")} />}
                            <li className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
                                <span
                                    className={cx(
                                        "flex size-6 items-center justify-center rounded-full",
                                        state === "done" && "bg-brand-solid text-white",
                                        state === "current" && "bg-brand-primary ring-2 ring-brand-solid ring-inset",
                                        state === "upcoming" && "bg-primary ring-1 ring-secondary ring-inset",
                                    )}
                                >
                                    {state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : <span className={cx("size-2 rounded-full", state === "current" ? "bg-brand-solid" : "bg-quaternary")} />}
                                </span>
                                <span className={cx("hidden text-sm font-semibold md:inline", state === "current" ? "text-brand-secondary" : state === "done" ? "text-secondary" : "text-placeholder")}>
                                    {step}
                                    {state === "done" && <span className="sr-only"> (done)</span>}
                                </span>
                            </li>
                        </Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}
